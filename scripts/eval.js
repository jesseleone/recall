// Retrieval evaluation: seeds a fixed set of labeled notes, runs each
// eval question through the real embedding + vector search path, and
// reports recall@k and mean reciprocal rank. Deliberately does not touch
// generation quality — you can't fix answer quality on top of broken
// retrieval, so this is measured on its own before the LLM is involved
// at all.
//
// Requires VOYAGE_API_KEY and a reachable MONGODB_URI. Run with:
//   npm run eval

import "dotenv/config";
import { connectDB, disconnectDB } from "../src/config/db.js";
import { User } from "../src/models/User.js";
import { Note } from "../src/models/Note.js";
import { ingestNote, deleteNoteChunks } from "../src/services/ingest.js";
import { embedQuery } from "../src/services/embeddings.js";
import { vectorSearch } from "../src/services/vectorSearch.js";
import { testNotes, testQuestions } from "../eval/dataset.js";

const EVAL_USER_EMAIL = "eval@recall.local";
const TOP_K = 3;

async function seed() {
  let user = await User.findOne({ email: EVAL_USER_EMAIL });
  if (!user) {
    user = await User.create({
      email: EVAL_USER_EMAIL,
      passwordHash: await User.hashPassword("eval-user-not-a-real-login"),
    });
  }

  const existingNotes = await Note.find({ userId: user._id });
  for (const note of existingNotes) await deleteNoteChunks(note._id);
  await Note.deleteMany({ userId: user._id });

  const keyToNoteId = {};
  for (const { key, title, body } of testNotes) {
    const note = await Note.create({ userId: user._id, title, body });
    await ingestNote(note);
    keyToNoteId[key] = note._id.toString();
  }

  return { userId: user._id, keyToNoteId };
}

async function run() {
  await connectDB(process.env.MONGODB_URI);
  const { userId, keyToNoteId } = await seed();

  let hits = 0;
  let reciprocalRankSum = 0;
  const rows = [];

  for (const { question, expectedNoteKeys } of testQuestions) {
    const expectedIds = new Set(expectedNoteKeys.map((k) => keyToNoteId[k]));
    const queryEmbedding = await embedQuery(question);
    const results = await vectorSearch({ userId, queryEmbedding, topK: TOP_K });
    const retrievedIds = results.map((r) => r.chunk.noteId.toString());

    const rank = retrievedIds.findIndex((id) => expectedIds.has(id)) + 1; // 0 if not found
    const hit = rank > 0;
    if (hit) {
      hits += 1;
      reciprocalRankSum += 1 / rank;
    }

    rows.push({ question, hit, rank: hit ? rank : null });
  }

  const recallAtK = hits / testQuestions.length;
  const mrr = reciprocalRankSum / testQuestions.length;

  console.log(`\nRetrieval eval (top-${TOP_K}, ${testQuestions.length} questions)\n`);
  for (const row of rows) {
    const status = row.hit ? `hit (rank ${row.rank})` : "miss";
    console.log(`  [${status.padEnd(14)}] ${row.question}`);
  }
  console.log(`\nRecall@${TOP_K}: ${(recallAtK * 100).toFixed(1)}%`);
  console.log(`MRR:       ${mrr.toFixed(3)}\n`);

  await disconnectDB();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

import { NoteChunk } from "../models/NoteChunk.js";
import { chunkNote } from "./chunking.js";
import { embedDocuments } from "./embeddings.js";

// Re-embeds a note from scratch on every save. Notes are small and edits
// are infrequent relative to reads, so incremental re-chunking isn't
// worth the complexity it would add — see README "What I'd change at
// scale" for where that stops being true.
export async function ingestNote(note) {
  await NoteChunk.deleteMany({ noteId: note._id });

  const chunks = chunkNote({ title: note.title, body: note.body });
  const embeddings = await embedDocuments(chunks.map((c) => c.text));

  await NoteChunk.insertMany(
    chunks.map((chunk, i) => ({
      noteId: note._id,
      userId: note.userId,
      position: chunk.position,
      text: chunk.text,
      embedding: embeddings[i],
      embeddingModel: process.env.VOYAGE_MODEL || "voyage-3",
    }))
  );
}

export async function deleteNoteChunks(noteId) {
  await NoteChunk.deleteMany({ noteId });
}

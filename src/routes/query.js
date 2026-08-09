import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { embedQuery } from "../services/embeddings.js";
import { vectorSearch } from "../services/vectorSearch.js";
import { generateAnswer } from "../services/llm.js";

export const queryRouter = Router();
queryRouter.use(requireAuth);

queryRouter.post("/", async (req, res) => {
  const { question, topK } = req.body;
  if (!question) {
    return res.status(400).json({ error: "question is required" });
  }

  const queryEmbedding = await embedQuery(question);
  const results = await vectorSearch({ userId: req.userId, queryEmbedding, topK: topK || 5 });
  const retrievedChunks = results.map((r) => r.chunk);

  const { answer, citations } = await generateAnswer({ question, retrievedChunks });

  res.json({
    answer,
    citations,
    retrieved: results.map((r) => ({ noteId: r.chunk.noteId, text: r.chunk.text, score: r.score })),
  });
});

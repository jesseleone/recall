import { NoteChunk } from "../models/NoteChunk.js";

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Two backends, same interface. "local" does a brute-force scan and
// ranks in JS — it doesn't scale, but it needs zero external setup and
// is exact (no ANN approximation error), which makes it the right choice
// for development and for the retrieval eval script where you want a
// ground-truth ranking to evaluate against. "atlas" delegates to MongoDB
// Atlas Vector Search's $vectorSearch stage (approximate nearest-neighbor,
// backed by an HNSW index) for production-scale corpora. Swapping between
// them is one env var because both return the same shape.
export async function vectorSearch({ userId, queryEmbedding, topK = 5 }) {
  const backend = process.env.VECTOR_BACKEND || "local";
  return backend === "atlas"
    ? atlasVectorSearch({ userId, queryEmbedding, topK })
    : localVectorSearch({ userId, queryEmbedding, topK });
}

async function localVectorSearch({ userId, queryEmbedding, topK }) {
  const chunks = await NoteChunk.find({ userId }).lean();

  return chunks
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

async function atlasVectorSearch({ userId, queryEmbedding, topK }) {
  const results = await NoteChunk.aggregate([
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: Math.max(topK * 20, 100),
        limit: topK,
        filter: { userId },
      },
    },
    { $project: { chunk: "$$ROOT", score: { $meta: "vectorSearchScore" } } },
  ]);

  return results.map(({ chunk, score }) => ({ chunk, score }));
}

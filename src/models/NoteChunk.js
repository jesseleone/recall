import mongoose from "mongoose";

// One row per chunk. Most notes are short enough to be a single chunk
// (see src/services/chunking.js for why naive fixed-size chunking is
// avoided), so most notes will have exactly one NoteChunk.
const noteChunkSchema = new mongoose.Schema(
  {
    noteId: { type: mongoose.Schema.Types.ObjectId, ref: "Note", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    position: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    embeddingModel: { type: String, required: true },
  },
  { timestamps: true }
);

export const NoteChunk = mongoose.model("NoteChunk", noteChunkSchema);

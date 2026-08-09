import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

export const Note = mongoose.model("Note", noteSchema);

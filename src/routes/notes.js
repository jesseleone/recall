import { Router } from "express";
import { Note } from "../models/Note.js";
import { requireAuth } from "../middleware/auth.js";
import { ingestNote, deleteNoteChunks } from "../services/ingest.js";

export const notesRouter = Router();
notesRouter.use(requireAuth);

notesRouter.get("/", async (req, res) => {
  const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
  res.json(notes);
});

notesRouter.post("/", async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  const note = await Note.create({ userId: req.userId, title, body });
  await ingestNote(note);
  res.status(201).json(note);
});

notesRouter.get("/:id", async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.json(note);
});

notesRouter.put("/:id", async (req, res) => {
  const { title, body } = req.body;
  const note = await Note.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { title, body },
    { new: true, runValidators: true }
  );
  if (!note) return res.status(404).json({ error: "Note not found" });

  await ingestNote(note);
  res.json(note);
});

notesRouter.delete("/:id", async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!note) return res.status(404).json({ error: "Note not found" });

  await deleteNoteChunks(note._id);
  res.status(204).end();
});

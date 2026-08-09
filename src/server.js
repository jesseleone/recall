import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./config/db.js";
import { authRouter } from "./routes/auth.js";
import { notesRouter } from "./routes/notes.js";
import { queryRouter } from "./routes/query.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, "..", "public")));

  app.use("/api/auth", authRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/query", queryRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

async function main() {
  await connectDB(process.env.MONGODB_URI);
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`recall listening on :${port}`));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}

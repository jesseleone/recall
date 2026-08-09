import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDB, disconnectDB } from "../../src/config/db.js";
import { createApp } from "../../src/server.js";

export async function startTestServer() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

  const mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  const app = createApp();

  return {
    app,
    async stop() {
      await disconnectDB();
      await mongod.stop();
    },
  };
}

// mongodb-memory-server spins up a real (unmodified) mongod binary, so it
// supports everything the auth/notes CRUD paths need. It does NOT support
// Atlas Search / $vectorSearch — those are Atlas-only, which is exactly
// why the "local" vector search backend (see src/services/vectorSearch.js)
// exists: it's both the zero-setup dev path and the only backend that's
// testable outside of a real Atlas cluster.

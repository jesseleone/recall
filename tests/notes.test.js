import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { startTestServer } from "./helpers/testServer.js";
import { installFakeVoyage } from "./helpers/fakeVoyage.js";
import { NoteChunk } from "../src/models/NoteChunk.js";

async function registerAndGetToken(app) {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: "jesse@example.com", password: "correct-horse-battery" });
  return res.body.token;
}

test("notes: create, list, update, delete, and their chunks/embeddings", async (t) => {
  const restoreFetch = installFakeVoyage();
  const server = await startTestServer();
  t.after(() => {
    restoreFetch();
    return server.stop();
  });

  const token = await registerAndGetToken(server.app);
  const auth = { Authorization: `Bearer ${token}` };

  const createRes = await request(server.app)
    .post("/api/notes")
    .set(auth)
    .send({ title: "Test note", body: "Some content to embed." });
  assert.equal(createRes.status, 201);
  const noteId = createRes.body._id;

  const chunksAfterCreate = await NoteChunk.find({ noteId });
  assert.equal(chunksAfterCreate.length, 1);
  assert.equal(chunksAfterCreate[0].embedding.length, 8);

  const listRes = await request(server.app).get("/api/notes").set(auth);
  assert.equal(listRes.status, 200);
  assert.equal(listRes.body.length, 1);

  const updateRes = await request(server.app)
    .put(`/api/notes/${noteId}`)
    .set(auth)
    .send({ title: "Updated title", body: "New content entirely." });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.title, "Updated title");

  // Re-ingestion on update should replace, not accumulate, chunks.
  const chunksAfterUpdate = await NoteChunk.find({ noteId });
  assert.equal(chunksAfterUpdate.length, 1);
  assert.ok(chunksAfterUpdate[0].text.includes("Updated title"));

  const deleteRes = await request(server.app).delete(`/api/notes/${noteId}`).set(auth);
  assert.equal(deleteRes.status, 204);

  const chunksAfterDelete = await NoteChunk.find({ noteId });
  assert.equal(chunksAfterDelete.length, 0);
});

test("notes: a user cannot read another user's notes", async (t) => {
  const restoreFetch = installFakeVoyage();
  const server = await startTestServer();
  t.after(() => {
    restoreFetch();
    return server.stop();
  });

  const tokenA = await registerAndGetToken(server.app);
  const createRes = await request(server.app)
    .post("/api/notes")
    .set({ Authorization: `Bearer ${tokenA}` })
    .send({ title: "Private", body: "Only for user A." });
  const noteId = createRes.body._id;

  const registerB = await request(server.app)
    .post("/api/auth/register")
    .send({ email: "other@example.com", password: "correct-horse-battery" });
  const tokenB = registerB.body.token;

  const res = await request(server.app)
    .get(`/api/notes/${noteId}`)
    .set({ Authorization: `Bearer ${tokenB}` });
  assert.equal(res.status, 404);
});

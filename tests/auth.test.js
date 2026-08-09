import { test } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { startTestServer } from "./helpers/testServer.js";

test("auth: register, then login, then reject bad credentials", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const registerRes = await request(server.app)
    .post("/api/auth/register")
    .send({ email: "jesse@example.com", password: "correct-horse-battery" });
  assert.equal(registerRes.status, 201);
  assert.ok(registerRes.body.token);

  const duplicateRes = await request(server.app)
    .post("/api/auth/register")
    .send({ email: "jesse@example.com", password: "correct-horse-battery" });
  assert.equal(duplicateRes.status, 409);

  const loginRes = await request(server.app)
    .post("/api/auth/login")
    .send({ email: "jesse@example.com", password: "correct-horse-battery" });
  assert.equal(loginRes.status, 200);
  assert.ok(loginRes.body.token);

  const badLoginRes = await request(server.app)
    .post("/api/auth/login")
    .send({ email: "jesse@example.com", password: "wrong-password" });
  assert.equal(badLoginRes.status, 401);
});

test("auth: notes routes reject requests without a token", async (t) => {
  const server = await startTestServer();
  t.after(() => server.stop());

  const res = await request(server.app).get("/api/notes");
  assert.equal(res.status, 401);
});

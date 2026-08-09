import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity } from "../src/services/vectorSearch.js";

test("identical vectors have similarity 1", () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test("orthogonal vectors have similarity 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("opposite vectors have similarity -1", () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test("similarity is scale-invariant", () => {
  const a = cosineSimilarity([1, 2, 3], [4, 5, 6]);
  const b = cosineSimilarity([10, 20, 30], [4, 5, 6]);
  assert.ok(Math.abs(a - b) < 1e-9);
});

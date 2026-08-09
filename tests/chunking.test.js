import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkNote } from "../src/services/chunking.js";

test("short notes stay a single chunk", () => {
  const chunks = chunkNote({ title: "Reminder", body: "Pick up dry cleaning on Friday." });
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].position, 0);
});

test("every chunk is prefixed with the title for standalone context", () => {
  const chunks = chunkNote({ title: "Reminder", body: "Pick up dry cleaning on Friday." });
  assert.ok(chunks[0].text.startsWith("Reminder"));
});

test("long notes split on paragraph boundaries, not mid-paragraph", () => {
  const paragraph = "Sentence one is here. ".repeat(60); // > 1200 chars
  const body = [paragraph, "A short unrelated closing paragraph."].join("\n\n");

  const chunks = chunkNote({ title: "Long note", body });

  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.text.length <= 1200 + "Long note\n\n".length);
  }
});

test("a single paragraph longer than the max still gets split, on sentence boundaries", () => {
  const hugeParagraph = "This is one sentence. ".repeat(80); // one paragraph, > 1200 chars
  const chunks = chunkNote({ title: "Huge", body: hugeParagraph });

  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.text.trim().endsWith("."));
  }
});

test("chunk positions are sequential", () => {
  const paragraph = "Sentence one is here. ".repeat(60);
  const body = [paragraph, paragraph.replace("one", "two")].join("\n\n");
  const chunks = chunkNote({ title: "Long note", body });

  chunks.forEach((chunk, i) => assert.equal(chunk.position, i));
});

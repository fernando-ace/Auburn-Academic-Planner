import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("Chat clearly discloses Gemini processing beside the message composer", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "components", "chat-workspace.tsx"),
    "utf8",
  );

  assert.match(source, /Messages and recent chat context are sent to Google Gemini/);
  assert.match(source, /Do not include names, student IDs/);
  assert.match(source, /href="\/privacy"/);
});

test("Privacy distinguishes local PDF analysis from Gemini-backed Chat", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "app", "privacy", "page.tsx"),
    "utf8",
  );

  assert.match(source, /PDF analysis is deterministic/);
  assert.match(source, /does not send PDF contents to Gemini/);
  assert.match(source, /up to 11 recent messages are sent to Google Gemini/);
  assert.match(source, /Do not include names, student IDs/);
});

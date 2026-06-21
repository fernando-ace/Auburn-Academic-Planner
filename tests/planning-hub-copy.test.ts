import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("Planning Hub page no longer renders CSSE manual check cards", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "plan-check", "page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /Advanced and manual checks/);
  assert.doesNotMatch(pageSource, /AI Certificate Manual Check/);
  assert.doesNotMatch(pageSource, /Software Engineering Degree Progress/);
  assert.doesNotMatch(pageSource, /Computer Science Degree Progress/);
  assert.doesNotMatch(pageSource, /AiCertificateCheckSection/);
  assert.doesNotMatch(pageSource, /DegreeProgressCheckSection/);
});

test("Rule Audit copy frames checked rules as local enrichments", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "rule-audit", "page.tsx"),
    "utf8",
  );

  assert.match(pageSource, /audits local deterministic enrichments/i);
  assert.match(pageSource, /Degree Works-native analysis/);
  assert.match(pageSource, /programs without local rule models/);
});

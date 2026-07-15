import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("generated path renders an accessible, sentence-case feasibility checklist", async () => {
  const source = await readFile(
    path.join(
      projectRoot,
      "src",
      "app",
      "plan-check",
      "components",
      "current-progress-details.tsx",
    ),
    "utf8",
  );
  const checklistSource = source.slice(
    source.indexOf("function DraftFeasibilitySummary"),
    source.indexOf("function Metric"),
  );

  assert.match(checklistSource, /aria-labelledby="draft-feasibility-heading"/);
  assert.match(checklistSource, /What this draft checked/);
  assert.match(checklistSource, /CheckCircle2/);
  assert.match(checklistSource, /AlertCircle/);

  for (const label of [
    "Degree Works grounding",
    "Credit caps",
    "Bulletin sequence",
    "Prerequisites and corequisites",
    "Course offerings",
    "Seat availability",
  ]) {
    assert.match(checklistSource, new RegExp(label));
  }

  for (const status of [
    "Checked",
    "Planning hint",
    "Unconfirmed hint",
    "Not available",
    "Not checked",
  ]) {
    assert.match(checklistSource, new RegExp(status));
  }

  assert.doesNotMatch(checklistSource, /uppercase/);
  assert.doesNotMatch(checklistSource, /tracking-/);
  assert.doesNotMatch(checklistSource, /shadow-(?:xl|2xl)/);
});

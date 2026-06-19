import assert from "node:assert/strict";
import test from "node:test";

import { detectDegreeWorksDocumentType } from "../src/lib/plan/degreeworks-document-type.ts";

test("detects worksheet audit documents from current-progress signals", () => {
  const result = detectDegreeWorksDocumentType(`
    Auburn University Degree Works Worksheet
    Audit date 01/15/2026
    Credits required 122
    Credits applied 96
    Unmet conditions for this set of requirements: 26 Credits needed
    Still needed: 3 Credits in COMP 3220
    Preregistered
    Fall Through
    Incomplete
  `);

  assert.equal(result.documentType, "worksheet_audit");
  assert.ok(result.matchedWorksheetSignals.includes("Still needed"));
});

test("detects planned path documents from plan signals", () => {
  const result = detectDegreeWorksDocumentType(`
    Plan Description Software Engineering graduation plan
    Total planned credits 122
    Fall 2026 COMP 3220
    Spring 2027 COMP 3270
  `);

  assert.equal(result.documentType, "planned_path");
  assert.ok(result.matchedPlannedPathSignals.includes("Total planned credits"));
});

test("returns unknown when signals are weak or tied", () => {
  const result = detectDegreeWorksDocumentType("Degree Works export COMP 1210");

  assert.equal(result.documentType, "unknown");
});

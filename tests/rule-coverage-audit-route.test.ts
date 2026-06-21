import assert from "node:assert/strict";
import test from "node:test";

import { GET } from "../src/app/api/rules/coverage-audit/route.ts";

test("GET returns the deterministic rule coverage audit shape", async () => {
  const response = GET();
  const audit = await response.json();

  assert.equal(response.status, 200);
  assert.match(audit.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(audit.catalogYear, "2025-2026");
  assert.equal(audit.sourceIntegrity.status, "pass");
  assert.equal(audit.sourceIntegrity.warningsCount, 0);
  assert.match(audit.sourceIntegrity.lastCheckedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(audit.sourceIntegrity.note, /local checked-in source files/i);
  assert.equal(audit.programs.length, 3);
  assert.deepEqual(
    audit.programs.map((program: { programKey: string }) => program.programKey).sort(),
    ["ai_certificate", "computer_science", "software_engineering"],
  );
  assert.ok(Array.isArray(audit.supportingModels));
  assert.ok(Array.isArray(audit.globalLimitations));
  assert.ok(Array.isArray(audit.recommendedNextImprovements));
});

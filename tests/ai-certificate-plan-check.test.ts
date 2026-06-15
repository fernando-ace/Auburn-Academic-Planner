import assert from "node:assert/strict";
import test from "node:test";

import { buildAiCertificatePlanCheck } from "../src/lib/plan/ai-certificate-plan-check.ts";

test("builds the deterministic AI certificate plan check payload", () => {
  const result = buildAiCertificatePlanCheck();

  assert.equal(
    result.planDescription,
    "3 Year Bachelors Degree + AI Certificate",
  );
  assert.equal(result.major, "Software Engineering");
  assert.equal(result.totalPlannedCredits, 122);
  assert.deepEqual(
    result.requiredCoursesSatisfied.map((course) => course.code),
    ["COMP 5600", "COMP 5630", "COMP 5130"],
  );
  assert.deepEqual(result.requiredCoursesMissing, []);
  assert.deepEqual(
    result.electiveCandidatesFound.map((course) => course.code),
    ["COMP 5610"],
  );
  assert.equal(result.isLikelyComplete, true);
  assert.equal(result.advisorVerificationRequired, true);
  assert.ok(
    result.notes.some((note) =>
      note.includes("Advisor verification is required"),
    ),
  );
});

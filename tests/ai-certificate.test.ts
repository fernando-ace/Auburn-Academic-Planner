import assert from "node:assert/strict";
import test from "node:test";

import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";

test("all required courses plus COMP 5610 is likely complete with advisor verification", () => {
  const result = checkAiEngineeringCertificate([
    "COMP 5600",
    "COMP 5630",
    "COMP 5130",
    "COMP 5610",
  ]);

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
      note.includes("not as guaranteed department approval"),
    ),
  );
});

test("missing COMP 5130 reports that required course as missing", () => {
  const result = checkAiEngineeringCertificate([
    "COMP 5600",
    "COMP 5630",
    "COMP 5610",
  ]);

  assert.deepEqual(
    result.requiredCoursesMissing.map((course) => course.code),
    ["COMP 5130"],
  );
  assert.equal(result.isLikelyComplete, false);
  assert.equal(result.advisorVerificationRequired, true);
});

test("required courses present but no elective candidate is not likely complete", () => {
  const result = checkAiEngineeringCertificate([
    "COMP 5600",
    "COMP 5630",
    "COMP 5130",
  ]);

  assert.deepEqual(result.requiredCoursesMissing, []);
  assert.deepEqual(result.electiveCandidatesFound, []);
  assert.equal(result.isLikelyComplete, false);
  assert.ok(
    result.notes.some((note) =>
      note.includes("No planned course matched the local"),
    ),
  );
});

test("unrelated courses only leaves all required courses missing", () => {
  const result = checkAiEngineeringCertificate(["MATH 1610", "ENGL 1120"]);

  assert.deepEqual(result.requiredCoursesSatisfied, []);
  assert.deepEqual(
    result.requiredCoursesMissing.map((course) => course.code),
    ["COMP 5600", "COMP 5630", "COMP 5130"],
  );
  assert.deepEqual(result.electiveCandidatesFound, []);
  assert.equal(result.isLikelyComplete, false);
});

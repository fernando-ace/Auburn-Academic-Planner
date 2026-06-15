import assert from "node:assert/strict";
import test from "node:test";

import { buildAiCertificatePlanCheck } from "../src/lib/plan/ai-certificate-plan-check.ts";
import {
  GET,
  POST,
} from "../src/app/api/plan/check-ai-certificate/route.ts";

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

test("GET returns the Degree Works Plan Sample check", async () => {
  const response = await GET();
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    result.planDescription,
    "3 Year Bachelors Degree + AI Certificate",
  );
  assert.equal(result.major, "Software Engineering");
  assert.equal(result.totalPlannedCredits, 122);
  assert.deepEqual(
    result.requiredCoursesSatisfied.map(
      (course: { code: string }) => course.code,
    ),
    ["COMP 5600", "COMP 5630", "COMP 5130"],
  );
  assert.deepEqual(result.requiredCoursesMissing, []);
  assert.deepEqual(
    result.electiveCandidatesFound.map((course: { code: string }) => course.code),
    ["COMP 5610"],
  );
  assert.equal(result.isLikelyComplete, true);
  assert.equal(result.advisorVerificationRequired, true);
});

test("POST checks a custom complete AI certificate course list", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: ["comp 5600", "COMP 5630", "COMP 5130", "COMP 5610"],
      planDescription: "Custom plan",
      major: "Software Engineering",
      totalPlannedCredits: null,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.planDescription, "Custom plan");
  assert.equal(result.major, "Software Engineering");
  assert.equal(result.totalPlannedCredits, null);
  assert.deepEqual(
    result.requiredCoursesSatisfied.map(
      (course: { code: string }) => course.code,
    ),
    ["COMP 5600", "COMP 5630", "COMP 5130"],
  );
  assert.deepEqual(result.requiredCoursesMissing, []);
  assert.deepEqual(
    result.electiveCandidatesFound.map((course: { code: string }) => course.code),
    ["COMP 5610"],
  );
  assert.equal(result.isLikelyComplete, true);
});

test("POST reports COMP 5130 missing from a custom course list", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: ["COMP 5600", "COMP 5630", "COMP 5610"],
      planDescription: "Missing data mining",
      major: "Software Engineering",
      totalPlannedCredits: null,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(
    result.requiredCoursesMissing.map((course: { code: string }) => course.code),
    ["COMP 5130"],
  );
  assert.equal(result.isLikelyComplete, false);
  assert.equal(result.advisorVerificationRequired, true);
});

test("POST rejects an empty custom course list", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: [],
      planDescription: "Empty plan",
      major: "Software Engineering",
      totalPlannedCredits: null,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    result.error,
    "courseCodes must be a non-empty array of course code strings.",
  );
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/plan/check-ai-certificate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

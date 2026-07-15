import assert from "node:assert/strict";
import test from "node:test";

import { POST as manualPathPost } from "../src/app/api/plan/analyze-degreeworks/manual/route.ts";
import { POST as generatePathPost } from "../src/app/api/plan/generate-path/route.ts";
import { resetInMemoryRateLimits } from "../src/lib/api/rate-limit.ts";
import { parseCurrentProgressAnalysisInput } from "../src/lib/plan/current-progress-analysis-input.ts";

const minimalValidAnalysis = {
  documentType: "worksheet_audit",
  stillNeededItems: [],
  completedCourseCodes: [],
  preregisteredCourseCodes: [],
  confidence: "high",
};

test("normalizes a valid Current Progress input into safe downstream defaults", () => {
  const result = parseCurrentProgressAnalysisInput(minimalValidAnalysis);

  assert.equal(result.status, "valid");
  if (result.status !== "valid") return;

  assert.deepEqual(result.value.inProgressCourseCodes, []);
  assert.deepEqual(result.value.transferOrApCourseCodes, []);
  assert.deepEqual(result.value.courseStatusRecords, []);
  assert.deepEqual(result.value.externalCreditCounts, {
    advanced_placement: 0,
    transfer: 0,
    other: 0,
  });
});

test("rejects malformed nested Current Progress collections", () => {
  const malformedValues = [
    {
      ...minimalValidAnalysis,
      transferOrApCourseCodes: { code: "COMP 1210" },
    },
    {
      ...minimalValidAnalysis,
      stillNeededItems: [
        {
          blockName: "Major",
          requirementLabel: "COMP 1210",
          neededText: "Still needed: COMP 1210",
          courseOptions: "COMP 1210",
          requirementType: "specific_course",
        },
      ],
    },
    {
      ...minimalValidAnalysis,
      courseStatusRecords: [
        {
          code: "COMP 1210",
          status: "completed",
          confidence: "certain",
        },
      ],
    },
  ];

  for (const value of malformedValues) {
    const result = parseCurrentProgressAnalysisInput(value);
    assert.equal(result.status, "invalid");
  }
});

test("redacts identifiers in retransmitted Current Progress evidence", () => {
  const result = parseCurrentProgressAnalysisInput({
    ...minimalValidAnalysis,
    courseStatusRecords: [
      {
        code: "COMP 1210",
        status: "completed",
        rawEvidence:
          "Student name Jane Student Student ID 900000000 Email jane@example.com COMP 1210 Grade A",
        confidence: "high",
      },
    ],
  });

  assert.equal(result.status, "valid");
  if (result.status !== "valid") return;

  const evidence = result.value.courseStatusRecords[0]?.rawEvidence ?? "";
  assert.doesNotMatch(evidence, /Jane Student/);
  assert.doesNotMatch(evidence, /900000000/);
  assert.doesNotMatch(evidence, /jane@example\.com/);
  assert.match(evidence, /COMP 1210 Grade A/);
});

test("generated-path route returns a controlled error for malformed analysis", async () => {
  resetInMemoryRateLimits();

  const response = await generatePathPost(
    new Request("http://localhost/api/plan/generate-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentProgressAnalysis: {
          ...minimalValidAnalysis,
          transferOrApCourseCodes: { code: "COMP 1210" },
        },
      }),
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.error, /Current Progress analysis is invalid/);
});

test("manual comparison rejects malformed optional Current Progress input", async () => {
  resetInMemoryRateLimits();

  const response = await manualPathPost(
    new Request("http://localhost/api/plan/analyze-degreeworks/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plannedCoursesText: "Fall 2026: COMP 1210",
        currentProgressAnalysis: {
          ...minimalValidAnalysis,
          stillNeededItems: [{ requirementType: "specific_course" }],
        },
      }),
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.error, /Current Progress analysis is invalid/);
});

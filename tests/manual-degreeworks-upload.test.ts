import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/analyze-degreeworks/manual/route.ts";
import { resetInMemoryRateLimits } from "../src/lib/api/rate-limit.ts";

const currentProgressAnalysis = {
  documentType: "worksheet_audit",
  stillNeededItems: [
    {
      blockName: "Science",
      requirementLabel: "BIOL 1020",
      neededText: "Still needed: BIOL 1020",
      requirementType: "specific_course",
      courseOptions: ["BIOL 1020"],
    },
    {
      blockName: "Agriculture",
      requirementLabel: "CSES 2040",
      neededText: "Still needed: CSES 2040",
      requirementType: "specific_course",
      courseOptions: ["CSES 2040"],
    },
    {
      blockName: "Nursing",
      requirementLabel: "NURS 3100",
      neededText: "Still needed: NURS 3100",
      requirementType: "specific_course",
      courseOptions: ["NURS 3100"],
    },
  ],
  completedCourseCodes: [],
  preregisteredCourseCodes: [],
  inProgressCourseCodes: [],
  transferOrApCourseCodes: [],
  confidence: "high",
};

test("manual planned-path route returns planned-path results", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({
      plannedCoursesText: "Fall 2026: AERO 2200, BIOL 1020, CSES 2040, NURS 3100",
      currentProgressAnalysis,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "Manual planned courses");
  assert.equal(result.documentType, "planned_path");
  assert.ok(result.parsedCourseCodes.includes("AERO 2200"));
  assert.ok(result.parsedCourseCodes.includes("BIOL 1020"));
  assert.ok(result.plannedPathCoverage);
  assert.equal(result.plannedPathCoverage.coveredStillNeededItems.length, 3);
});

test("manual planned-path route rejects empty planned-course text", async () => {
  resetInMemoryRateLimits();

  const response = await POST(jsonRequest({ plannedCoursesText: "   " }));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.match(result.error, /Paste at least one planned Auburn course/);
});

test("manual planned-path route rejects oversized planned-course text", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({ plannedCoursesText: "BIOL 1020 ".repeat(3_000) }),
  );
  const result = await response.json();

  assert.equal(response.status, 413);
  assert.match(result.error, /too long/);
});

test("manual planned-path route rejects text without Auburn courses", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest({ plannedCoursesText: "Take a science class and an elective." }),
  );
  const result = await response.json();

  assert.equal(response.status, 422);
  assert.match(result.error, /No Auburn course codes/);
});

test("manual planned-path route rate limits repeated requests", async () => {
  resetInMemoryRateLimits();

  let response = new Response();
  for (let index = 0; index < 31; index += 1) {
    response = await POST(
      jsonRequest(
        { plannedCoursesText: "BIOL 1020" },
        { "x-forwarded-for": "203.0.113.9" },
      ),
    );
  }

  const result = await response.json();

  assert.equal(response.status, 429);
  assert.equal(result.error, "Too many requests. Try again in a few minutes.");
});

test("manual planned-path route rejects cross-site requests without caching the response", async () => {
  resetInMemoryRateLimits();

  const response = await POST(
    jsonRequest(
      { plannedCoursesText: "Fall 2026: COMP 1210" },
      { Origin: "https://malicious.example" },
    ),
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("cache-control"), "private, no-store, max-age=0");
});

function jsonRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/plan/analyze-degreeworks/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

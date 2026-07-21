import assert from "node:assert/strict";
import test from "node:test";

import {
  makeProductionSmokeWorksheetPdf,
  PRODUCTION_SMOKE_EXPECTED_COURSE_CODES,
} from "../scripts/lib/production-smoke-fixture.ts";
import { POST } from "../src/app/api/plan/analyze-degreeworks-current/upload/route.ts";
import { POST as manualPost } from "../src/app/api/plan/analyze-degreeworks/manual/route.ts";
import { resetInMemoryRateLimits } from "../src/lib/api/rate-limit.ts";
import {
  getDefaultGeneratedPathStartTerm,
  nextGeneratedPathTerm,
  parseGeneratedPathTerm,
} from "../src/lib/plan/generated-path-terms.ts";

test("production smoke PDF drives the real flagship planning result", async () => {
  resetInMemoryRateLimits();
  const origin = "http://localhost";
  const startTerm = getDefaultGeneratedPathStartTerm(new Date(), true);
  const formData = new FormData();
  formData.set(
    "file",
    new File(
      [makeProductionSmokeWorksheetPdf()],
      "synthetic-current-progress-smoke.pdf",
      { type: "application/pdf" },
    ),
  );
  formData.set(
    "generatedPathPreferences",
    JSON.stringify({
      startTerm,
      maxCreditsPerTerm: 9,
      includeSummer: true,
      maxSummerCredits: 6,
    }),
  );

  const response = await POST(
    new Request(
      `${origin}/api/plan/analyze-degreeworks-current/upload`,
      {
        method: "POST",
        headers: {
          Origin: origin,
          "Sec-Fetch-Site": "same-origin",
        },
        body: formData,
      },
    ),
  );
  const result = await response.json();
  const placedCourseCodes = new Set<string>(
    result.generatedPlannedPath?.placedItems?.flatMap(
      (item: { courseCodes?: unknown }) =>
        Array.isArray(item.courseCodes) ? item.courseCodes : [],
    ) ?? [],
  );

  assert.equal(response.status, 200);
  assert.equal(result.documentType, "worksheet_audit");
  assert.deepEqual(
    [...result.currentProgressAnalysis.stillNeededCourseCodes].sort(),
    [...PRODUCTION_SMOKE_EXPECTED_COURSE_CODES].sort(),
  );
  assert.deepEqual(
    [...placedCourseCodes].sort(),
    [...PRODUCTION_SMOKE_EXPECTED_COURSE_CODES].sort(),
  );
  assert.equal(result.generatedPlannedPath.preferences.startTerm, startTerm);
  assert.equal(result.generatedPlannedPath.preferences.maxCreditsPerTerm, 9);
  assert.equal(result.generatedPlannedPath.preferences.includeSummer, true);
  assert.equal(result.generatedPlannedPath.preferences.maxSummerCredits, 6);
  const nextTerm = nextGeneratedPathTerm({
    includeSummer: true,
    ...parseGeneratedPathTerm(startTerm, true),
  });
  assert.deepEqual(
    result.generatedPlannedPath.terms.map(
      (term: { label: string; index: number }) => ({
        label: term.label,
        index: term.index,
      }),
    ),
    [
      { label: startTerm, index: 0 },
      { label: `${nextTerm.term} ${nextTerm.year}`, index: 1 },
    ],
  );
  for (const term of result.generatedPlannedPath.terms) {
    const itemCredits = term.items.reduce(
      (total: number, item: { credits: number }) => total + item.credits,
      0,
    );
    assert.equal(term.plannedCredits, itemCredits);
    assert.ok(
      term.plannedCredits <=
        (term.label.startsWith("Summer ") ? 6 : 9),
    );
  }
  assert.deepEqual(result.generatedPlannedPath.creditTotals, {
    lockedCurrentCredits: 0,
    draftCredits: 10,
    totalDisplayedCredits: 10,
  });
  assert.match(result.advisorMeetingSummary, /Generated draft path/i);
});

test("production smoke manual input drives the real renderable term result", async () => {
  resetInMemoryRateLimits();
  const origin = "http://localhost";
  const response = await manualPost(
    new Request(`${origin}/api/plan/analyze-degreeworks/manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        plannedCoursesText:
          "Fall 2030 Credits: 6\nCOMP 1210, MATH 1610",
      }),
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.documentType, "planned_path");
  assert.equal(result.parsedCourseCount, 2);
  assert.deepEqual(result.parsedCourseCodes, ["COMP 1210", "MATH 1610"]);
  assert.deepEqual(result.semesterPlanAnalysis.terms, [
    {
      label: "Fall 2030",
      index: 0,
      courseCodes: ["COMP 1210", "MATH 1610"],
      plannedCredits: 6,
    },
  ]);
  assert.deepEqual(result.semesterPlanAnalysis.unassignedCourseCodes, []);
});

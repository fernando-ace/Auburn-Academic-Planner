import assert from "node:assert/strict";
import test from "node:test";

import {
  countPlanningHubDraftCourseCodes,
  createPlanningHubDeviceDraft,
  formatPlanningHubDraftTruncation,
  formatPlanningHubManualDraft,
  PLANNING_HUB_DRAFT_VERSION,
  readPlanningHubDeviceDraft,
} from "../src/lib/plan/planning-hub-device-draft.ts";

const savedAt = new Date("2026-07-14T15:00:00.000Z");

test("device draft keeps only recognized manual plan structure", () => {
  const draft = createPlanningHubDeviceDraft({
    activeStep: "planned_path",
    generatedPathPreferences: {
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 16,
      includeSummer: true,
      maxSummerCredits: 7,
    },
    manualPlannedCoursesText: [
      "Student: Aubie Tiger",
      "Student ID: 903123456",
      "Total Planned Credits: 12",
      "Fall 2026 Credits: 6",
      "COMP 1210, MATH 1610",
      "Spring 2027 Credits: 6",
      "COMP 2210, MATH 1620",
      "Private note: meet with Dr. Example",
    ].join("\n"),
    now: savedAt,
    plannedPathInputMode: "manual",
  });
  const serialized = JSON.stringify(draft);

  assert.equal(draft.version, PLANNING_HUB_DRAFT_VERSION);
  assert.equal(draft.resumeAt, "planned_path");
  assert.equal(countPlanningHubDraftCourseCodes(draft), 4);
  assert.deepEqual(draft.manualPlan?.terms, [
    {
      label: "Fall 2026",
      plannedCredits: 6,
      courseCodes: ["COMP 1210", "MATH 1610"],
    },
    {
      label: "Spring 2027",
      plannedCredits: 6,
      courseCodes: ["COMP 2210", "MATH 1620"],
    },
  ]);
  assert.doesNotMatch(serialized, /Aubie|903123456|Dr\. Example|Private note/);
  assert.doesNotMatch(serialized, /sourceFileName|currentProgressAnalysis|PDF/);
});

test("device draft restores parser-compatible planned course text", () => {
  const draft = createPlanningHubDeviceDraft({
    activeStep: "planned_path",
    generatedPathPreferences: {},
    manualPlannedCoursesText: [
      "Fall 2026 Credits: 6",
      "COMP 1210, MATH 1610",
      "Spring 2027 Credits: 3",
      "COMP 2210",
    ].join("\n"),
    now: savedAt,
    plannedPathInputMode: "manual",
  });

  assert.equal(
    formatPlanningHubManualDraft(draft.manualPlan),
    [
      "Total Planned Credits: 9",
      "",
      "Fall 2026 Credits: 6",
      "COMP 1210, MATH 1610",
      "",
      "Spring 2027 Credits: 3",
      "COMP 2210",
    ].join("\n"),
  );
});

test("device draft expires after 30 days", () => {
  const draft = createPlanningHubDeviceDraft({
    activeStep: "current_progress",
    generatedPathPreferences: {},
    manualPlannedCoursesText: "",
    now: savedAt,
    plannedPathInputMode: "pdf",
  });

  assert.equal(
    readPlanningHubDeviceDraft(JSON.stringify(draft), new Date("2026-08-12T15:00:00.000Z")).status,
    "valid",
  );
  assert.equal(
    readPlanningHubDeviceDraft(JSON.stringify(draft), new Date("2026-08-13T15:00:00.000Z")).status,
    "expired",
  );
});

test("device draft rejects unknown versions and expanded expiration windows", () => {
  const draft = createPlanningHubDeviceDraft({
    activeStep: "current_progress",
    generatedPathPreferences: {},
    manualPlannedCoursesText: "",
    now: savedAt,
    plannedPathInputMode: "pdf",
  });

  assert.equal(
    readPlanningHubDeviceDraft(JSON.stringify({ ...draft, version: 2 }), savedAt).status,
    "invalid",
  );
  assert.equal(
    readPlanningHubDeviceDraft(
      JSON.stringify({ ...draft, expiresAt: "2027-07-14T15:00:00.000Z" }),
      savedAt,
    ).status,
    "invalid",
  );
  assert.equal(
    readPlanningHubDeviceDraft(
      JSON.stringify({
        ...draft,
        savedAt: "2099-01-01T00:00:00.000Z",
        expiresAt: "2099-01-31T00:00:00.000Z",
      }),
      savedAt,
    ).status,
    "invalid",
  );
});

test("PDF mode draft never captures hidden manual text", () => {
  const draft = createPlanningHubDeviceDraft({
    activeStep: "advisor_summary",
    generatedPathPreferences: {},
    manualPlannedCoursesText: "Fall 2026 Credits: 3\nCOMP 1210",
    now: savedAt,
    plannedPathInputMode: "pdf",
  });

  assert.equal(draft.resumeAt, "current_progress");
  assert.equal(draft.manualPlan, undefined);
  assert.doesNotMatch(JSON.stringify(draft), /COMP 1210/);
});

test("device draft reports every recognized term and course code omitted by storage limits", () => {
  const manualPlan = Array.from({ length: 13 }, (_, termIndex) => {
    const courseCodes =
      termIndex === 0
        ? Array.from(
            { length: 25 },
            (__, courseIndex) => `COMP ${1000 + courseIndex}`,
          )
        : [`COMP ${1100 + termIndex}`];
    return [
      `Fall ${2026 + termIndex} Credits: 3`,
      courseCodes.join(", "),
    ].join("\n");
  }).join("\n");
  const draft = createPlanningHubDeviceDraft({
    activeStep: "planned_path",
    generatedPathPreferences: {},
    manualPlannedCoursesText: manualPlan,
    now: savedAt,
    plannedPathInputMode: "manual",
  });

  assert.equal(draft.manualPlan?.terms.length, 12);
  assert.equal(draft.manualPlan?.terms[0].courseCodes.length, 24);
  assert.deepEqual(draft.truncation, {
    omittedTermCount: 1,
    omittedCourseCodeCount: 2,
  });
  assert.equal(
    formatPlanningHubDraftTruncation(draft.truncation),
    "1 term and 2 recognized course codes were not saved",
  );
  assert.deepEqual(
    readPlanningHubDeviceDraft(JSON.stringify(draft), savedAt),
    { status: "valid", draft },
  );
});

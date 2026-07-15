import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { analyzeCurrentDegreeAuditText } from "../src/lib/plan/current-degree-audit-analysis.ts";
import {
  buildGeneratedPlannedPath,
  resolveGeneratedPathPreferences,
} from "../src/lib/plan/generated-planned-path.ts";

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "degreeworks",
);

async function analyzeFixture(fileName: string) {
  return analyzeCurrentDegreeAuditText(
    await readFile(path.join(fixtureDirectory, fileName), "utf8"),
  );
}

test("generated path locks registered courses and balances exact remaining courses", async () => {
  const audit = await analyzeFixture("worksheet-preregistered-sample.txt");
  const generatedPath = buildGeneratedPlannedPath({
    audit,
    preferences: {
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 6,
      includeSummer: false,
    },
  });
  const placedLabels = generatedPath.placedItems.map((item) => item.label);
  const firstTerm = generatedPath.terms[0];
  const registeredComp3220 = generatedPath.placedItems.find(
    (item) => item.label === "COMP 3220",
  );

  assert.ok(registeredComp3220);
  assert.equal(registeredComp3220.kind, "registered");
  assert.equal(registeredComp3220.locked, true);
  assert.equal(registeredComp3220.sourceStatus, "preregistered");
  assert.ok(placedLabels.includes("COMP 3270"));
  assert.equal(firstTerm.label, "Fall 2026");
  assert.equal(firstTerm.draftCredits, 0);
  assert.ok(firstTerm.lockedCredits > 0);
  assert.ok(
    generatedPath.unplacedItems.some((item) =>
      item.reason.includes("appears completed"),
    ),
  );
});

test("generated path starts with registered load and holds overlapping options", async () => {
  const audit = await analyzeFixture("worksheet-registered-bleed-sample.txt");
  const generatedPath = buildGeneratedPlannedPath({
    audit,
    preferences: {
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 15,
      includeSummer: false,
    },
  });
  const firstTerm = generatedPath.terms[0];
  const firstTermLabels = firstTerm.items.map((item) => item.label);

  assert.equal(firstTerm.label, "Fall 2026");
  assert.ok(firstTerm.items.every((item) => item.locked));
  assert.deepEqual(firstTermLabels, [
    "COMP 2710",
    "COMP 2800",
    "COMP 3270",
    "COMP 3350",
    "ENGL 2200",
    "STAT 3010",
    "STAT 3600",
  ]);
  assert.equal(firstTerm.draftCredits, 0);
  assert.equal(firstTerm.lockedCredits, 19);
  assert.equal(generatedPath.creditTotals.lockedCurrentCredits, 19);
  assert.ok(generatedPath.creditTotals.draftCredits <= (audit.creditsNeeded ?? 0));
  assert.ok(
    generatedPath.advisorReviewItems.some((item) =>
      item.reason.includes("overlaps current"),
    ),
  );
  assert.ok(
    !generatedPath.placedItems.some(
      (item) => !item.locked && item.label === "ENGL 2207",
    ),
  );
});

test("generated path uses Bulletin order only for Degree Works-backed items", async () => {
  const audit = await analyzeFixture("worksheet-current-audit-sample.txt");
  const generatedPath = buildGeneratedPlannedPath({
    audit,
    preferences: { startTerm: "Fall 2026", maxCreditsPerTerm: 15 },
  });
  const placedLabels = generatedPath.placedItems.map((item) => item.label);

  assert.deepEqual(placedLabels, ["ELEC 2200", "COMP 3270", "COMP 3220"]);
  assert.ok(!placedLabels.includes("COMP 3500"));
  assert.equal(
    generatedPath.orderingSource.bulletinOrderingHint?.matchedMajorTitle,
    "Software Engineering",
  );
});

test("generated path warns and falls back when the audit catalog year differs", async () => {
  const audit = await analyzeFixture("worksheet-current-audit-sample.txt");
  const generatedPath = buildGeneratedPlannedPath({
    audit: {
      ...audit,
      catalogYear: "2022-2023",
      detectedProgram: {
        ...audit.detectedProgram,
        catalogYear: "2022-2023",
      },
    },
    preferences: { startTerm: "Fall 2026", maxCreditsPerTerm: 15 },
  });

  assert.equal(generatedPath.orderingSource.bulletinOrderingHint, null);
  assert.match(
    generatedPath.orderingSource.bulletinOrderingWarning ?? "",
    /2022-2023/,
  );
  assert.match(
    generatedPath.orderingSource.bulletinOrderingWarning ?? "",
    /2025-2026/,
  );
  assert.deepEqual(
    generatedPath.placedItems.map((item) => item.label),
    ["COMP 3220", "COMP 3270", "ELEC 2200"],
  );
  assert.ok(generatedPath.notes.some((note) => note.includes("was not applied")));
});

test("generated path keeps broad requirements as advisor-review placeholders", async () => {
  const audit = await analyzeFixture("worksheet-business-audit-sample.txt");
  const generatedPath = buildGeneratedPlannedPath({
    audit,
    preferences: {
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 9,
      includeSummer: true,
      maxSummerCredits: 6,
    },
  });

  assert.ok(generatedPath.placedItems.some((item) => item.label === "ACCT 2110"));
  assert.ok(
    generatedPath.placedItems.some((item) => item.label.startsWith("PHIL ")),
  );
  assert.ok(
    generatedPath.placedItems.some((item) => item.kind === "placeholder"),
  );
  assert.ok(
    generatedPath.advisorReviewItems.some(
      (item) => item.requirementType === "credit_hours_from_list",
    ),
  );
});

test("generated path falls back to Degree Works order without a Bulletin match", () => {
  const generatedPath = buildGeneratedPlannedPath({
    audit: {
      documentType: "worksheet_audit",
      detectedProgram: {
        degree: null,
        program: "BFA Very New Program",
        major: "Very New Program",
        catalogYear: "2025-2026",
        displayName: "BFA Very New Program Very New Program",
        programKey: "detected",
        confidence: "high",
        source: "worksheet_label",
      },
      creditsRequired: 120,
      creditsApplied: 90,
      creditsNeeded: 30,
      degreeStatus: "incomplete",
      requirementBlocks: [],
      stillNeededItems: [
        {
          blockName: "Major",
          requirementLabel: "ARTS 3010",
          neededText: "Still needed: ARTS 3010",
          courseOptions: ["ARTS 3010"],
          creditAmount: 3,
          requirementType: "specific_course",
          confidence: "high",
        },
      ],
      courseStatusRecords: [],
      externalCreditRecords: [],
      externalCreditCounts: { advanced_placement: 0, transfer: 0, other: 0 },
      completedCourseCodes: [],
      preregisteredCourseCodes: [],
      inProgressCourseCodes: [],
      transferOrApCourseCodes: [],
      nonDegreeApplicableCourseCodes: [],
      stillNeededCourseCodes: ["ARTS 3010"],
      currentApplicableCourseCodes: [],
      parserWarnings: [],
      confidence: "high",
    },
    preferences: { startTerm: "Fall 2026" },
  });

  assert.equal(generatedPath.orderingSource.bulletinOrderingHint, null);
  assert.equal(generatedPath.placedItems[0].label, "ARTS 3010");
  assert.equal(generatedPath.confidence, "medium");
});

test("generated path caps draft credits to current-progress credits needed", () => {
  const generatedPath = buildGeneratedPlannedPath({
    audit: {
      documentType: "worksheet_audit",
      detectedProgram: {
        degree: null,
        program: "BFA Very New Program",
        major: "Very New Program",
        catalogYear: "2025-2026",
        displayName: "BFA Very New Program Very New Program",
        programKey: "detected",
        confidence: "high",
        source: "worksheet_label",
      },
      creditsRequired: 120,
      creditsApplied: 114,
      creditsNeeded: 6,
      degreeStatus: "incomplete",
      requirementBlocks: [],
      stillNeededItems: ["ARTS 3010", "ARTS 3020", "ARTS 3030"].map((code) => ({
        blockName: "Major",
        requirementLabel: code,
        neededText: `Still needed: ${code}`,
        courseOptions: [code],
        creditAmount: 3,
        requirementType: "specific_course" as const,
        confidence: "high" as const,
      })),
      courseStatusRecords: [],
      externalCreditRecords: [],
      externalCreditCounts: { advanced_placement: 0, transfer: 0, other: 0 },
      completedCourseCodes: [],
      preregisteredCourseCodes: [],
      inProgressCourseCodes: [],
      transferOrApCourseCodes: [],
      nonDegreeApplicableCourseCodes: [],
      stillNeededCourseCodes: ["ARTS 3010", "ARTS 3020", "ARTS 3030"],
      currentApplicableCourseCodes: [],
      parserWarnings: [],
      confidence: "high",
    },
    preferences: { startTerm: "Fall 2026", maxCreditsPerTerm: 12 },
  });

  assert.equal(generatedPath.creditTotals.draftCredits, 6);
  assert.deepEqual(
    generatedPath.placedItems.map((item) => item.label),
    ["ARTS 3010", "ARTS 3020"],
  );
  assert.ok(
    generatedPath.unplacedItems.some((item) =>
      item.reason.includes("credits-needed total"),
    ),
  );
});

test("generated path preferences are sanitized", () => {
  const preferences = resolveGeneratedPathPreferences({
    startTerm: "bad input",
    maxCreditsPerTerm: 100,
    includeSummer: true,
    maxSummerCredits: 1,
  });

  assert.match(preferences.startTerm, /^(Fall|Spring|Summer) 20\d{2}$/);
  assert.equal(preferences.maxCreditsPerTerm, 21);
  assert.equal(preferences.maxSummerCredits, 3);
});

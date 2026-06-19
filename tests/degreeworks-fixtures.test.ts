import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { analyzeCombinedDegreeWorksText } from "../src/lib/plan/combined-degreeworks-analysis.ts";
import type { PlanningTargetPathInput } from "../src/lib/plan/target-path.ts";

const fixtureDirectory = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "degreeworks",
);

async function analyzeFixture(
  fileName: string,
  targetPath: PlanningTargetPathInput = "auto",
) {
  const text = await readFile(path.join(fixtureDirectory, fileName), "utf8");

  return analyzeCombinedDegreeWorksText({ text, targetPath });
}

const fixtureNames = [
  "clean-planned-sample.txt",
  "transfer-ap-credit-sample.txt",
  "in-progress-courses-sample.txt",
  "substitution-exception-sample.txt",
  "waived-requirement-sample.txt",
  "low-text-quality-sample.txt",
  "mixed-csse-plan-sample.txt",
] as const;

for (const fixtureName of fixtureNames) {
  test(`runs ${fixtureName} through the combined deterministic pipeline`, async () => {
    const result = await analyzeFixture(fixtureName);

    assert.ok(result.parsedCourseCount > 0);
    assert.equal(result.courseStatusRecords.length, result.parsedCourseCount);
    assert.ok(result.aiCertificateCheck);
    assert.ok(result.softwareEngineeringCheck);
    assert.ok(result.computerScienceCheck);
    assert.ok(result.prerequisiteCheck);
    assert.ok(result.gapReport);
    assert.ok(result.nextSemesterSuggestions);
    assert.ok(result.draftSemesterPlan);
  });
}

test("clean planned fixture has stable medium or high confidence", async () => {
  const result = await analyzeFixture("clean-planned-sample.txt");

  assert.match(result.parserConfidence, /^(medium|high)$/);
  assert.equal(result.totalPlannedCredits, 122);
  assert.equal(result.courseStatusCounts.unknown, 0);
  assert.ok(result.courseStatusCounts.planned >= 10);
});

test("transfer and AP fixture surfaces credit signals and statuses", async () => {
  const result = await analyzeFixture("transfer-ap-credit-sample.txt");

  assert.equal(result.detectedSignals.hasTransferCreditSignal, true);
  assert.equal(result.detectedSignals.hasApCreditSignal, true);
  assert.ok(result.courseStatusCounts.transfer_or_ap >= 6);
  assert.ok(result.parserWarnings.some((warning) => warning.includes("advisor verification")));
});

test("in-progress fixture preserves enrollment statuses", async () => {
  const result = await analyzeFixture("in-progress-courses-sample.txt");

  assert.equal(result.detectedSignals.hasInProgressSignal, true);
  assert.equal(result.courseStatusCounts.in_progress, 4);
});

test("substitution and exception fixture remains conservative", async () => {
  const result = await analyzeFixture("substitution-exception-sample.txt");

  assert.equal(result.detectedSignals.hasSubstitutionSignal, true);
  assert.equal(result.detectedSignals.hasExceptionSignal, true);
  assert.ok(result.courseStatusCounts.substituted_or_waived >= 2);
  assert.equal(result.softwareEngineeringCheck.advisorVerificationRequired, true);
});

test("waived requirement fixture requires advisor review without claiming completion", async () => {
  const result = await analyzeFixture("waived-requirement-sample.txt");

  assert.equal(result.detectedSignals.hasExceptionSignal, true);
  assert.ok(result.courseStatusCounts.substituted_or_waived >= 1);
  assert.equal(result.softwareEngineeringCheck.isLikelyComplete, false);
  assert.equal(result.softwareEngineeringCheck.advisorVerificationRequired, true);
  assert.ok(result.parserWarnings.some((warning) => /waiver|exception/i.test(warning)));
});

test("low-quality fixture returns insufficient-data safeguards", async () => {
  const result = await analyzeFixture("low-text-quality-sample.txt");

  assert.equal(result.parserConfidence, "low");
  assert.equal(result.detectedSignals.hasInsufficientTextSignal, true);
  assert.equal(result.totalPlannedCredits, null);
  assert.equal(result.gapReport.overallStatus, "insufficient_data");
  assert.ok(result.parserWarnings.some((warning) => warning.includes("very few course codes")));
});

test("mixed fixture respects explicit Software Engineering target", async () => {
  const result = await analyzeFixture(
    "mixed-csse-plan-sample.txt",
    "software_engineering",
  );

  assert.equal(result.selectedTargetPath, "software_engineering");
  assert.equal(result.nextSemesterSuggestions.targetPath, "software_engineering");
  assert.ok(
    !result.nextSemesterSuggestions.suggestedCourses.some(
      (course) => course.code === "COMP 4200",
    ),
  );
});

test("mixed fixture allows Computer Science-specific missing courses", async () => {
  const result = await analyzeFixture(
    "mixed-csse-plan-sample.txt",
    "computer_science",
  );

  assert.equal(result.nextSemesterSuggestions.targetPath, "computer_science");
  assert.ok(
    result.nextSemesterSuggestions.suggestedCourses.some(
      (course) => course.code === "COMP 4200",
    ),
  );
});

test("mixed fixture keeps AI target focused on certificate requirements", async () => {
  const result = await analyzeFixture(
    "mixed-csse-plan-sample.txt",
    "ai_certificate",
  );

  assert.equal(result.nextSemesterSuggestions.targetPath, "ai_certificate");
  assert.ok(
    result.nextSemesterSuggestions.suggestedCourses.every(
      (course) =>
        course.category === "certificate_requirement" ||
        course.category === "advisor_review",
    ),
  );
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { analyzeCurrentDegreeAuditText } from "../src/lib/plan/current-degree-audit-analysis.ts";
import {
  buildCurrentStateGapReport,
  buildCurrentStateNextSteps,
} from "../src/lib/plan/current-state-next-steps.ts";
import { comparePlannedPathToCurrentProgress } from "../src/lib/plan/planned-path-coverage.ts";
import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";

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

test("parses worksheet credits, degree status, blocks, and still-needed courses", async () => {
  const analysis = await analyzeFixture("worksheet-current-audit-sample.txt");

  assert.equal(analysis.documentType, "worksheet_audit");
  assert.equal(analysis.creditsRequired, 122);
  assert.equal(analysis.creditsApplied, 96);
  assert.equal(analysis.creditsNeeded, 26);
  assert.equal(analysis.degreeStatus, "incomplete");
  assert.ok(analysis.completedCourseCodes.includes("COMP 1210"));
  assert.ok(analysis.stillNeededCourseCodes.includes("COMP 3220"));
  assert.ok(analysis.stillNeededCourseCodes.includes("ELEC 2200"));
  assert.ok(
    analysis.requirementBlocks.some(
      (block) =>
        block.status === "incomplete" &&
        block.stillNeededText.some((item) => item.includes("COMP 3220")),
    ),
  );
});

test("extracts preregistered courses without treating them as new suggestions", async () => {
  const analysis = await analyzeFixture("worksheet-preregistered-sample.txt");
  const nextSteps = buildCurrentStateNextSteps({
    audit: analysis,
    aiCertificateCheck: checkAiEngineeringCertificate(
      analysis.currentApplicableCourseCodes,
    ),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    targetPath: "software_engineering",
  });

  assert.ok(analysis.preregisteredCourseCodes.includes("COMP 3220"));
  assert.ok(
    nextSteps.verificationItems.some(
      (item) => item.code === "COMP 3220" && item.status === "preregistered",
    ),
  );
  assert.ok(
    !nextSteps.suggestedCourses.some((course) => course.code === "COMP 3220"),
  );
  assert.ok(
    nextSteps.notYetRecommended.some(
      (course) =>
        course.code === "COMP 3220" &&
        course.reason.includes("verify registration/completion"),
    ),
  );
});

test("extracts AP/transfer and fall-through status evidence", async () => {
  const analysis = await analyzeFixture("worksheet-transfer-ap-sample.txt");
  const gapReport = buildCurrentStateGapReport({ audit: analysis });

  assert.equal(analysis.externalCreditCounts.advanced_placement, 3);
  assert.equal(analysis.externalCreditCounts.transfer, 4);
  assert.ok(
    analysis.externalCreditRecords.some(
      (record) =>
        record.displayName === "AP Statistics" &&
        record.sourceCode === "AP9002" &&
        record.satisfiesCourseCode === "STAT 2510",
    ),
  );
  assert.ok(
    analysis.externalCreditRecords.some(
      (record) =>
        record.displayName === "ENG101 Written Composition I" &&
        record.institution === "Jefferson State CC" &&
        record.satisfiesCourseCode === "ENGL 1100",
    ),
  );
  assert.ok(
    analysis.externalCreditRecords.some(
      (record) =>
        record.sourceCode === "AP3201" &&
        record.displayName === "AP Computer Science Principles" &&
        record.satisfiesCourseCode === "COMP 2000",
    ),
  );
  assert.ok(analysis.transferOrApCourseCodes.includes("MATH 1610"));
  assert.ok(analysis.transferOrApCourseCodes.includes("STAT 2510"));
  assert.ok(analysis.transferOrApCourseCodes.includes("ENGL 1100"));
  assert.ok(analysis.transferOrApCourseCodes.includes("ENGL 1120"));
  assert.ok(analysis.transferOrApCourseCodes.includes("HIST 2010"));
  assert.ok(analysis.transferOrApCourseCodes.includes("HIST 2020"));
  assert.ok(!analysis.transferOrApCourseCodes.includes("AP 9002"));
  assert.ok(analysis.nonDegreeApplicableCourseCodes.includes("COMP 2000"));
  assert.ok(analysis.nonDegreeApplicableCourseCodes.includes("AP 3201"));
  assert.ok(analysis.nonDegreeApplicableCourseCodes.includes("HIST 1010"));
  assert.ok(analysis.nonDegreeApplicableCourseCodes.includes("MUSI 2000"));
  assert.ok(
    gapReport.advisorReviewItems.some((item) =>
      item.includes("AP Computer Science Principles appears in Fall Through"),
    ),
  );
  assert.ok(
    gapReport.advisorReviewItems.some((item) =>
      item.includes("non-degree-applicable"),
    ),
  );
});

test("keeps low-quality worksheet text low confidence", async () => {
  const analysis = await analyzeFixture("worksheet-low-confidence-sample.txt");

  assert.equal(analysis.confidence, "low");
  assert.equal(analysis.creditsRequired, null);
  assert.equal(analysis.degreeStatus, "unknown");
  assert.ok(analysis.parserWarnings.length > 0);
});

test("current-state suggestions exclude completed courses", async () => {
  const analysis = await analyzeFixture("worksheet-current-audit-sample.txt");
  const nextSteps = buildCurrentStateNextSteps({
    audit: analysis,
    aiCertificateCheck: checkAiEngineeringCertificate(
      analysis.currentApplicableCourseCodes,
    ),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    targetPath: "software_engineering",
  });

  assert.ok(!nextSteps.suggestedCourses.some((course) => course.code === "COMP 1210"));
  assert.ok(nextSteps.suggestedCourses.some((course) => course.code === "ELEC 2200"));
});

test("detects a non-CSSE program and parses universal still-needed items", async () => {
  const analysis = await analyzeFixture("worksheet-business-audit-sample.txt");

  assert.equal(analysis.detectedProgram.program, "BSBA Business Administration");
  assert.equal(analysis.detectedProgram.programKey, "unknown");
  assert.equal(analysis.detectedProgram.catalogYear, "2025-2026");
  assert.ok(
    analysis.stillNeededItems.some(
      (item) =>
        item.requirementType === "course_options" &&
        item.courseOptions.includes("PHIL 1110") &&
        item.courseOptions.includes("PHIL 1020") &&
        item.courseOptions.includes("PHIL 1027"),
    ),
  );
  assert.ok(
    analysis.stillNeededItems.some(
      (item) =>
        item.requirementType === "credit_hours_from_list" &&
        item.courseOptions.includes("FINC 3610") &&
        item.courseOptions.includes("MNGT 3100"),
    ),
  );
  assert.ok(
    analysis.stillNeededItems.some(
      (item) => item.requirementType === "graduation_milestone",
    ),
  );
  assert.ok(
    analysis.stillNeededItems.some(
      (item) => item.requirementType === "block_reference",
    ),
  );
});

test("parses non-CSSE engineering and liberal arts worksheet fixtures", async () => {
  const engineering = await analyzeFixture("worksheet-engineering-audit-sample.txt");
  const liberalArts = await analyzeFixture("worksheet-liberal-arts-audit-sample.txt");

  assert.equal(engineering.detectedProgram.program, "BCIV Civil Engineering");
  assert.ok(
    engineering.stillNeededItems.some((item) =>
      item.courseOptions.includes("CIVL 3110"),
    ),
  );
  assert.ok(
    engineering.stillNeededItems.some(
      (item) => item.requirementType === "credit_hours_from_list",
    ),
  );
  assert.equal(liberalArts.detectedProgram.major, "Political Science - POLI");
  assert.ok(
    liberalArts.stillNeededItems.some((item) =>
      item.courseOptions.includes("POLI 3000"),
    ),
  );
  assert.ok(
    liberalArts.stillNeededItems.some(
      (item) => item.requirementType === "block_reference",
    ),
  );
});

test("builds Degree Works-native suggestions for a non-CSSE worksheet without catalog rules", async () => {
  const analysis = await analyzeFixture("worksheet-business-audit-sample.txt");
  const nextSteps = buildCurrentStateNextSteps({
    audit: analysis,
    aiCertificateCheck: checkAiEngineeringCertificate(
      analysis.currentApplicableCourseCodes,
    ),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes: analysis.currentApplicableCourseCodes,
      totalPlannedCredits: analysis.creditsApplied ?? null,
    }),
    targetPath: "degreeworks_only",
  });

  assert.equal(nextSteps.targetPath, "degreeworks_only");
  assert.ok(
    nextSteps.suggestedCourses.some((course) => course.code === "ACCT 2110"),
  );
  assert.ok(
    nextSteps.suggestedCourses.some(
      (course) =>
        course.source === "still_needed_options" &&
        course.code.includes("PHIL 1110"),
    ),
  );
  assert.ok(
    !nextSteps.suggestedCourses.some((course) => course.code === "MKTG 3310"),
  );
  assert.ok(
    nextSteps.notYetRecommended.some((course) => course.code === "MKTG 3310"),
  );
  assert.ok(nextSteps.advisorMilestones.length > 0);
  assert.ok(
    nextSteps.notes.some((note) => note.includes("credit-hour option list")),
  );
});

test("compares planned path coverage against current audit still-needed items", async () => {
  const analysis = await analyzeFixture("worksheet-business-audit-sample.txt");
  const coverage = comparePlannedPathToCurrentProgress({
    currentAudit: analysis,
    plannedCourseCodes: ["ACCT 2110", "PHIL 1020", "FREE 9999"],
  });

  assert.ok(
    coverage.coveredStillNeededItems.some(
      (item) =>
        item.requirementLabel === "ACCT 2110" &&
        item.matchedCourses.includes("ACCT 2110"),
    ),
  );
  assert.ok(
    coverage.coveredStillNeededItems.some((item) =>
      item.matchedCourses.includes("PHIL 1020"),
    ),
  );
  assert.ok(
    coverage.partiallyCoveredStillNeededItems.some(
      (item) => item.requirementLabel === "MKTG 3310",
    ),
  );
  assert.ok(
    coverage.advisorReviewItems.some((item) =>
      item.includes("credit-hour option list"),
    ),
  );
  assert.ok(coverage.plannedButUnmatchedCourses.includes("FREE 9999"));
});

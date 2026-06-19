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

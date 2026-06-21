import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { analyzeCurrentDegreeAuditText } from "../src/lib/plan/current-degree-audit-analysis.ts";
import {
  buildCurrentProgressAdvisorSummary,
  buildCurrentStateGapReport,
  buildCurrentStateNextSteps,
} from "../src/lib/plan/current-state-next-steps.ts";
import { comparePlannedPathToCurrentProgress } from "../src/lib/plan/planned-path-coverage.ts";

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
});

test("current-state suggestions use only Degree Works still-needed evidence", async () => {
  const analysis = await analyzeFixture("worksheet-current-audit-sample.txt");
  const nextSteps = buildCurrentStateNextSteps({ audit: analysis });

  assert.equal(nextSteps.targetPath, "degreeworks_native");
  assert.ok(!nextSteps.suggestedCourses.some((course) => course.code === "COMP 1210"));
  assert.ok(nextSteps.suggestedCourses.some((course) => course.code === "ELEC 2200"));
  assert.ok(nextSteps.suggestedCourses.length <= 5);
  assert.ok(
    nextSteps.notes.some((note) =>
      note.includes("Requirements are not added"),
    ),
  );
});

test("extracts preregistered courses without treating them as new suggestions", async () => {
  const analysis = await analyzeFixture("worksheet-preregistered-sample.txt");
  const nextSteps = buildCurrentStateNextSteps({ audit: analysis });

  assert.ok(analysis.preregisteredCourseCodes.includes("COMP 3220"));
  assert.ok(
    nextSteps.verificationItems.some(
      (item) => item.code === "COMP 3220" && item.status === "preregistered",
    ),
  );
  assert.ok(
    !nextSteps.suggestedCourses.some((course) => course.code === "COMP 3220"),
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
        record.sourceCode === "AP3201" &&
        record.displayName === "AP Computer Science Principles" &&
        record.satisfiesCourseCode === "COMP 2000",
    ),
  );
  assert.ok(analysis.nonDegreeApplicableCourseCodes.includes("COMP 2000"));
  assert.ok(
    gapReport.advisorReviewItems.some((item) =>
      item.includes("AP Computer Science Principles appears in Fall Through"),
    ),
  );
});

test("detects varied programs and parses universal still-needed items", async () => {
  const business = await analyzeFixture("worksheet-business-audit-sample.txt");
  const engineering = await analyzeFixture("worksheet-engineering-audit-sample.txt");
  const liberalArts = await analyzeFixture("worksheet-liberal-arts-audit-sample.txt");

  assert.equal(business.detectedProgram.program, "BSBA Business Administration");
  assert.equal(engineering.detectedProgram.program, "BCIV Civil Engineering");
  assert.equal(liberalArts.detectedProgram.major, "Political Science - POLI");
  assert.ok(
    business.stillNeededItems.some((item) =>
      item.courseOptions.includes("ACCT 2110"),
    ),
  );
  assert.ok(
    engineering.stillNeededItems.some((item) =>
      item.courseOptions.includes("CIVL 3110"),
    ),
  );
});

test("advisor summary is concise and Degree Works-native", async () => {
  const audit = await analyzeFixture("worksheet-business-audit-sample.txt");
  const gapReport = buildCurrentStateGapReport({ audit });
  const nextSteps = buildCurrentStateNextSteps({ audit });
  const summary = buildCurrentProgressAdvisorSummary({
    audit,
    gapReport,
    nextSteps,
  });

  assert.match(summary, /^Advisor Meeting Summary/);
  assert.match(summary, /not an official degree audit/);
  assert.match(summary, /Program detected from Degree Works/);
  assert.match(summary, /Courses to discuss with an advisor/);
  assert.ok(summary.length < 1400);
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
  assert.ok(coverage.plannedButUnmatchedCourses.includes("FREE 9999"));
});

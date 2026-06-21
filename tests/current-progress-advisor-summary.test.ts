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
import {
  formatStillNeededItemForDisplay,
  parseDegreeWorksStillNeededItem,
} from "../src/lib/plan/degreeworks-still-needed.ts";
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

function buildNextSteps(audit: Awaited<ReturnType<typeof analyzeFixture>>) {
  return buildCurrentStateNextSteps({
    audit,
    aiCertificateCheck: checkAiEngineeringCertificate(
      audit.currentApplicableCourseCodes,
    ),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes: audit.currentApplicableCourseCodes,
      totalPlannedCredits: audit.creditsApplied ?? null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes: audit.currentApplicableCourseCodes,
      totalPlannedCredits: audit.creditsApplied ?? null,
    }),
    targetPath: "degreeworks_only",
  });
}

test("current-progress advisor summary is concise and student-useful", async () => {
  const audit = await analyzeFixture("worksheet-preregistered-sample.txt");
  const gapReport = buildCurrentStateGapReport({ audit });
  const nextSteps = buildNextSteps(audit);
  const summary = buildCurrentProgressAdvisorSummary({
    audit,
    gapReport,
    nextSteps,
  });

  assert.match(summary, /^Advisor Meeting Summary/);
  assert.match(summary, /Current standing:/);
  assert.match(summary, /- Degree status: Incomplete/);
  assert.match(summary, /- Credits: 83 applied \/ 122 required \/ 39 remaining/);
  assert.match(summary, /- Audit confidence: High/);
  assert.match(summary, /Main items to discuss:/);
  assert.match(summary, /Courses already preregistered:/);
  assert.match(summary, /Questions for my advisor:/);
  assert.doesNotMatch(summary, /Still needed option sets to discuss/);
  assert.doesNotMatch(summary, /appears to be a Degree Works milestone or nonstandard requirement/);
  assert.ok(summary.length < 1400);
});

test("current-progress summary caps preregistered courses and deduplicates questions", async () => {
  const audit = await analyzeFixture("worksheet-preregistered-sample.txt");
  const expandedAudit = {
    ...audit,
    preregisteredCourseCodes: [
      "COMP 2710",
      "COMP 2800",
      "COMP 3270",
      "COMP 3350",
      "STAT 3010",
      "STAT 3600",
      "COMP 4300",
      "COMP 4320",
    ],
  };
  const gapReport = buildCurrentStateGapReport({ audit: expandedAudit });
  const nextSteps = {
    ...buildNextSteps(expandedAudit),
    advisorQuestions: [
      "Which remaining requirements should I prioritize next semester?",
      "Which remaining requirements should I prioritize next semester?",
      "Is the next-semester load reasonable?",
    ],
  };
  const summary = buildCurrentProgressAdvisorSummary({
    audit: expandedAudit,
    gapReport,
    nextSteps,
  });
  const preregisteredLines = summary
    .split("Courses already preregistered:\n")[1]
    .split("\n\n")[0]
    .split("\n")
    .filter((line) => line.startsWith("- "));
  const questionLines = summary
    .split("Questions for my advisor:\n")[1]
    .split("\n")
    .filter((line) => line.startsWith("- "));

  assert.equal(preregisteredLines.length, 6);
  assert.match(summary, /\+2 more items in the detailed report/);
  assert.equal(new Set(questionLines).size, questionLines.length);
  assert.ok(questionLines.length <= 6);
});

test("AP transfer and Fall Through verification is mentioned once", async () => {
  const audit = await analyzeFixture("worksheet-transfer-ap-sample.txt");
  const gapReport = buildCurrentStateGapReport({ audit });
  const nextSteps = buildNextSteps(audit);
  const summary = buildCurrentProgressAdvisorSummary({
    audit,
    gapReport,
    nextSteps,
  });
  const matches = summary.match(/AP\/transfer and Fall Through/g) ?? [];

  assert.equal(matches.length, 1);
  assert.doesNotMatch(summary, /AP Statistics: verify STAT 2510/);
});

test("still-needed option text does not over-capture unrelated course rows", () => {
  const item = parseDegreeWorksStillNeededItem({
    blockName: "Major Requirements",
    neededText:
      "Still needed: COMP 3220 or COMP 3270 or COMP 3350: 3 Credits in COMP 3220 Introduction to Algorithms COMP 3270 Software Construction COMP 3350 Computer Organization",
  });

  assert.equal(item.neededText, "COMP 3220 or COMP 3270 or COMP 3350");
  assert.deepEqual(item.courseOptions, ["COMP 3220", "COMP 3270", "COMP 3350"]);
  assert.equal(
    formatStillNeededItemForDisplay(item),
    "Choose one from: COMP 3220, COMP 3270, COMP 3350",
  );
  assert.doesNotMatch(formatStillNeededItemForDisplay(item), /Introduction to Algorithms/);
});

test("milestones render as short labels", () => {
  const graduation = parseDegreeWorksStillNeededItem({
    blockName: "University Requirements",
    neededText:
      "Still needed: 1 Class in UNIV 4AA0 Graduation Check huge nearby Degree Works text that should not appear",
  });
  const assessment = parseDegreeWorksStillNeededItem({
    blockName: "Program Requirements",
    neededText:
      "Still needed: 0 Credits in COMP 4810 Program Assessment with adjacent audit block text",
  });

  assert.equal(graduation.requirementLabel, "UNIV 4AA0 graduation requirement");
  assert.equal(formatStillNeededItemForDisplay(graduation), "UNIV 4AA0 graduation requirement");
  assert.equal(assessment.requirementLabel, "COMP 4810 program assessment");
  assert.equal(formatStillNeededItemForDisplay(assessment), "COMP 4810 program assessment");
});

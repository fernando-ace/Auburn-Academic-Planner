import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorMeetingSummary } from "../src/lib/plan/advisor-meeting-summary.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "../src/lib/samples/degreeworks-plan-sample.ts";

test("builds concise planned-path advisor summary", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const softwareEngineeringResult = {
    ...checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    planDescription: "Degree Works sample Software Engineering plan",
    major: "Software Engineering",
    parserConfidence: "high" as const,
  };
  const computerScienceResult = {
    ...checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    planDescription: "Degree Works sample Computer Science plan",
    major: "Computer Science",
    parserConfidence: "high" as const,
  };

  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult,
    computerScienceResult,
    selectedTargetPath: "software_engineering",
  });

  assert.match(summary, /^Advisor Meeting Summary/);
  assert.match(summary, /Planned path review:/);
  assert.match(summary, /- Target: Software Engineering/);
  assert.match(summary, /- Parser confidence: High/);
  assert.match(summary, /- Plan credits: 122/);
  assert.match(summary, /Top items to review:\n1\. Missing or unmatched requirements\./);
  assert.match(summary, /Questions for my advisor:/);
  assert.doesNotMatch(summary, /Top missing items:/);
  assert.doesNotMatch(summary, /Core Science Sequence: advisor_review/);
  assert.ok(summary.split("\n").length <= 26);
});

test("planned-path summary caps suggested courses and avoids course reason dumps", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    nextSemesterSuggestions: {
      targetPath: "computer_science",
      confidence: "medium",
      suggestedCourses: Array.from({ length: 8 }, (_, index) => ({
        code: `COMP ${3000 + index}`,
        title: `Course ${index + 1}`,
        reason:
          "This long deterministic explanation should stay in the detailed report, not in the copyable summary.",
        category: "missing_required",
        priority: "high",
        advisorVerificationRequired: true,
      })),
      notYetRecommended: [],
      advisorQuestions: [
        "Does this planned path satisfy my Degree Works requirements?",
        "Does this planned path satisfy my Degree Works requirements?",
      ],
      notes: [],
    },
  });
  const suggestedLines = summary
    .split("\n")
    .filter((line) => line.startsWith("- COMP "));
  const questionLines = summary
    .split("Questions for my advisor:\n")[1]
    .split("\n")
    .filter((line) => line.startsWith("- "));

  assert.equal(suggestedLines.length, 6);
  assert.doesNotMatch(summary, /\+\d+ more items in the detailed report/);
  assert.equal(questionLines.length, 4);
  assert.ok(questionLines.length <= 5);
  assert.doesNotMatch(summary, /long deterministic explanation/);
});

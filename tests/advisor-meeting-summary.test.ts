import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorMeetingSummary } from "../src/lib/plan/advisor-meeting-summary.ts";
import { buildCustomAiCertificatePlanCheck } from "../src/lib/plan/ai-certificate-plan-check.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "../src/lib/samples/degreeworks-plan-sample.ts";

test("builds advisor summary for AI certificate result only", () => {
  const aiResult = buildCustomAiCertificatePlanCheck({
    courseCodes: ["COMP 5600", "COMP 5630", "COMP 5610"],
    planDescription: "Partial AI certificate plan",
    major: "Software Engineering",
    totalPlannedCredits: null,
  });

  const summary = buildAdvisorMeetingSummary({
    aiResult,
    softwareEngineeringResult: null,
  });

  assert.match(summary, /Selected target path: AI Engineering certificate/);
  assert.match(summary, /Top missing items:\n- COMP 5130/);
  assert.doesNotMatch(summary, /Required courses satisfied:/);
  assert.match(
    summary,
    /This is a preparation summary, not an official degree audit/,
  );
});

test("builds advisor summary for Software Engineering result only", () => {
  const softwareEngineeringResult = {
    ...checkSoftwareEngineeringDegree({
      courseCodes: getDegreeWorksPlanSampleCourseCodes(),
      totalPlannedCredits: 122,
    }),
    planDescription: "Degree Works sample Software Engineering plan",
    major: "Software Engineering",
  };

  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult,
  });

  assert.match(summary, /Selected target path: Software Engineering/);
  assert.match(summary, /Top missing items:/);
  assert.match(summary, /ENGL 1100/);
  assert.doesNotMatch(summary, /Structured requirement blocks:/);
});

test("builds advisor summary for Computer Science result only", () => {
  const computerScienceResult = {
    ...checkComputerScienceDegree({
      courseCodes: getDegreeWorksPlanSampleCourseCodes(),
      totalPlannedCredits: 122,
    }),
    planDescription: "Degree Works sample Computer Science plan",
    major: "Computer Science",
  };

  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    computerScienceResult,
  });

  assert.match(summary, /Selected target path: Computer Science/);
  assert.match(summary, /COMP 4200/);
  assert.doesNotMatch(summary, /Alternative course groups:/);
  assert.doesNotMatch(summary, /Structured requirement blocks:/);
});

test("builds advisor summary for combined Degree Works result", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const detectedSignals = {
    hasTransferCreditSignal: true,
    hasApCreditSignal: true,
    hasInProgressSignal: true,
    hasSubstitutionSignal: true,
    hasExceptionSignal: true,
    hasInsufficientTextSignal: false,
  };
  const parserWarnings = [
    "Possible AP, AICE, IB, or Advanced Placement credit was detected and needs advisor verification.",
    "Possible transfer credit was detected and needs advisor verification.",
  ];
  const courseStatusCounts = {
    completed: 1,
    in_progress: 2,
    planned: 40,
    transfer_or_ap: 1,
    substituted_or_waived: 1,
    missing: 0,
    unknown: 0,
  };
  const aiResult = {
    ...buildCustomAiCertificatePlanCheck({
      courseCodes,
      planDescription: "Combined Degree Works PDF analysis",
      major: "Software Engineering",
      totalPlannedCredits: 122,
    }),
    sourceFileName: "degreeworks-plan-sample.pdf",
    parsedCourseCodes: courseCodes,
    parsedCourseCount: courseCodes.length,
    detectedSignals,
    courseStatusCounts,
    parserWarnings,
    parserConfidence: "medium" as const,
  };
  const softwareEngineeringResult = {
    ...checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    planDescription: "Combined Degree Works PDF analysis",
    major: "Software Engineering",
    sourceFileName: "degreeworks-plan-sample.pdf",
    parsedCourseCodes: courseCodes,
    parsedCourseCount: courseCodes.length,
    detectedSignals,
    courseStatusCounts,
    parserWarnings,
    parserConfidence: "medium" as const,
  };
  const computerScienceResult = {
    ...checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    planDescription: "Combined Degree Works PDF analysis",
    major: "Computer Science",
    sourceFileName: "degreeworks-plan-sample.pdf",
    parsedCourseCodes: courseCodes,
    parsedCourseCount: courseCodes.length,
    detectedSignals,
    courseStatusCounts,
    parserWarnings,
    parserConfidence: "medium" as const,
  };

  const summary = buildAdvisorMeetingSummary({
    aiResult,
    softwareEngineeringResult,
    computerScienceResult,
  });

  assert.match(summary, /Parser confidence: medium/);
  assert.match(summary, /Course status summary: completed 1; in progress 2/);
  assert.match(summary, /Questions to ask an advisor:/);
  assert.match(summary, /Do AP, transfer, substitutions, exceptions, or in-progress courses/);
  assert.doesNotMatch(summary, /Parser warnings:/);
});

test("builds advisor summary with prerequisite analysis questions", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    prerequisiteCheck: {
      checkedCourseCount: 3,
      semesterConfidence: "high",
      isLikelySequenceValid: false,
      advisorReviewItems: [
        "Verify senior standing and any approvals for Senior Design Project.",
      ],
      prerequisiteIssues: [
        {
          courseCode: "COMP 3270",
          termLabel: "Fall 2025",
          missingPrerequisites: ["COMP 2210"],
          severity: "warning",
          message:
            "COMP 3270 appears before or in the same term as modeled prerequisite COMP 2210.",
        },
      ],
      notes: [
        "This local preliminary prerequisite model requires advisor verification.",
      ],
    },
  });

  assert.match(
    summary,
    /Can you verify that my planned course order satisfies prerequisites\?/,
  );
  assert.doesNotMatch(summary, /COMP 3270 appears before/);
});

test("builds concise advisor summary gap report section", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    gapReport: {
      overallStatus: "missing_requirements",
      bestFitPath: "ai_certificate",
      summaryBullets: [
        "The AI Engineering certificate appears likely complete in the uploaded plan.",
      ],
      satisfiedHighlights: [
        "AI Engineering certificate looks likely complete, pending advisor verification.",
      ],
      missingRequirements: [
        {
          area: "Software Engineering",
          items: [
            "ENGL 1100 - English Composition I",
            "ENGL 1120 - English Composition II",
            "ENGR 1100 - Engineering Orientation",
            "ELEC 2200 - Digital Logic Circuits",
          ],
          severity: "warning",
        },
        {
          area: "Computer Science",
          items: ["COMP 4200 - Formal Languages"],
          severity: "warning",
        },
      ],
      advisorReviewItems: [
        "Transfer credit may affect this check.",
      ],
      nextActions: [
        "Bring this report and the official Degree Works audit to an academic advisor.",
        "Review the top missing requirements before choosing next-term courses.",
      ],
      advisorQuestions: [
        "Which missing or unmatched requirements should I prioritize next?",
        "Which program or certificate path does this plan most closely support?",
      ],
    },
  });

  assert.match(summary, /Selected target path: AI Engineering certificate/);
  assert.match(summary, /Top missing items:/);
  assert.match(summary, /Software Engineering: ENGL 1100/);
  assert.match(summary, /Top next actions:/);
  assert.ok(summary.split("\n").length < 30);
});

test("builds advisor summary with next semester suggestions", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    nextSemesterSuggestions: {
      targetPath: "software_engineering",
      confidence: "high",
      suggestedCourses: [
        {
          code: "ENGL 1100",
          title: "English Composition I",
          reason:
            "ENGL 1100 is a missing exact required Software Engineering course in the local deterministic check.",
          category: "missing_required",
          priority: "high",
          advisorVerificationRequired: true,
        },
      ],
      notYetRecommended: [
        {
          code: "COMP 3270",
          reason:
            "COMP 3270 should wait until modeled prerequisites are completed or verified by an advisor.",
        },
      ],
      advisorQuestions: [
        "Which of these courses are actually available next semester?",
        "Would this set create a reasonable semester load?",
      ],
      notes: [
        "This is not registration advice or an official schedule.",
      ],
    },
  });

  assert.match(summary, /Selected target path: Software Engineering/);
  assert.match(summary, /Top suggested courses:/);
  assert.match(summary, /ENGL 1100/);
  assert.doesNotMatch(summary, /Not yet recommended:/);
  assert.match(
    summary,
    /Which suggested courses are actually offered in the target term, and are any restricted by standing, approvals, or department scheduling\?/,
  );
});

test("builds a concise advisor summary with draft semester plan details", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    draftSemesterPlan: {
      targetPath: "computer_science",
      confidence: "medium",
      semesters: [
        {
          label: "Next Semester",
          plannedCourses: [
            {
              code: "COMP 4200",
              title: "Formal Languages",
              creditHours: 3,
              reason: "Exact missing Computer Science requirement.",
              advisorVerificationRequired: true,
              availabilityConfidence: "unknown_requires_advisor_review",
              availabilityNotes: ["Verify the target-term offering."],
              planningNotes: [],
            },
          ],
          estimatedCredits: 3,
          notes: [],
        },
        {
          label: "Semester 2",
          plannedCourses: [
            {
              code: "ENGL 1100",
              creditHours: 3,
              reason: "Exact missing requirement.",
              advisorVerificationRequired: true,
              availabilityConfidence: "unknown_requires_advisor_review",
              availabilityNotes: ["Verify the target-term offering."],
              planningNotes: [],
            },
          ],
          estimatedCredits: 3,
          notes: [],
        },
      ],
      unplacedCourses: [
        { code: "COMP 3270", reason: "Modeled prerequisites need review." },
      ],
      advisorReviewItems: [],
      notes: [],
    },
  });

  assert.match(summary, /Selected target path: Computer Science/);
  assert.match(summary, /First draft semester \(3 estimated credits\):\n- COMP 4200/);
  assert.doesNotMatch(summary, /Semester 2/);
  assert.doesNotMatch(summary, /Unplaced courses to review:/);
  assert.match(summary, /courses are actually offered/i);
  assert.match(summary, /semester load reasonable/i);
});

test("caps the concise summary and omits detailed requirement dumps", () => {
  const summary = buildAdvisorMeetingSummary({
    aiResult: null,
    softwareEngineeringResult: null,
    selectedTargetPath: "auto",
    gapReport: {
      overallStatus: "missing_requirements",
      bestFitPath: "computer_science",
      summaryBullets: [],
      satisfiedHighlights: [],
      missingRequirements: [
        {
          area: "Computer Science",
          items: ["A", "B", "C", "D", "E", "F"],
          severity: "warning",
        },
      ],
      advisorReviewItems: [],
      nextActions: ["One", "Two", "Three", "Four", "Five"],
      advisorQuestions: Array.from({ length: 10 }, (_, index) => `Question ${index + 1}?`),
    },
  });
  const missingLines = summary.split("\n").filter((line) => line.startsWith("- Computer Science:"));
  const questionSection = summary.split("Questions to ask an advisor:\n")[1];

  assert.match(summary, /Selected target path: Auto \(inferred: Computer Science\)/);
  assert.equal(missingLines.length, 5);
  assert.doesNotMatch(summary, /Computer Science: F/);
  assert.doesNotMatch(summary, /Structured requirement blocks:/);
  assert.equal(questionSection.split("\n").filter((line) => line.startsWith("- ")).length, 8);
  assert.match(questionSection, /Which suggested courses are actually offered/);
});

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

  assert.match(summary, /AI Engineering Certificate/);
  assert.match(summary, /Required courses satisfied: COMP 5600, COMP 5630/);
  assert.match(summary, /Required courses missing: COMP 5130/);
  assert.match(summary, /AI elective candidates found: COMP 5610/);
  assert.match(
    summary,
    /This is a preparation summary, not an official degree audit\./,
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

  assert.match(summary, /Software Engineering Degree Progress/);
  assert.match(summary, /Total planned credits: 122/);
  assert.match(summary, /Required credits: 122/);
  assert.match(
    summary,
    /Exact required courses missing: ENGL 1100, ENGL 1120, ENGR 1100, ELEC 2200/,
  );
  assert.match(summary, /Advisor-verified items that need review:/);
  assert.match(summary, /- Core Science Sequence \(8 credits\)/);
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

  assert.match(summary, /Computer Science Degree Progress/);
  assert.match(summary, /Total planned credits: 122/);
  assert.match(summary, /Required credits: 122/);
  assert.match(summary, /Computer Science total credits status/);
  assert.match(
    summary,
    /Exact required courses missing: ENGL 1100, ENGL 1120, ENGR 1100, ELEC 2200, COMP 4200/,
  );
  assert.match(summary, /Alternative course groups:/);
  assert.match(summary, /- Ethics requirement: satisfied/);
  assert.match(summary, /Advisor-verified items that need review:/);
  assert.match(summary, /- Technical Electives \(18 credits\)/);
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
    parserWarnings,
    parserConfidence: "medium" as const,
  };

  const summary = buildAdvisorMeetingSummary({
    aiResult,
    softwareEngineeringResult,
    computerScienceResult,
  });

  assert.match(summary, /AI Engineering Certificate/);
  assert.match(summary, /Software Engineering Degree Progress/);
  assert.match(summary, /Computer Science Degree Progress/);
  assert.match(summary, new RegExp(`Parsed course count: ${courseCodes.length}`));
  assert.match(summary, /Parser confidence: medium/);
  assert.match(summary, /Parser warnings:/);
  assert.match(summary, /Possible AP, AICE, IB, or Advanced Placement credit/);
  assert.match(summary, /Questions to ask an advisor:/);
  assert.match(summary, /AP, transfer, substitutions/);
  assert.match(summary, /electives, prerequisites, and semester ordering/);
  assert.match(
    summary,
    /Do AP, transfer, substitutions, or repeated courses change this progress check\?/,
  );
  assert.match(
    summary,
    /Can you verify whether AP, transfer, substitution, exception, or in-progress coursework changes this requirement check\?/,
  );
  assert.match(
    summary,
    /Which electives count toward the remaining Software Engineering, Computer Science, or certificate requirements\?/,
  );
  assert.match(
    summary,
    /Are prerequisites and semester ordering appropriate for the next registration plan\?/,
  );
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

  assert.match(summary, /Semester and Prerequisite Check/);
  assert.match(summary, /Modeled prerequisite sequence warnings found/);
  assert.match(
    summary,
    /COMP 3270 appears before or in the same term as modeled prerequisite COMP 2210/,
  );
  assert.match(
    summary,
    /Can you verify that my planned course order satisfies prerequisites\?/,
  );
  assert.match(
    summary,
    /Do any senior design, upper-level COMP, or elective courses require additional approvals or standing\?/,
  );
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

  assert.match(summary, /Gap Report and Next Actions/);
  assert.match(summary, /Overall status: missing_requirements/);
  assert.match(summary, /Best fit path: AI Engineering certificate/);
  assert.match(summary, /Top missing requirements:/);
  assert.match(summary, /Software Engineering: ENGL 1100/);
  assert.match(summary, /Next actions:/);
  assert.match(summary, /Gap report advisor questions:/);
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

  assert.match(summary, /Next Semester Suggestions/);
  assert.match(summary, /Target path: Software Engineering/);
  assert.match(summary, /Top suggested courses:/);
  assert.match(summary, /ENGL 1100/);
  assert.match(summary, /Not yet recommended:/);
  assert.match(summary, /COMP 3270/);
  assert.match(summary, /Next-semester advisor questions:/);
});

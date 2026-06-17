import assert from "node:assert/strict";
import test from "node:test";

import { buildGapReport } from "../src/lib/plan/gap-report.ts";
import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../src/lib/rules/software-engineering-prerequisites.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "../src/lib/samples/degreeworks-plan-sample.ts";

const noDetectedSignals = {
  hasTransferCreditSignal: false,
  hasApCreditSignal: false,
  hasInProgressSignal: false,
  hasSubstitutionSignal: false,
  hasExceptionSignal: false,
  hasInsufficientTextSignal: false,
};

test("reports AI certificate progress while degree paths have missing courses", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const report = buildGapReport({
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    detectedSignals: noDetectedSignals,
    parserWarnings: [],
    parserConfidence: "high",
    prerequisiteCheck: checkSoftwareEngineeringPrerequisites({ courseCodes }),
  });

  assert.equal(report.overallStatus, "missing_requirements");
  assert.equal(report.bestFitPath, "ai_certificate");
  assert.ok(
    report.satisfiedHighlights.some((highlight) =>
      highlight.includes("AI Engineering certificate looks likely complete"),
    ),
  );
  assert.ok(
    report.missingRequirements.some(
      (requirement) =>
        requirement.area === "Software Engineering" &&
        requirement.items.some((item) => item.includes("ENGL 1100")) &&
        requirement.items.some((item) => item.includes("ELEC 2200")),
    ),
  );
  assert.ok(
    report.missingRequirements.some(
      (requirement) =>
        requirement.area === "Computer Science" &&
        requirement.items.some((item) => item.includes("COMP 4200")),
    ),
  );
  assert.ok(
    report.missingRequirements.some(
      (requirement) =>
        requirement.area === "Software Engineering requirement blocks" &&
        requirement.severity === "advisor_review" &&
        requirement.items.some((item) => item.includes("Math Electives")) &&
        requirement.items.some((item) => item.includes("Technical Electives")),
    ),
  );
  assert.ok(
    report.advisorQuestions.some((question) =>
      question.includes("unresolved core, math elective, technical elective"),
    ),
  );
});

test("uses insufficient data status when parser confidence is low", () => {
  const courseCodes = ["COMP 5130", "COMP 5600", "COMP 5630", "COMP 5610"];
  const report = buildGapReport({
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    detectedSignals: {
      ...noDetectedSignals,
      hasInsufficientTextSignal: true,
    },
    parserWarnings: [
      "The extracted PDF text was short or produced very few course codes, so the parser may have missed Degree Works content.",
    ],
    parserConfidence: "low",
    prerequisiteCheck: checkSoftwareEngineeringPrerequisites({ courseCodes }),
  });

  assert.equal(report.overallStatus, "insufficient_data");
  assert.equal(report.bestFitPath, "mixed_or_unclear");
  assert.ok(
    report.summaryBullets.some((bullet) =>
      bullet.includes("parser had low confidence"),
    ),
  );
  assert.ok(
    report.nextActions.some((action) => action.includes("Re-upload")),
  );
});

test("turns prerequisite warnings into advisor review items and questions", () => {
  const courseCodes = ["COMP 3270"];
  const report = buildGapReport({
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    detectedSignals: noDetectedSignals,
    parserWarnings: [],
    parserConfidence: "medium",
    prerequisiteCheck: checkSoftwareEngineeringPrerequisites({ courseCodes }),
  });

  assert.ok(
    report.advisorReviewItems.some((item) =>
      item.includes("COMP 3270 is planned, but COMP 2210, COMP 2240"),
    ),
  );
  assert.ok(
    report.advisorQuestions.some((question) =>
      question.includes("planned course order satisfies prerequisites"),
    ),
  );
});

test("adds advisor review language for planned and transfer course statuses", () => {
  const courseCodes = ["COMP 5130", "COMP 5600", "COMP 5630", "COMP 5610"];
  const report = buildGapReport({
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    detectedSignals: noDetectedSignals,
    parserWarnings: [],
    parserConfidence: "medium",
    prerequisiteCheck: checkSoftwareEngineeringPrerequisites({ courseCodes }),
    courseStatusRecords: [
      {
        code: "COMP 5130",
        status: "planned",
        confidence: "medium",
      },
      {
        code: "COMP 5600",
        status: "transfer_or_ap",
        confidence: "high",
      },
    ],
  });

  assert.ok(
    report.advisorReviewItems.some((item) =>
      item.includes("COMP 5130 was found as planned"),
    ),
  );
  assert.ok(
    report.advisorReviewItems.some((item) =>
      item.includes("COMP 5600 was found with transfer/AP"),
    ),
  );
});

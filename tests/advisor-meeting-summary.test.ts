import assert from "node:assert/strict";
import test from "node:test";

import { buildAdvisorMeetingSummary } from "../src/lib/plan/advisor-meeting-summary.ts";
import { buildCustomAiCertificatePlanCheck } from "../src/lib/plan/ai-certificate-plan-check.ts";
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

  const summary = buildAdvisorMeetingSummary({
    aiResult,
    softwareEngineeringResult,
  });

  assert.match(summary, /AI Engineering Certificate/);
  assert.match(summary, /Software Engineering Degree Progress/);
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
    /Which electives count toward the remaining Software Engineering or certificate requirements\?/,
  );
  assert.match(
    summary,
    /Are prerequisites and semester ordering appropriate for the next registration plan\?/,
  );
});

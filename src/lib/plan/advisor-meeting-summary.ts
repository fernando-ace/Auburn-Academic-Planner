import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";

type AdvisorSummaryCourse = {
  code: string;
  title: string;
  creditHours: number;
  approvalStatus?: string;
};

export type AdvisorSummaryAiCertificateResult = {
  planDescription?: string;
  major?: string;
  totalPlannedCredits?: number | null;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  detectedSignals?: DegreeWorksDetectedSignals;
  parserWarnings?: string[];
  parserConfidence?: DegreeWorksParserConfidence;
  requiredCoursesSatisfied: AdvisorSummaryCourse[];
  requiredCoursesMissing: AdvisorSummaryCourse[];
  electiveCandidatesFound: AdvisorSummaryCourse[];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export type AdvisorSummaryVerifiedRequirement = {
  name: string;
  creditHoursRequired: number;
};

export type AdvisorSummarySoftwareEngineeringResult = {
  planDescription?: string;
  major?: string;
  program?: string;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  detectedSignals?: DegreeWorksDetectedSignals;
  parserWarnings?: string[];
  parserConfidence?: DegreeWorksParserConfidence;
  totalPlannedCredits: number | null;
  exactRequiredCoursesMissing: AdvisorSummaryCourse[];
  advisorVerifiedRequirements: AdvisorSummaryVerifiedRequirement[];
  totalHoursRequired: number;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

function formatCourseCodes(courses: AdvisorSummaryCourse[]) {
  return courses.length > 0
    ? courses.map((course) => course.code).join(", ")
    : "None found.";
}

function formatNullableCredits(totalPlannedCredits: number | null | undefined) {
  return typeof totalPlannedCredits === "number"
    ? `${totalPlannedCredits}`
    : "Not provided.";
}

function getPlanSourceDescription(
  result:
    | AdvisorSummaryAiCertificateResult
    | AdvisorSummarySoftwareEngineeringResult,
) {
  return (
    result.planDescription ??
    result.sourceFileName ??
    result.major ??
    "Plan source not provided."
  );
}

function hasAdvisorQuestionSignals(detectedSignals?: DegreeWorksDetectedSignals) {
  if (!detectedSignals) {
    return false;
  }

  return (
    detectedSignals.hasApCreditSignal ||
    detectedSignals.hasTransferCreditSignal ||
    detectedSignals.hasSubstitutionSignal ||
    detectedSignals.hasExceptionSignal ||
    detectedSignals.hasInProgressSignal
  );
}

function addParserDiagnostics(
  lines: string[],
  result:
    | AdvisorSummaryAiCertificateResult
    | AdvisorSummarySoftwareEngineeringResult,
) {
  if (result.parserConfidence) {
    lines.push(`Parser confidence: ${result.parserConfidence}`);
  }

  if (result.parserWarnings && result.parserWarnings.length > 0) {
    lines.push(
      "Parser warnings:",
      ...result.parserWarnings.map((warning) => `- ${warning}`),
    );
  }
}

export function buildAdvisorMeetingSummary({
  aiResult,
  softwareEngineeringResult,
}: {
  aiResult: AdvisorSummaryAiCertificateResult | null;
  softwareEngineeringResult: AdvisorSummarySoftwareEngineeringResult | null;
}) {
  if (!aiResult && !softwareEngineeringResult) {
    return "";
  }

  const lines = [
    "Advisor Meeting Summary",
    "",
    "This is a preparation summary, not an official degree audit.",
    "Advisor verification is required.",
    "AP, transfer, substitutions, hidden Degree Works sections, electives, prerequisites, and semester ordering may require advisor review.",
    "",
  ];

  if (aiResult) {
    lines.push(
      "AI Engineering Certificate",
      `Plan/source: ${getPlanSourceDescription(aiResult)}`,
    );

    if (typeof aiResult.parsedCourseCount === "number") {
      lines.push(`Parsed course count: ${aiResult.parsedCourseCount}`);
    }

    addParserDiagnostics(lines, aiResult);

    lines.push(
      `Total planned credits: ${formatNullableCredits(
        aiResult.totalPlannedCredits,
      )}`,
      `Required courses satisfied: ${formatCourseCodes(
        aiResult.requiredCoursesSatisfied,
      )}`,
      `Required courses missing: ${formatCourseCodes(
        aiResult.requiredCoursesMissing,
      )}`,
      `AI elective candidates found: ${formatCourseCodes(
        aiResult.electiveCandidatesFound,
      )}`,
      `Advisor verification required: ${
        aiResult.advisorVerificationRequired ? "Yes" : "No"
      }`,
      "",
    );
  }

  if (softwareEngineeringResult) {
    const creditStatus =
      softwareEngineeringResult.hasEnoughTotalCredits === null
        ? "Total planned credits were not provided."
        : softwareEngineeringResult.hasEnoughTotalCredits
          ? "Total planned credits meet or exceed the degree requirement."
          : "Total planned credits are below the degree requirement.";

    lines.push(
      "Software Engineering Degree Progress",
      `Plan/source: ${getPlanSourceDescription(softwareEngineeringResult)}`,
    );

    if (typeof softwareEngineeringResult.parsedCourseCount === "number") {
      lines.push(
        `Parsed course count: ${softwareEngineeringResult.parsedCourseCount}`,
      );
    }

    addParserDiagnostics(lines, softwareEngineeringResult);

    lines.push(
      `Total planned credits: ${formatNullableCredits(
        softwareEngineeringResult.totalPlannedCredits,
      )}`,
      `Required credits: ${softwareEngineeringResult.totalHoursRequired}`,
      `Software Engineering total credits status: ${creditStatus}`,
      `Exact required courses missing: ${formatCourseCodes(
        softwareEngineeringResult.exactRequiredCoursesMissing,
      )}`,
    );

    if (softwareEngineeringResult.advisorVerifiedRequirements.length > 0) {
      lines.push(
        "Advisor-verified items that need review:",
        ...softwareEngineeringResult.advisorVerifiedRequirements.map(
          (requirement) =>
            `- ${requirement.name} (${requirement.creditHoursRequired} credits)`,
        ),
      );
    }

    lines.push(
      `Advisor verification required: ${
        softwareEngineeringResult.advisorVerificationRequired ? "Yes" : "No"
      }`,
      "",
    );
  }

  const shouldAskParserSignalQuestion =
    hasAdvisorQuestionSignals(aiResult?.detectedSignals) ||
    hasAdvisorQuestionSignals(softwareEngineeringResult?.detectedSignals);
  const questions = [
    "- Which missing or unmatched requirements still need official Degree Works review?",
    "- Do AP, transfer, substitutions, or repeated courses change this progress check?",
    "- Which electives count toward the remaining Software Engineering or certificate requirements?",
    "- Are prerequisites and semester ordering appropriate for the next registration plan?",
  ];

  if (shouldAskParserSignalQuestion) {
    questions.splice(
      1,
      0,
      "- Can you verify whether AP, transfer, substitution, exception, or in-progress coursework changes this requirement check?",
    );
  }

  lines.push(
    "Questions to ask an advisor:",
    ...questions,
  );

  return lines.join("\n");
}

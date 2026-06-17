import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";
import type { GapReport } from "./gap-report.ts";
import { formatBestFitPath } from "./gap-report.ts";
import type { NextSemesterSuggestions } from "./next-semester-suggestions.ts";

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

export type AdvisorSummaryRequirementBlock = {
  blockName: string;
  status:
    | "satisfied"
    | "missing"
    | "partial"
    | "advisor_review"
    | "insufficient_data";
  satisfiedCourses: string[];
  missingCourses: string[];
  candidateCourses: string[];
  requiredCredits?: number;
  matchedCredits?: number;
  notes: string[];
};

export type AdvisorSummaryAlternativeCourseGroup = {
  name: string;
  minimumCoursesRequired: number;
  courses: AdvisorSummaryCourse[];
  satisfiedCourses: AdvisorSummaryCourse[];
  missingCourseOptions: AdvisorSummaryCourse[];
  isSatisfied: boolean;
};

export type AdvisorSummaryDegreeResult = {
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
  alternativeCourseGroups?: AdvisorSummaryAlternativeCourseGroup[];
  advisorVerifiedRequirements: AdvisorSummaryVerifiedRequirement[];
  requirementBlocks?: AdvisorSummaryRequirementBlock[];
  totalHoursRequired: number;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export type AdvisorSummarySoftwareEngineeringResult = AdvisorSummaryDegreeResult;

export type AdvisorSummaryPrerequisiteIssue = {
  courseCode: string;
  termLabel?: string;
  missingPrerequisites: string[];
  severity: "warning" | "blocking" | "advisor_review";
  message: string;
};

export type AdvisorSummaryPrerequisiteCheck = {
  checkedCourseCount: number;
  prerequisiteIssues: AdvisorSummaryPrerequisiteIssue[];
  advisorReviewItems: string[];
  semesterConfidence: DegreeWorksParserConfidence;
  isLikelySequenceValid: boolean | null;
  notes: string[];
};

export type AdvisorSummaryGapReport = GapReport;
export type AdvisorSummaryNextSemesterSuggestions = NextSemesterSuggestions;

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
    | AdvisorSummaryDegreeResult,
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
    | AdvisorSummaryDegreeResult,
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
  computerScienceResult = null,
  prerequisiteCheck = null,
  gapReport = null,
  nextSemesterSuggestions = null,
}: {
  aiResult: AdvisorSummaryAiCertificateResult | null;
  softwareEngineeringResult: AdvisorSummarySoftwareEngineeringResult | null;
  computerScienceResult?: AdvisorSummaryDegreeResult | null;
  prerequisiteCheck?: AdvisorSummaryPrerequisiteCheck | null;
  gapReport?: AdvisorSummaryGapReport | null;
  nextSemesterSuggestions?: AdvisorSummaryNextSemesterSuggestions | null;
}) {
  if (
    !aiResult &&
    !softwareEngineeringResult &&
    !computerScienceResult &&
    !prerequisiteCheck &&
    !gapReport &&
    !nextSemesterSuggestions
  ) {
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

  if (gapReport) {
    addGapReportSummary(lines, gapReport);
  }

  if (nextSemesterSuggestions) {
    addNextSemesterSuggestionsSummary(lines, nextSemesterSuggestions);
  }

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
    addDegreeSummary(lines, {
      result: softwareEngineeringResult,
      title: "Software Engineering Degree Progress",
      creditStatusLabel: "Software Engineering total credits status",
    });
  }

  if (computerScienceResult) {
    addDegreeSummary(lines, {
      result: computerScienceResult,
      title: "Computer Science Degree Progress",
      creditStatusLabel: "Computer Science total credits status",
    });
  }

  if (prerequisiteCheck) {
    const sequenceStatus =
      prerequisiteCheck.isLikelySequenceValid === null
        ? "Could not be determined from reliable term structure."
        : prerequisiteCheck.isLikelySequenceValid
          ? "No modeled sequence warnings found."
          : "Modeled prerequisite sequence warnings found.";

    lines.push(
      "Semester and Prerequisite Check",
      `Semester extraction confidence: ${prerequisiteCheck.semesterConfidence}`,
      `Checked course count: ${prerequisiteCheck.checkedCourseCount}`,
      `Sequence validity: ${sequenceStatus}`,
    );

    if (prerequisiteCheck.prerequisiteIssues.length > 0) {
      lines.push(
        "Prerequisite warnings and advisor-review items:",
        ...prerequisiteCheck.prerequisiteIssues.map(
          (issue) => `- ${issue.message}`,
        ),
      );
    }

    if (prerequisiteCheck.advisorReviewItems.length > 0) {
      lines.push(
        "Specific advisor-review items:",
        ...prerequisiteCheck.advisorReviewItems.map((item) => `- ${item}`),
      );
    }

    lines.push("");
  }

  const shouldAskParserSignalQuestion =
    hasAdvisorQuestionSignals(aiResult?.detectedSignals) ||
    hasAdvisorQuestionSignals(softwareEngineeringResult?.detectedSignals) ||
    hasAdvisorQuestionSignals(computerScienceResult?.detectedSignals);
  const shouldAskPrerequisiteQuestions = Boolean(prerequisiteCheck);
  const questions = [
    "- Which missing or unmatched requirements still need official Degree Works review?",
    "- Do AP, transfer, substitutions, or repeated courses change this progress check?",
    "- Which electives count toward the remaining Software Engineering, Computer Science, or certificate requirements?",
    "- Are prerequisites and semester ordering appropriate for the next registration plan?",
  ];

  if (shouldAskParserSignalQuestion) {
    questions.splice(
      1,
      0,
      "- Can you verify whether AP, transfer, substitution, exception, or in-progress coursework changes this requirement check?",
    );
  }

  if (shouldAskPrerequisiteQuestions) {
    questions.push(
      "- Can you verify that my planned course order satisfies prerequisites?",
      "- Do any senior design, upper-level COMP, or elective courses require additional approvals or standing?",
    );
  }

  lines.push(
    "Questions to ask an advisor:",
    ...questions,
  );

  return lines.join("\n");
}

function addNextSemesterSuggestionsSummary(
  lines: string[],
  suggestions: AdvisorSummaryNextSemesterSuggestions,
) {
  lines.push(
    "Next Semester Suggestions",
    `Target path: ${formatBestFitPath(suggestions.targetPath)}`,
    `Suggestion confidence: ${suggestions.confidence}`,
    "These are planning suggestions to discuss with an academic advisor.",
  );

  if (suggestions.suggestedCourses.length > 0) {
    lines.push(
      "Top suggested courses:",
      ...suggestions.suggestedCourses
        .slice(0, 5)
        .map((course) => `- ${course.code}: ${course.reason}`),
    );
  }

  if (suggestions.notYetRecommended.length > 0) {
    lines.push(
      "Not yet recommended:",
      ...suggestions.notYetRecommended
        .slice(0, 4)
        .map((course) => `- ${course.code}: ${course.reason}`),
    );
  }

  if (suggestions.advisorQuestions.length > 0) {
    lines.push(
      "Next-semester advisor questions:",
      ...suggestions.advisorQuestions
        .slice(0, 4)
        .map((question) => `- ${question}`),
    );
  }

  lines.push("");
}

function addGapReportSummary(lines: string[], gapReport: AdvisorSummaryGapReport) {
  lines.push(
    "Gap Report and Next Actions",
    `Overall status: ${gapReport.overallStatus}`,
    `Best fit path: ${formatBestFitPath(gapReport.bestFitPath)}`,
  );

  const topMissingRequirements = gapReport.missingRequirements
    .slice(0, 3)
    .map(
      (requirement) =>
        `- ${requirement.area}: ${requirement.items.slice(0, 3).join(", ")}`,
    );

  if (topMissingRequirements.length > 0) {
    lines.push("Top missing requirements:", ...topMissingRequirements);
  }

  if (gapReport.nextActions.length > 0) {
    lines.push(
      "Next actions:",
      ...gapReport.nextActions.slice(0, 4).map((action) => `- ${action}`),
    );
  }

  if (gapReport.advisorQuestions.length > 0) {
    lines.push(
      "Gap report advisor questions:",
      ...gapReport.advisorQuestions
        .slice(0, 4)
        .map((question) => `- ${question}`),
    );
  }

  lines.push("");
}

function addDegreeSummary(
  lines: string[],
  {
    creditStatusLabel,
    result,
    title,
  }: {
    creditStatusLabel: string;
    result: AdvisorSummaryDegreeResult;
    title: string;
  },
) {
  const creditStatus =
    result.hasEnoughTotalCredits === null
      ? "Total planned credits were not provided."
      : result.hasEnoughTotalCredits
        ? "Total planned credits meet or exceed the degree requirement."
        : "Total planned credits are below the degree requirement.";

  lines.push(title, `Plan/source: ${getPlanSourceDescription(result)}`);

  if (typeof result.parsedCourseCount === "number") {
    lines.push(`Parsed course count: ${result.parsedCourseCount}`);
  }

  addParserDiagnostics(lines, result);

  lines.push(
    `Total planned credits: ${formatNullableCredits(result.totalPlannedCredits)}`,
    `Required credits: ${result.totalHoursRequired}`,
    `${creditStatusLabel}: ${creditStatus}`,
    `Exact required courses missing: ${formatCourseCodes(
      result.exactRequiredCoursesMissing,
    )}`,
  );

  if (result.alternativeCourseGroups && result.alternativeCourseGroups.length > 0) {
    lines.push(
      "Alternative course groups:",
      ...result.alternativeCourseGroups.map((group) => {
        const satisfiedCodes = formatCourseCodes(group.satisfiedCourses);
        const status = group.isSatisfied ? "satisfied" : "needs review";

        return `- ${group.name}: ${status}; satisfied courses: ${satisfiedCodes}`;
      }),
    );
  }

  if (result.advisorVerifiedRequirements.length > 0) {
    lines.push(
      "Advisor-verified items that need review:",
      ...result.advisorVerifiedRequirements.map(
        (requirement) =>
          `- ${requirement.name} (${requirement.creditHoursRequired} credits)`,
      ),
    );
  }

  if (result.requirementBlocks && result.requirementBlocks.length > 0) {
    lines.push(
      "Structured requirement blocks:",
      ...result.requirementBlocks.map((block) => {
        const credits =
          typeof block.requiredCredits === "number"
            ? `; credits: ${block.matchedCredits ?? 0}/${block.requiredCredits}`
            : "";
        const candidates =
          block.candidateCourses.length > 0
            ? `; candidates: ${block.candidateCourses.join(", ")}`
            : "";

        return `- ${block.blockName}: ${block.status}${credits}${candidates}`;
      }),
    );
  }

  lines.push(
    `Advisor verification required: ${
      result.advisorVerificationRequired ? "Yes" : "No"
    }`,
    "",
  );
}

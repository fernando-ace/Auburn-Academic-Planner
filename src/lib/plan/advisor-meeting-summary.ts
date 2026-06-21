import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";
import type { DraftSemesterPlan } from "./draft-semester-plan.ts";
import type { GapReport } from "./gap-report.ts";
import { formatBestFitPath } from "./gap-report.ts";
import type { NextSemesterSuggestions } from "./next-semester-suggestions.ts";
import type { PlanningTargetPathInput } from "./target-path.ts";

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
  status: "satisfied" | "missing" | "partial" | "advisor_review" | "insufficient_data";
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
export type AdvisorSummaryDraftSemesterPlan = DraftSemesterPlan;

type SummaryResult = AdvisorSummaryAiCertificateResult | AdvisorSummaryDegreeResult;

export function buildAdvisorMeetingSummary({
  aiResult,
  softwareEngineeringResult,
  computerScienceResult = null,
  prerequisiteCheck = null,
  gapReport = null,
  nextSemesterSuggestions = null,
  draftSemesterPlan = null,
  selectedTargetPath,
}: {
  aiResult: AdvisorSummaryAiCertificateResult | null;
  softwareEngineeringResult: AdvisorSummarySoftwareEngineeringResult | null;
  computerScienceResult?: AdvisorSummaryDegreeResult | null;
  prerequisiteCheck?: AdvisorSummaryPrerequisiteCheck | null;
  gapReport?: AdvisorSummaryGapReport | null;
  nextSemesterSuggestions?: AdvisorSummaryNextSemesterSuggestions | null;
  draftSemesterPlan?: AdvisorSummaryDraftSemesterPlan | null;
  selectedTargetPath?: PlanningTargetPathInput;
}) {
  if (
    !aiResult &&
    !softwareEngineeringResult &&
    !computerScienceResult &&
    !prerequisiteCheck &&
    !gapReport &&
    !nextSemesterSuggestions &&
    !draftSemesterPlan
  ) {
    return "";
  }

  const diagnosticResult =
    aiResult ?? softwareEngineeringResult ?? computerScienceResult;
  const resolvedPath =
    gapReport?.bestFitPath ??
    nextSemesterSuggestions?.targetPath ??
    draftSemesterPlan?.targetPath ??
    inferSingleResultPath({ aiResult, computerScienceResult, softwareEngineeringResult });
  const suggestedCourses =
    draftSemesterPlan?.semesters[0]?.plannedCourses.map((course) => course.code) ??
    nextSemesterSuggestions?.suggestedCourses.map((course) => course.code) ??
    [];
  const questions = buildQuestions();
  const lines = [
    "Advisor Meeting Summary",
    "",
    "This is a preparation summary, not an official degree audit.",
    "",
    "Planned path review:",
    `- Target: ${formatSelectedTarget(selectedTargetPath, resolvedPath)}`,
    `- Parser confidence: ${formatConfidence(
      diagnosticResult?.parserConfidence ??
        draftSemesterPlan?.confidence ??
        nextSemesterSuggestions?.confidence ??
        "unknown",
    )}`,
    `- Plan credits: ${formatPlanCredits(diagnosticResult)}`,
    `- Main concern: ${formatMainConcern({ gapReport, prerequisiteCheck })}`,
    "",
    "Top items to review:",
    "1. Missing or unmatched requirements.",
    "2. Any unresolved core/elective blocks.",
    "3. Prerequisite and semester order.",
    "4. AP/transfer/substitution effects.",
    "",
    "Draft next step:",
    "- Review the suggested first semester or top suggested courses with an advisor.",
  ];

  if (suggestedCourses.length > 0) {
    lines.push(
      "",
      "Suggested courses to review:",
      ...suggestedCourses.slice(0, 6).map((code) => `- ${code}`),
    );

    if (suggestedCourses.length > 6) {
      lines.push(`+${suggestedCourses.length - 6} more items in the detailed report`);
    }
  }

  lines.push(
    "",
    "Questions for my advisor:",
    ...questions.map((question) => `- ${question}`),
  );

  return lines.join("\n");
}

function buildQuestions() {
  return dedupeQuestions([
    "Does this planned path satisfy my Degree Works requirements?",
    "Are these courses offered in the suggested terms?",
    "Are prerequisites and course load reasonable?",
    "Do substitutions, AP/transfer credit, or hidden Degree Works sections change the plan?",
  ]).slice(0, 6);
}

function inferSingleResultPath({
  aiResult,
  computerScienceResult,
  softwareEngineeringResult,
}: {
  aiResult: AdvisorSummaryAiCertificateResult | null;
  computerScienceResult: AdvisorSummaryDegreeResult | null;
  softwareEngineeringResult: AdvisorSummaryDegreeResult | null;
}): GapReport["bestFitPath"] {
  if (computerScienceResult && !aiResult && !softwareEngineeringResult) return "computer_science";
  if (softwareEngineeringResult && !aiResult && !computerScienceResult) return "software_engineering";
  if (aiResult && !softwareEngineeringResult && !computerScienceResult) return "ai_certificate";
  return "mixed_or_unclear";
}

function formatSelectedTarget(
  selectedTargetPath: PlanningTargetPathInput | undefined,
  resolvedPath: GapReport["bestFitPath"],
) {
  return selectedTargetPath === "auto"
    ? `Auto (inferred: ${formatBestFitPath(resolvedPath)})`
    : formatBestFitPath(selectedTargetPath ?? resolvedPath);
}

function formatConfidence(confidence: DegreeWorksParserConfidence | "unknown") {
  return confidence === "unknown"
    ? "Unknown"
    : confidence.charAt(0).toUpperCase() + confidence.slice(1);
}

function formatPlanCredits(result: SummaryResult | null) {
  const credits = result && "totalPlannedCredits" in result ? result.totalPlannedCredits : null;

  return typeof credits === "number" ? String(credits) : "unknown";
}

function formatMainConcern({
  gapReport,
  prerequisiteCheck,
}: {
  gapReport: AdvisorSummaryGapReport | null;
  prerequisiteCheck: AdvisorSummaryPrerequisiteCheck | null;
}) {
  if (prerequisiteCheck?.isLikelySequenceValid === false) {
    return "Prerequisite or semester order needs advisor verification.";
  }

  if ((gapReport?.missingRequirements.length ?? 0) > 0) {
    return "Some requirements need advisor verification.";
  }

  return "Confirm Degree Works details with an advisor.";
}

function dedupeQuestions(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

import type {
  DegreeWorksDetectedSignals,
  DegreeWorksParserConfidence,
} from "./degreeworks-analysis.ts";
import type { DegreeWorksCourseStatusCounts } from "./degreeworks-course-status.ts";
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
  courseStatusCounts?: DegreeWorksCourseStatusCounts;
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
  courseStatusCounts?: DegreeWorksCourseStatusCounts;
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
  const lines = [
    "Advisor Meeting Summary",
    "",
    "This is a preparation summary, not an official degree audit; advisor verification is required.",
    `Selected target path: ${formatSelectedTarget(selectedTargetPath, resolvedPath)}`,
  ];

  addParserSummary(lines, diagnosticResult);
  addMissingItems(lines, {
    aiResult,
    computerScienceResult,
    gapReport,
    resolvedPath,
    softwareEngineeringResult,
  });

  if (gapReport?.nextActions.length) {
    lines.push(
      "",
      "Top next actions:",
      ...gapReport.nextActions.slice(0, 4).map((action) => `- ${action}`),
    );
  }

  addPlanningPreview(lines, draftSemesterPlan, nextSemesterSuggestions);
  lines.push("", "Questions to ask an advisor:", ...buildQuestions({
    gapReport,
    nextSemesterSuggestions,
    prerequisiteCheck,
  }).map((question) => `- ${question}`));

  return lines.join("\n");
}

function addParserSummary(lines: string[], result: SummaryResult | null) {
  if (!result) {
    return;
  }

  lines.push(`Parser confidence: ${result.parserConfidence ?? "not available"}`);
  if (result.courseStatusCounts) {
    lines.push(`Course status summary: ${formatCourseStatusCounts(result.courseStatusCounts)}`);
  }
}

function addMissingItems(
  lines: string[],
  {
    aiResult,
    computerScienceResult,
    gapReport,
    resolvedPath,
    softwareEngineeringResult,
  }: {
    aiResult: AdvisorSummaryAiCertificateResult | null;
    computerScienceResult: AdvisorSummaryDegreeResult | null;
    gapReport: AdvisorSummaryGapReport | null;
    resolvedPath: GapReport["bestFitPath"];
    softwareEngineeringResult: AdvisorSummaryDegreeResult | null;
  },
) {
  const items = gapReport
    ? gapReport.missingRequirements.flatMap((requirement) =>
        requirement.items.map((item) => `${requirement.area}: ${item}`),
      )
    : resolvedPath === "ai_certificate"
      ? [
          ...(aiResult?.requiredCoursesMissing.map((course) => course.code) ?? []),
          ...(aiResult && aiResult.electiveCandidatesFound.length === 0
            ? ["AI Engineering certificate elective selection needs advisor review."]
            : []),
        ]
      : resolvedPath === "computer_science"
        ? computerScienceResult?.exactRequiredCoursesMissing.map((course) => course.code) ?? []
        : softwareEngineeringResult?.exactRequiredCoursesMissing.map((course) => course.code) ?? [];

  if (items.length) {
    lines.push("", "Top missing items:", ...items.slice(0, 5).map((item) => `- ${item}`));
  }
}

function addPlanningPreview(
  lines: string[],
  draftSemesterPlan: AdvisorSummaryDraftSemesterPlan | null,
  suggestions: AdvisorSummaryNextSemesterSuggestions | null,
) {
  const firstSemester = draftSemesterPlan?.semesters[0];
  if (firstSemester?.plannedCourses.length) {
    lines.push(
      "",
      `First draft semester (${firstSemester.estimatedCredits} estimated credits):`,
      ...firstSemester.plannedCourses.map((course) => `- ${course.code}`),
    );
    return;
  }

  if (suggestions?.suggestedCourses.length) {
    lines.push(
      "",
      "Top suggested courses:",
      ...suggestions.suggestedCourses.slice(0, 5).map((course) => `- ${course.code}: ${course.reason}`),
    );
  }
}

function buildQuestions({
  gapReport,
  nextSemesterSuggestions,
  prerequisiteCheck,
}: {
  gapReport: AdvisorSummaryGapReport | null;
  nextSemesterSuggestions: AdvisorSummaryNextSemesterSuggestions | null;
  prerequisiteCheck: AdvisorSummaryPrerequisiteCheck | null;
}) {
  return dedupe([
    "Which suggested courses are actually offered in the target term, and are any restricted by standing, approvals, or department scheduling?",
    ...(gapReport?.advisorQuestions ?? []),
    ...(nextSemesterSuggestions?.advisorQuestions ?? []),
    "Which missing or unmatched requirements still need official Degree Works review?",
    "Do AP, transfer, substitutions, exceptions, or in-progress courses change this summary?",
    prerequisiteCheck
      ? "Can you verify that my planned course order satisfies prerequisites?"
      : "Are prerequisites appropriate for the next registration plan?",
    "Which courses should I prioritize next semester?",
    "Is the proposed semester load reasonable for my circumstances?",
    "Which electives or advisor-approved alternatives best fit this target?",
  ]).slice(0, 8);
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

function formatCourseStatusCounts(counts: DegreeWorksCourseStatusCounts) {
  return [
    `completed ${counts.completed}`,
    `in progress ${counts.in_progress}`,
    `planned ${counts.planned}`,
    `transfer/AP ${counts.transfer_or_ap}`,
    `substituted/waived ${counts.substituted_or_waived}`,
    `missing ${counts.missing}`,
    `unknown ${counts.unknown}`,
  ].join("; ");
}

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}

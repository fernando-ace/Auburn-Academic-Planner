import type {
  CurrentDegreeAuditAnalysis,
} from "./current-degree-audit-analysis.ts";
import type { DegreeWorksStillNeededItem } from "./degreeworks-still-needed.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";

export type PlannedPathCoverageMatch = {
  blockName: string;
  requirementLabel: string;
  neededText: string;
  courseOptions: string[];
  matchedCourses: string[];
  reason: string;
};

export type PlannedPathCoverage = {
  coveredStillNeededItems: PlannedPathCoverageMatch[];
  partiallyCoveredStillNeededItems: PlannedPathCoverageMatch[];
  uncoveredStillNeededItems: PlannedPathCoverageMatch[];
  plannedButUnmatchedCourses: string[];
  advisorReviewItems: string[];
  confidence: DegreeWorksParserConfidence;
  notes: string[];
};

export function comparePlannedPathToCurrentProgress({
  currentAudit,
  plannedCourseCodes,
}: {
  currentAudit: CurrentDegreeAuditAnalysis;
  plannedCourseCodes: string[];
}): PlannedPathCoverage {
  const planned = new Set(plannedCourseCodes.map(normalizeCourseCode));
  const completed = new Set(
    [
      ...currentAudit.completedCourseCodes,
      ...currentAudit.transferOrApCourseCodes,
    ].map(normalizeCourseCode),
  );
  const preregistered = new Set(
    [
      ...currentAudit.preregisteredCourseCodes,
      ...currentAudit.inProgressCourseCodes,
    ].map(normalizeCourseCode),
  );
  const matchedPlanned = new Set<string>();
  const coveredStillNeededItems: PlannedPathCoverageMatch[] = [];
  const partiallyCoveredStillNeededItems: PlannedPathCoverageMatch[] = [];
  const uncoveredStillNeededItems: PlannedPathCoverageMatch[] = [];
  const advisorReviewItems: string[] = [];

  for (const item of currentAudit.stillNeededItems) {
    const match = matchStillNeededItem({
      completed,
      item,
      planned,
      preregistered,
    });

    for (const course of match.matchedCourses) {
      if (planned.has(course)) {
        matchedPlanned.add(course);
      }
    }

    if (
      item.requirementType === "block_reference" ||
      item.requirementType === "credit_hours_from_list" ||
      item.requirementType === "advisor_review" ||
      item.requirementType === "graduation_milestone"
    ) {
      advisorReviewItems.push(match.reason);
      continue;
    }

    if (match.status === "covered") {
      coveredStillNeededItems.push(match);
    } else if (match.status === "partial") {
      partiallyCoveredStillNeededItems.push(match);
    } else {
      uncoveredStillNeededItems.push(match);
    }
  }

  const plannedButUnmatchedCourses = plannedCourseCodes
    .map(normalizeCourseCode)
    .filter(
      (code) =>
        !matchedPlanned.has(code) &&
        !completed.has(code) &&
        !preregistered.has(code),
    );

  return {
    coveredStillNeededItems,
    partiallyCoveredStillNeededItems,
    uncoveredStillNeededItems,
    plannedButUnmatchedCourses: Array.from(new Set(plannedButUnmatchedCourses)),
    advisorReviewItems: Array.from(new Set(advisorReviewItems)).slice(0, 12),
    confidence: getCoverageConfidence({
      currentAudit,
      plannedCourseCodes,
      advisorReviewItems,
      uncoveredStillNeededItems,
    }),
    notes: [
      "This compares planned-path courses against Degree Works Still needed items from Current Progress.",
      "Exact course and option-list matches can be covered by planned courses; section references and broad elective credit-hour requirements stay advisor-review items.",
      "Completed, AP/transfer, preregistered, and in-progress courses from Current Progress are not treated as new planned-path coverage.",
    ],
  };
}

function matchStillNeededItem({
  completed,
  item,
  planned,
  preregistered,
}: {
  completed: Set<string>;
  item: DegreeWorksStillNeededItem;
  planned: Set<string>;
  preregistered: Set<string>;
}) {
  const options = item.courseOptions.map(normalizeCourseCode);
  const plannedMatches = options.filter((code) => planned.has(code));
  const preregisteredMatches = options.filter((code) => preregistered.has(code));
  const completedMatches = options.filter((code) => completed.has(code));
  const base = {
    blockName: item.blockName,
    requirementLabel: item.requirementLabel,
    neededText: item.neededText,
    courseOptions: options,
    matchedCourses: [...plannedMatches, ...preregisteredMatches, ...completedMatches],
  };

  if (item.requirementType === "specific_course") {
    if (plannedMatches.length > 0) {
      return {
        ...base,
        status: "covered" as const,
        reason: `${plannedMatches[0]} appears in the planned path for this exact Still needed requirement.`,
      };
    }

    if (preregisteredMatches.length > 0 || completedMatches.length > 0) {
      return {
        ...base,
        status: "partial" as const,
        reason: `${item.requirementLabel} appears current, preregistered, in progress, completed, or AP/transfer-satisfied; verify whether Degree Works still requires it.`,
      };
    }

    return {
      ...base,
      status: "uncovered" as const,
      reason: `${item.requirementLabel} was not found in the planned path.`,
    };
  }

  if (item.requirementType === "course_options") {
    if (plannedMatches.length > 0) {
      return {
        ...base,
        status: "covered" as const,
        reason: `${plannedMatches[0]} appears in the planned path and is one option listed by Degree Works.`,
      };
    }

    return {
      ...base,
      status: preregisteredMatches.length > 0 ? "partial" as const : "uncovered" as const,
      reason: `${item.requirementLabel} is an option list; ask an advisor which option satisfies this requirement.`,
    };
  }

  return {
    ...base,
    status: "partial" as const,
    reason:
      item.requirementType === "credit_hours_from_list"
        ? `${item.requirementLabel} is a credit-hour option list and needs advisor review before this comparison can mark it covered: ${item.neededText}`
        : `${item.requirementLabel} needs advisor review before this comparison can mark it covered: ${item.neededText}`,
  };
}

function getCoverageConfidence({
  currentAudit,
  plannedCourseCodes,
  advisorReviewItems,
  uncoveredStillNeededItems,
}: {
  currentAudit: CurrentDegreeAuditAnalysis;
  plannedCourseCodes: string[];
  advisorReviewItems: string[];
  uncoveredStillNeededItems: PlannedPathCoverageMatch[];
}): DegreeWorksParserConfidence {
  if (
    currentAudit.confidence === "low" ||
    plannedCourseCodes.length === 0 ||
    currentAudit.stillNeededItems.length === 0
  ) {
    return "low";
  }

  if (advisorReviewItems.length > 0 || uncoveredStillNeededItems.length > 0) {
    return "medium";
  }

  return currentAudit.confidence;
}

function normalizeCourseCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, " ");
}

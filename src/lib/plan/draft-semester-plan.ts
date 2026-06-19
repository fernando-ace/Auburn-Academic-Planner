import type { AiCertificateCheckResult, CourseRule } from "../rules/ai-certificate.ts";
import type { ComputerScienceDegreeCheckResult } from "../rules/computer-science-degree.ts";
import type { RequirementBlockResult } from "../rules/requirement-blocks.ts";
import {
  getModeledMissingPrerequisites,
  type SoftwareEngineeringPrerequisiteCheckResult,
} from "../rules/software-engineering-prerequisites.ts";
import type { SoftwareEngineeringDegreeCheckResult } from "../rules/software-engineering-degree.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import type { DegreeWorksCourseStatusRecord } from "./degreeworks-course-status.ts";
import type {
  NextSemesterSuggestions,
  NextSemesterTargetPathInput,
} from "./next-semester-suggestions.ts";

export type DraftSemesterPlanTargetPath =
  | "software_engineering"
  | "computer_science"
  | "ai_certificate"
  | "mixed_or_unclear";

export type DraftSemesterPlanTargetPathInput = NextSemesterTargetPathInput;

export type DraftSemesterPlanSettings = {
  maxCreditsPerSemester?: number;
  startingTermLabel?: string;
  maxSemesters?: number;
};

export type DraftSemesterPlanCourse = {
  code: string;
  title?: string;
  creditHours?: number;
  reason: string;
  advisorVerificationRequired: boolean;
};

export type DraftSemesterPlanSemester = {
  label: string;
  plannedCourses: DraftSemesterPlanCourse[];
  estimatedCredits: number;
  notes: string[];
};

export type DraftSemesterPlan = {
  targetPath: DraftSemesterPlanTargetPath;
  confidence: DegreeWorksParserConfidence;
  semesters: DraftSemesterPlanSemester[];
  unplacedCourses: Array<{ code: string; reason: string }>;
  advisorReviewItems: string[];
  notes: string[];
};

export type DraftSemesterPlanRequirementBlocks = {
  softwareEngineering: RequirementBlockResult[];
  computerScience: RequirementBlockResult[];
};

export type DraftSemesterPlanInput = DraftSemesterPlanSettings & {
  parsedCourseCodes: string[];
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  aiCertificateCheck: AiCertificateCheckResult;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
  requirementBlockResults: DraftSemesterPlanRequirementBlocks;
  nextSemesterSuggestions: NextSemesterSuggestions;
  targetPath: DraftSemesterPlanTargetPathInput;
};

type CandidateCourse = CourseRule & {
  reason: string;
  priority: number;
};

const defaultMaxCreditsPerSemester = 15;
const defaultStartingTermLabel = "Next Semester";
const defaultMaxSemesters = 6;

export function buildDraftSemesterPlan({
  parsedCourseCodes,
  courseStatusRecords = [],
  softwareEngineeringCheck,
  computerScienceCheck,
  aiCertificateCheck,
  prerequisiteCheck,
  requirementBlockResults,
  nextSemesterSuggestions,
  targetPath,
  maxCreditsPerSemester = defaultMaxCreditsPerSemester,
  startingTermLabel = defaultStartingTermLabel,
  maxSemesters = defaultMaxSemesters,
}: DraftSemesterPlanInput): DraftSemesterPlan {
  const normalizedCourseCodes = dedupeStrings(parsedCourseCodes.map(normalizeCourseCode));
  const statusByCourse = new Map(
    courseStatusRecords.map((record) => [normalizeCourseCode(record.code), record]),
  );
  const resolvedTargetPath =
    targetPath === "auto" ? nextSemesterSuggestions.targetPath : targetPath;
  const advisorReviewItems = buildInitialAdvisorReviewItems({
    aiCertificateCheck,
    prerequisiteCheck,
    requirementBlockResults,
    resolvedTargetPath,
  });
  const candidates = collectCandidates({
    aiCertificateCheck,
    computerScienceCheck,
    nextSemesterSuggestions,
    resolvedTargetPath,
    softwareEngineeringCheck,
  });
  const availableBeforeDraft = new Set(
    normalizedCourseCodes.filter((code) => {
      const status = statusByCourse.get(code)?.status;

      return (
        !status ||
        status === "completed" ||
        status === "in_progress"
      );
    }),
  );
  const unplacedCourses: DraftSemesterPlan["unplacedCourses"] = [];
  const remaining: CandidateCourse[] = [];

  for (const candidate of candidates) {
    const statusRecord = statusByCourse.get(candidate.code);

    if (
      statusRecord &&
      [
        "completed",
        "in_progress",
        "planned",
        "transfer_or_ap",
        "substituted_or_waived",
      ].includes(statusRecord.status)
    ) {
      advisorReviewItems.push(
        `${candidate.code} appears ${formatStatus(statusRecord.status)} and was not duplicated in the draft; confirm its official status with an advisor.`,
      );
      continue;
    }

    if (!Number.isFinite(candidate.creditHours) || candidate.creditHours <= 0) {
      unplacedCourses.push({
        code: candidate.code,
        reason: "No reliable positive credit-hour value was available, so the planner did not guess a semester load.",
      });
      continue;
    }

    if (candidate.creditHours > maxCreditsPerSemester) {
      unplacedCourses.push({
        code: candidate.code,
        reason: `${candidate.creditHours} credit hours exceeds the ${maxCreditsPerSemester}-credit semester limit.`,
      });
      continue;
    }

    remaining.push(candidate);
  }

  const semesters: DraftSemesterPlanSemester[] = [];

  while (remaining.length > 0 && semesters.length < maxSemesters) {
    const semesterCourses: DraftSemesterPlanCourse[] = [];
    let estimatedCredits = 0;

    for (let index = 0; index < remaining.length; ) {
      const candidate = remaining[index];
      const missingPrerequisites = getModeledMissingPrerequisites(
        candidate.code,
        Array.from(availableBeforeDraft),
      );

      if (missingPrerequisites.length > 0) {
        index += 1;
        continue;
      }

      if (estimatedCredits + candidate.creditHours > maxCreditsPerSemester) {
        index += 1;
        continue;
      }

      semesterCourses.push({
        code: candidate.code,
        title: candidate.title,
        creditHours: candidate.creditHours,
        reason: candidate.reason,
        advisorVerificationRequired: true,
      });
      estimatedCredits += candidate.creditHours;
      remaining.splice(index, 1);
    }

    if (semesterCourses.length === 0) {
      break;
    }

    semesters.push({
      label:
        semesters.length === 0
          ? startingTermLabel.trim() || defaultStartingTermLabel
          : `Semester ${semesters.length + 1}`,
      plannedCourses: semesterCourses,
      estimatedCredits,
      notes: [
        "Confirm course availability, prerequisites, and the overall workload with an academic advisor.",
      ],
    });

    for (const course of semesterCourses) {
      availableBeforeDraft.add(course.code);
    }
  }

  for (const candidate of remaining) {
    const missingPrerequisites = getModeledMissingPrerequisites(
      candidate.code,
      Array.from(availableBeforeDraft),
    );
    unplacedCourses.push({
      code: candidate.code,
      reason:
        missingPrerequisites.length > 0
          ? `Modeled prerequisite(s) ${missingPrerequisites.join(", ")} could not be safely placed before this course within the draft.`
          : `The course could not be placed within ${maxSemesters} semester(s) and the ${maxCreditsPerSemester}-credit limit.`,
    });
  }

  const notes = [
    "This is a draft planning aid, not an official academic plan.",
    "Confirm course availability, prerequisites, substitutions, AP/transfer credit, and semester load with an advisor.",
    "Only exact locally modeled requirements are placed; unresolved core and elective choices remain advisor-review items.",
    "The local prerequisite model is preliminary and does not replace the Auburn catalog or registration checks.",
  ];

  if (normalizedCourseCodes.length === 0) {
    notes.push("No existing course codes were provided, so the draft has insufficient context.");
  }

  if (semesters.length === 0) {
    notes.push("No courses could be safely placed from the available deterministic data.");
  }

  return {
    targetPath: resolvedTargetPath,
    confidence: getDraftConfidence({
      advisorReviewItems,
      nextSemesterSuggestions,
      normalizedCourseCodes,
      resolvedTargetPath,
      semesters,
      unplacedCourses,
    }),
    semesters,
    unplacedCourses: dedupeByCode(unplacedCourses),
    advisorReviewItems: dedupeStrings(advisorReviewItems),
    notes,
  };
}

function collectCandidates({
  aiCertificateCheck,
  computerScienceCheck,
  nextSemesterSuggestions,
  resolvedTargetPath,
  softwareEngineeringCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  computerScienceCheck: ComputerScienceDegreeCheckResult;
  nextSemesterSuggestions: NextSemesterSuggestions;
  resolvedTargetPath: DraftSemesterPlanTargetPath;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult;
}) {
  const suggestionByCode = new Map(
    nextSemesterSuggestions.suggestedCourses.map((course, index) => [
      normalizeCourseCode(course.code),
      { reason: course.reason, priority: index },
    ]),
  );
  const selectedCourses =
    resolvedTargetPath === "software_engineering"
      ? softwareEngineeringCheck.exactRequiredCoursesMissing
      : resolvedTargetPath === "computer_science"
        ? computerScienceCheck.exactRequiredCoursesMissing
        : resolvedTargetPath === "ai_certificate"
          ? aiCertificateCheck.requiredCoursesMissing
          : [
              ...softwareEngineeringCheck.exactRequiredCoursesMissing,
              ...computerScienceCheck.exactRequiredCoursesMissing,
              ...aiCertificateCheck.requiredCoursesMissing,
            ];
  const seen = new Set<string>();

  return selectedCourses
    .map((course, originalIndex) => {
      const code = normalizeCourseCode(course.code);
      const suggestion = suggestionByCode.get(code);

      return {
        ...course,
        code,
        reason:
          suggestion?.reason ??
          `${code} is an exact missing requirement in the selected deterministic path check.`,
        priority: suggestion?.priority ?? 1000 + originalIndex,
      };
    })
    .filter((course) => {
      if (seen.has(course.code)) {
        return false;
      }

      seen.add(course.code);
      return true;
    })
    .sort((left, right) =>
      left.priority !== right.priority
        ? left.priority - right.priority
        : left.code.localeCompare(right.code),
    );
}

function buildInitialAdvisorReviewItems({
  aiCertificateCheck,
  prerequisiteCheck,
  requirementBlockResults,
  resolvedTargetPath,
}: {
  aiCertificateCheck: AiCertificateCheckResult;
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult;
  requirementBlockResults: DraftSemesterPlanRequirementBlocks;
  resolvedTargetPath: DraftSemesterPlanTargetPath;
}) {
  const relevantBlocks =
    resolvedTargetPath === "software_engineering"
      ? requirementBlockResults.softwareEngineering
      : resolvedTargetPath === "computer_science"
        ? requirementBlockResults.computerScience
        : resolvedTargetPath === "ai_certificate"
          ? []
          : [
              ...requirementBlockResults.softwareEngineering,
              ...requirementBlockResults.computerScience,
            ];
  const unresolvedBlocks = relevantBlocks.filter(
    (block) => block.status !== "satisfied",
  );

  return [
    ...prerequisiteCheck.advisorReviewItems,
    ...(resolvedTargetPath === "ai_certificate" &&
    aiCertificateCheck.electiveCandidatesFound.length === 0
      ? [
          "No AI Engineering certificate elective candidate was found; discuss an eligible elective with an advisor.",
        ]
      : []),
    ...unresolvedBlocks.map(
      (block) =>
        `${block.blockName} remains ${block.status.replace("_", " ")}; confirm the applicable core or elective choices with an advisor.`,
    ),
  ];
}

function getDraftConfidence({
  advisorReviewItems,
  nextSemesterSuggestions,
  normalizedCourseCodes,
  resolvedTargetPath,
  semesters,
  unplacedCourses,
}: {
  advisorReviewItems: string[];
  nextSemesterSuggestions: NextSemesterSuggestions;
  normalizedCourseCodes: string[];
  resolvedTargetPath: DraftSemesterPlanTargetPath;
  semesters: DraftSemesterPlanSemester[];
  unplacedCourses: DraftSemesterPlan["unplacedCourses"];
}): DegreeWorksParserConfidence {
  if (
    normalizedCourseCodes.length === 0 ||
    resolvedTargetPath === "mixed_or_unclear" ||
    nextSemesterSuggestions.confidence === "low" ||
    semesters.length === 0 ||
    unplacedCourses.length > 0
  ) {
    return "low";
  }

  if (
    nextSemesterSuggestions.confidence === "high" &&
    advisorReviewItems.length === 0
  ) {
    return "high";
  }

  return "medium";
}

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

function formatStatus(status: DegreeWorksCourseStatusRecord["status"]) {
  return status.replaceAll("_", " ").replace("or ap", "or AP");
}

function dedupeStrings(items: string[]) {
  return Array.from(new Set(items));
}

function dedupeByCode(items: DraftSemesterPlan["unplacedCourses"]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.code)) {
      return false;
    }

    seen.add(item.code);
    return true;
  });
}

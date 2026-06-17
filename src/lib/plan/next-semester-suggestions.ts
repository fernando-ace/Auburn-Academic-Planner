import type { AiCertificateCheckResult, CourseRule } from "../rules/ai-certificate.ts";
import type { ComputerScienceDegreeCheckResult } from "../rules/computer-science-degree.ts";
import {
  getModeledMissingPrerequisites,
  type SoftwareEngineeringPrerequisiteCheckResult,
} from "../rules/software-engineering-prerequisites.ts";
import type { SoftwareEngineeringDegreeCheckResult } from "../rules/software-engineering-degree.ts";
import type { DegreeWorksParserConfidence } from "./degreeworks-analysis.ts";
import type {
  DegreeWorksCourseStatus,
  DegreeWorksCourseStatusRecord,
} from "./degreeworks-course-status.ts";

export type NextSemesterTargetPath =
  | "software_engineering"
  | "computer_science"
  | "ai_certificate"
  | "mixed_or_unclear";

export type NextSemesterTargetPathInput =
  | NextSemesterTargetPath
  | "auto";

export type NextSemesterSuggestionCategory =
  | "missing_required"
  | "certificate_requirement"
  | "prerequisite_foundation"
  | "advisor_review";

export type NextSemesterSuggestionPriority = "high" | "medium" | "low";

export type NextSemesterSuggestedCourse = {
  code: string;
  title?: string;
  reason: string;
  category: NextSemesterSuggestionCategory;
  priority: NextSemesterSuggestionPriority;
  advisorVerificationRequired: boolean;
};

export type NextSemesterNotYetRecommendedCourse = {
  code: string;
  reason: string;
};

export type NextSemesterSuggestions = {
  targetPath: NextSemesterTargetPath;
  confidence: DegreeWorksParserConfidence;
  suggestedCourses: NextSemesterSuggestedCourse[];
  notYetRecommended: NextSemesterNotYetRecommendedCourse[];
  advisorQuestions: string[];
  notes: string[];
};

const maxSuggestedCourses = 5;

export function buildNextSemesterSuggestions({
  parsedCourseCodes,
  softwareEngineeringCheck = null,
  computerScienceCheck = null,
  aiCertificateCheck = null,
  prerequisiteCheck = null,
  parserConfidence = "medium",
  parserWarnings = [],
  targetPath = "auto",
  courseStatusRecords = [],
}: {
  parsedCourseCodes: string[];
  softwareEngineeringCheck?: SoftwareEngineeringDegreeCheckResult | null;
  computerScienceCheck?: ComputerScienceDegreeCheckResult | null;
  aiCertificateCheck?: AiCertificateCheckResult | null;
  prerequisiteCheck?: SoftwareEngineeringPrerequisiteCheckResult | null;
  parserConfidence?: DegreeWorksParserConfidence;
  parserWarnings?: string[];
  targetPath?: NextSemesterTargetPathInput;
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
}): NextSemesterSuggestions {
  const courseStatuses = getCourseStatusMap(courseStatusRecords);
  const resolvedTargetPath =
    targetPath === "auto"
      ? resolveAutoTargetPath({
          aiCertificateCheck,
          computerScienceCheck,
          parserConfidence,
          parsedCourseCodes,
          softwareEngineeringCheck,
        })
      : targetPath;
  const collected = collectSuggestionsForTarget({
    aiCertificateCheck,
    computerScienceCheck,
    parsedCourseCodes,
    softwareEngineeringCheck,
    targetPath: resolvedTargetPath,
    courseStatuses,
  });
  const suggestedCourses = dedupeSuggestedCourses(collected.suggestedCourses).slice(
    0,
    maxSuggestedCourses,
  );
  const notYetRecommended = dedupeNotYetRecommended(
    collected.notYetRecommended,
  );
  const notes = buildNotes({
    computerScienceCheck,
    parserConfidence,
    parserWarnings,
    prerequisiteCheck,
    resolvedTargetPath,
    suggestedCourses,
    softwareEngineeringCheck,
  });

  return {
    targetPath: resolvedTargetPath,
    confidence:
      parserConfidence === "low"
        ? "low"
        : suggestedCourses.length === 0
          ? "medium"
          : parserConfidence,
    suggestedCourses,
    notYetRecommended,
    advisorQuestions: [
      "Which of these courses are actually available next semester?",
      "Do my AP, transfer, substitution, or in-progress credits change these suggestions?",
      "Do these courses satisfy prerequisites and catalog rules for my official program?",
      "Would this set create a reasonable semester load with work, labs, and other commitments?",
      "Are any electives, substitutions, or advisor-approved alternatives better next steps?",
      ...(hasUnresolvedRequirementBlocks({
        computerScienceCheck,
        softwareEngineeringCheck,
      })
        ? [
            "Which unresolved core, math elective, technical elective, or free elective blocks should I prioritize after Degree Works review?",
          ]
        : []),
    ],
    notes,
  };
}

function resolveAutoTargetPath({
  aiCertificateCheck,
  computerScienceCheck,
  parserConfidence,
  parsedCourseCodes,
  softwareEngineeringCheck,
}: {
  aiCertificateCheck: AiCertificateCheckResult | null;
  computerScienceCheck: ComputerScienceDegreeCheckResult | null;
  parserConfidence: DegreeWorksParserConfidence;
  parsedCourseCodes: string[];
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult | null;
}) {
  if (parserConfidence === "low") {
    return "mixed_or_unclear";
  }

  const degreeHasGaps = Boolean(
    softwareEngineeringCheck?.exactRequiredCoursesMissing.length ||
      computerScienceCheck?.exactRequiredCoursesMissing.length,
  );

  if (aiCertificateCheck?.isLikelyComplete && degreeHasGaps) {
    return "mixed_or_unclear";
  }

  const candidates = [
    aiCertificateCheck
      ? {
          path: "ai_certificate" as const,
          score:
            aiCertificateCheck.requiredCoursesMissing.length +
            (aiCertificateCheck.requiredCoursesMissing.length === 0 &&
            aiCertificateCheck.electiveCandidatesFound.length === 0
              ? 1
              : 0),
          blocked: 0,
        }
      : null,
    softwareEngineeringCheck
      ? scoreDegreeTarget({
          path: "software_engineering" as const,
          parsedCourseCodes,
          missingCourses: softwareEngineeringCheck.exactRequiredCoursesMissing,
        })
      : null,
    computerScienceCheck
      ? scoreDegreeTarget({
          path: "computer_science" as const,
          parsedCourseCodes,
          missingCourses: computerScienceCheck.exactRequiredCoursesMissing,
        })
      : null,
  ]
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate),
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.blocked - right.blocked;
    });

  if (candidates.length === 0 || candidates[0].score <= 0) {
    return "mixed_or_unclear";
  }

  if (
    candidates.length > 1 &&
    candidates[0].score === candidates[1].score &&
    candidates[0].blocked === candidates[1].blocked
  ) {
    return "mixed_or_unclear";
  }

  return candidates[0].path;
}

function scoreDegreeTarget({
  missingCourses,
  parsedCourseCodes,
  path,
}: {
  missingCourses: CourseRule[];
  parsedCourseCodes: string[];
  path: "software_engineering" | "computer_science";
}) {
  const blocked = missingCourses.filter(
    (course) =>
      getModeledMissingPrerequisites(course.code, parsedCourseCodes).length > 0,
  ).length;

  return {
    path,
    score: Math.max(0, missingCourses.length - blocked),
    blocked,
  };
}

function collectSuggestionsForTarget({
  aiCertificateCheck,
  computerScienceCheck,
  parsedCourseCodes,
  softwareEngineeringCheck,
  targetPath,
  courseStatuses,
}: {
  aiCertificateCheck: AiCertificateCheckResult | null;
  computerScienceCheck: ComputerScienceDegreeCheckResult | null;
  parsedCourseCodes: string[];
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult | null;
  targetPath: NextSemesterTargetPath;
  courseStatuses: Map<string, DegreeWorksCourseStatusRecord>;
}) {
  if (targetPath === "ai_certificate") {
    return collectAiCertificateSuggestions(aiCertificateCheck, courseStatuses);
  }

  if (targetPath === "software_engineering") {
    return collectDegreeSuggestions({
      degreeName: "Software Engineering",
      missingCourses: softwareEngineeringCheck?.exactRequiredCoursesMissing ?? [],
      parsedCourseCodes,
      courseStatuses,
    });
  }

  if (targetPath === "computer_science") {
    return collectDegreeSuggestions({
      degreeName: "Computer Science",
      missingCourses: computerScienceCheck?.exactRequiredCoursesMissing ?? [],
      parsedCourseCodes,
      courseStatuses,
    });
  }

  const aiSuggestions = collectAiCertificateSuggestions(
    aiCertificateCheck,
    courseStatuses,
  );
  const softwareEngineeringSuggestions = collectDegreeSuggestions({
    degreeName: "Software Engineering",
    missingCourses: softwareEngineeringCheck?.exactRequiredCoursesMissing ?? [],
    parsedCourseCodes,
    courseStatuses,
  });
  const computerScienceSuggestions = collectDegreeSuggestions({
    degreeName: "Computer Science",
    missingCourses: computerScienceCheck?.exactRequiredCoursesMissing ?? [],
    parsedCourseCodes,
    courseStatuses,
  });

  return {
    suggestedCourses: [
      ...aiSuggestions.suggestedCourses,
      ...softwareEngineeringSuggestions.suggestedCourses,
      ...computerScienceSuggestions.suggestedCourses,
    ],
    notYetRecommended: [
      ...aiSuggestions.notYetRecommended,
      ...softwareEngineeringSuggestions.notYetRecommended,
      ...computerScienceSuggestions.notYetRecommended,
    ],
  };
}

function collectAiCertificateSuggestions(
  aiCertificateCheck: AiCertificateCheckResult | null,
  courseStatuses: Map<string, DegreeWorksCourseStatusRecord>,
) {
  if (!aiCertificateCheck) {
    return { suggestedCourses: [], notYetRecommended: [] };
  }

  if (aiCertificateCheck.requiredCoursesMissing.length > 0) {
    return partitionStatusAwareSuggestions(
      aiCertificateCheck.requiredCoursesMissing.map((course) => ({
        code: course.code,
        title: course.title,
        reason:
          "This required AI Engineering certificate course was not found in the parsed Degree Works plan.",
        category: "certificate_requirement" as const,
        priority: "high" as const,
        advisorVerificationRequired: true,
      })),
      courseStatuses,
    );
  }

  if (aiCertificateCheck.electiveCandidatesFound.length === 0) {
    return {
      suggestedCourses: [
        {
          code: "Approved AI elective",
          reason:
            "The required AI certificate courses were found, but the local check did not find a planned approved AI elective candidate.",
          category: "advisor_review" as const,
          priority: "medium" as const,
          advisorVerificationRequired: true,
        },
      ],
      notYetRecommended: [],
    };
  }

  return { suggestedCourses: [], notYetRecommended: [] };
}

function collectDegreeSuggestions({
  degreeName,
  missingCourses,
  parsedCourseCodes,
  courseStatuses,
}: {
  degreeName: string;
  missingCourses: CourseRule[];
  parsedCourseCodes: string[];
  courseStatuses: Map<string, DegreeWorksCourseStatusRecord>;
}) {
  const suggestedCourses: NextSemesterSuggestedCourse[] = [];
  const notYetRecommended: NextSemesterNotYetRecommendedCourse[] = [];

  for (const course of missingCourses) {
    const statusRecord = courseStatuses.get(course.code);

    if (statusRecord?.status === "completed" && statusRecord.confidence === "high") {
      notYetRecommended.push({
        code: course.code,
        reason: `${course.code} appears completed in the parsed Degree Works status evidence; verify it with an advisor instead of adding it again.`,
      });
      continue;
    }

    if (
      statusRecord &&
      (statusRecord.status === "planned" || statusRecord.status === "in_progress")
    ) {
      notYetRecommended.push({
        code: course.code,
        reason: `${course.code} appears ${formatCourseStatus(
          statusRecord.status,
        )} in Degree Works; verify enrollment or completion with an advisor instead of adding it again.`,
      });
      continue;
    }

    const missingPrerequisites = getModeledMissingPrerequisites(
      course.code,
      parsedCourseCodes,
    );

    if (missingPrerequisites.length > 0) {
      notYetRecommended.push({
        code: course.code,
        reason: `${course.code} should wait until modeled prerequisite(s) ${missingPrerequisites.join(
          ", ",
        )} are completed or verified by an advisor.`,
      });
      continue;
    }

    suggestedCourses.push({
      code: course.code,
      title: course.title,
      reason: `${course.code} is a missing exact required ${degreeName} course in the local deterministic check, with no missing modeled prerequisite found.`,
      category: course.code.startsWith("COMP ")
        ? "prerequisite_foundation"
        : "missing_required",
      priority: "high",
      advisorVerificationRequired: true,
    });
  }

  return { suggestedCourses, notYetRecommended };
}

function partitionStatusAwareSuggestions(
  suggestions: NextSemesterSuggestedCourse[],
  courseStatuses: Map<string, DegreeWorksCourseStatusRecord>,
) {
  const suggestedCourses: NextSemesterSuggestedCourse[] = [];
  const notYetRecommended: NextSemesterNotYetRecommendedCourse[] = [];

  for (const suggestion of suggestions) {
    const statusRecord = courseStatuses.get(suggestion.code);

    if (statusRecord?.status === "completed" && statusRecord.confidence === "high") {
      notYetRecommended.push({
        code: suggestion.code,
        reason: `${suggestion.code} appears completed in the parsed Degree Works status evidence; verify it with an advisor instead of adding it again.`,
      });
      continue;
    }

    if (
      statusRecord &&
      (statusRecord.status === "planned" || statusRecord.status === "in_progress")
    ) {
      notYetRecommended.push({
        code: suggestion.code,
        reason: `${suggestion.code} appears ${formatCourseStatus(
          statusRecord.status,
        )} in Degree Works; verify enrollment or completion with an advisor instead of adding it again.`,
      });
      continue;
    }

    suggestedCourses.push(suggestion);
  }

  return { suggestedCourses, notYetRecommended };
}

function buildNotes({
  computerScienceCheck,
  parserConfidence,
  parserWarnings,
  prerequisiteCheck,
  resolvedTargetPath,
  suggestedCourses,
  softwareEngineeringCheck,
}: {
  computerScienceCheck: ComputerScienceDegreeCheckResult | null;
  parserConfidence: DegreeWorksParserConfidence;
  parserWarnings: string[];
  prerequisiteCheck: SoftwareEngineeringPrerequisiteCheckResult | null;
  resolvedTargetPath: NextSemesterTargetPath;
  suggestedCourses: NextSemesterSuggestedCourse[];
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult | null;
}) {
  const notes = [
    "These are conservative next-semester planning suggestions, not a complete graduation plan.",
    "This is not registration advice or an official schedule.",
    "Course availability, prerequisites, AP/transfer credit, substitutions, and advisor approval may change these suggestions.",
    `Suggestion target path: ${formatTargetPath(resolvedTargetPath)}.`,
  ];

  if (parserConfidence === "low") {
    notes.push(
      "The PDF parser confidence is low, so the PDF may not contain enough reliable information for strong suggestions.",
    );
  }

  if (parserWarnings.length > 0) {
    notes.push("Parser warnings should be reviewed before relying on these suggestions.");
  }

  if (prerequisiteCheck?.prerequisiteIssues.length) {
    notes.push(
      "The prerequisite check found sequence warnings or advisor-review items that may affect next-semester choices.",
    );
  }

  if (
    hasUnresolvedRequirementBlocks({
      computerScienceCheck,
      softwareEngineeringCheck,
    })
  ) {
    notes.push(
      "Unresolved core and elective requirement blocks are not converted into specific course suggestions unless the local rules can verify them safely.",
    );
  }

  if (suggestedCourses.length === 0) {
    notes.push(
      "No specific course suggestions were produced from the current deterministic rules; discuss remaining advisor-review items instead.",
    );
  }

  return dedupeStrings(notes);
}

function hasUnresolvedRequirementBlocks({
  computerScienceCheck,
  softwareEngineeringCheck,
}: {
  computerScienceCheck: ComputerScienceDegreeCheckResult | null;
  softwareEngineeringCheck: SoftwareEngineeringDegreeCheckResult | null;
}) {
  return [computerScienceCheck, softwareEngineeringCheck].some((check) =>
    check?.requirementBlocks.some((block) => block.status !== "satisfied"),
  );
}

function formatTargetPath(path: NextSemesterTargetPath) {
  switch (path) {
    case "ai_certificate":
      return "AI Engineering certificate";
    case "software_engineering":
      return "Software Engineering";
    case "computer_science":
      return "Computer Science";
    case "mixed_or_unclear":
      return "mixed or unclear";
  }
}

function dedupeSuggestedCourses(courses: NextSemesterSuggestedCourse[]) {
  const seen = new Set<string>();

  return courses.filter((course) => {
    const key = course.code.toUpperCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeNotYetRecommended(
  courses: NextSemesterNotYetRecommendedCourse[],
) {
  const seen = new Set<string>();

  return courses.filter((course) => {
    const key = course.code.toUpperCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function dedupeStrings(items: string[]) {
  return Array.from(new Set(items));
}

function getCourseStatusMap(records: DegreeWorksCourseStatusRecord[]) {
  return new Map(records.map((record) => [record.code, record]));
}

function formatCourseStatus(status: DegreeWorksCourseStatus) {
  switch (status) {
    case "completed":
      return "completed";
    case "in_progress":
      return "in progress";
    case "planned":
      return "planned";
    case "transfer_or_ap":
      return "transfer/AP";
    case "substituted_or_waived":
      return "substituted/waived";
    case "missing":
      return "missing";
    case "unknown":
      return "unknown";
  }
}

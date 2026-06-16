import computerScienceDegreeRuleJson from "../../../rules/auburn/computer-science-degree.json" with { type: "json" };

export type CourseRule = {
  code: string;
  title: string;
  creditHours: number;
};

export type AlternativeCourseGroupRule = {
  name: string;
  minimumCoursesRequired: number;
  courses: CourseRule[];
};

export type AdvisorVerifiedRequirementRule = {
  name: string;
  creditHoursRequired: number;
};

export type ComputerScienceDegreeRule = {
  degreeName: string;
  program: string;
  catalogYear: string;
  totalHoursRequired: number;
  sourceId: string;
  exactRequiredCourses: CourseRule[];
  alternativeCourseGroups: AlternativeCourseGroupRule[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirementRule[];
};

export type AlternativeCourseGroupCheck = AlternativeCourseGroupRule & {
  satisfiedCourses: CourseRule[];
  missingCourseOptions: CourseRule[];
  isSatisfied: boolean;
};

export type ComputerScienceDegreeCheckResult = {
  exactRequiredCoursesSatisfied: CourseRule[];
  exactRequiredCoursesMissing: CourseRule[];
  alternativeCourseGroups: AlternativeCourseGroupCheck[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirementRule[];
  totalHoursRequired: number;
  totalPlannedCredits: number | null;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export const computerScienceDegreeRule =
  computerScienceDegreeRuleJson as ComputerScienceDegreeRule;

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

export function checkComputerScienceDegree({
  courseCodes,
  totalPlannedCredits = null,
}: {
  courseCodes: string[];
  totalPlannedCredits?: number | null;
}): ComputerScienceDegreeCheckResult {
  const plannedCourses = new Set(courseCodes.map(normalizeCourseCode));

  const exactRequiredCoursesSatisfied =
    computerScienceDegreeRule.exactRequiredCourses.filter((course) =>
      plannedCourses.has(normalizeCourseCode(course.code)),
    );

  const exactRequiredCoursesMissing =
    computerScienceDegreeRule.exactRequiredCourses.filter(
      (course) => !plannedCourses.has(normalizeCourseCode(course.code)),
    );

  const alternativeCourseGroups =
    computerScienceDegreeRule.alternativeCourseGroups.map((group) => {
      const satisfiedCourses = group.courses.filter((course) =>
        plannedCourses.has(normalizeCourseCode(course.code)),
      );

      return {
        ...group,
        satisfiedCourses,
        missingCourseOptions: group.courses.filter(
          (course) => !plannedCourses.has(normalizeCourseCode(course.code)),
        ),
        isSatisfied: satisfiedCourses.length >= group.minimumCoursesRequired,
      };
    });

  const allExactRequiredCoursesSatisfied =
    exactRequiredCoursesMissing.length === 0;
  const allAlternativeGroupsSatisfied = alternativeCourseGroups.every(
    (group) => group.isSatisfied,
  );
  const hasEnoughTotalCredits =
    totalPlannedCredits === null
      ? null
      : totalPlannedCredits >= computerScienceDegreeRule.totalHoursRequired;

  const isLikelyComplete =
    allExactRequiredCoursesSatisfied &&
    allAlternativeGroupsSatisfied &&
    hasEnoughTotalCredits === true;

  return {
    exactRequiredCoursesSatisfied,
    exactRequiredCoursesMissing,
    alternativeCourseGroups,
    advisorVerifiedRequirements:
      computerScienceDegreeRule.advisorVerifiedRequirements,
    totalHoursRequired: computerScienceDegreeRule.totalHoursRequired,
    totalPlannedCredits,
    hasEnoughTotalCredits,
    isLikelyComplete,
    advisorVerificationRequired: true,
    notes: buildNotes({
      allExactRequiredCoursesSatisfied,
      allAlternativeGroupsSatisfied,
      hasEnoughTotalCredits,
    }),
  };
}

function buildNotes({
  allExactRequiredCoursesSatisfied,
  allAlternativeGroupsSatisfied,
  hasEnoughTotalCredits,
}: {
  allExactRequiredCoursesSatisfied: boolean;
  allAlternativeGroupsSatisfied: boolean;
  hasEnoughTotalCredits: boolean | null;
}) {
  const notes: string[] = [
    `${computerScienceDegreeRule.degreeName} requires ${computerScienceDegreeRule.totalHoursRequired} total hours for catalog year ${computerScienceDegreeRule.catalogYear}.`,
    `Requirement source: ${computerScienceDegreeRule.sourceId}.`,
  ];

  if (allExactRequiredCoursesSatisfied) {
    notes.push("All exact required Computer Science courses were found.");
  } else {
    notes.push(
      "One or more exact required Computer Science courses were not found.",
    );
  }

  if (allAlternativeGroupsSatisfied) {
    notes.push("All alternative course groups have at least one matching course.");
  } else {
    notes.push("One or more alternative course groups are not satisfied.");
  }

  if (hasEnoughTotalCredits === null) {
    notes.push("Total planned credits were not provided.");
  } else if (hasEnoughTotalCredits) {
    notes.push("Total planned credits meet or exceed the degree requirement.");
  } else {
    notes.push("Total planned credits are below the degree requirement.");
  }

  notes.push(
    "Core, math elective, technical elective, free elective, AP, transfer, substitution, hidden Degree Works section, prerequisite, and semester-order checks require advisor verification.",
  );

  return notes;
}

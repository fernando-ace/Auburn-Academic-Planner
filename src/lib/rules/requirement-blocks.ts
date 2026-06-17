export type RequirementBlockStatus =
  | "satisfied"
  | "missing"
  | "partial"
  | "advisor_review"
  | "insufficient_data";

export type RequirementBlockResult = {
  blockName: string;
  status: RequirementBlockStatus;
  satisfiedCourses: string[];
  missingCourses: string[];
  candidateCourses: string[];
  requiredCredits?: number;
  matchedCredits?: number;
  notes: string[];
};

export type RequirementBlockCourse = {
  code: string;
  title: string;
  creditHours: number;
};

type BaseRequirementBlockDefinition = {
  blockName: string;
  requiredCredits?: number;
  notes?: string[];
};

export type ExactCourseRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "exact_course";
    course: RequirementBlockCourse;
  };

export type OneOfManyRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "one_of_many";
    minimumCoursesRequired?: number;
    courses: RequirementBlockCourse[];
  };

export type MinimumCreditsRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "minimum_credits_from_list";
    requiredCredits: number;
    courses: RequirementBlockCourse[];
    autoSatisfy?: boolean;
  };

export type PrefixLevelRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "prefix_level_candidate";
    requiredCredits: number;
    prefixes: string[];
    minimumLevel: number;
    maximumLevel?: number;
    defaultCreditHours?: number;
    excludedCourses?: string[];
    autoSatisfy?: boolean;
  };

export type AdvisorVerifiedRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "advisor_verified";
    requiredCredits: number;
  };

export type UnknownRequirementBlockDefinition =
  BaseRequirementBlockDefinition & {
    type: "unknown_or_insufficient_data";
  };

export type RequirementBlockDefinition =
  | ExactCourseRequirementBlockDefinition
  | OneOfManyRequirementBlockDefinition
  | MinimumCreditsRequirementBlockDefinition
  | PrefixLevelRequirementBlockDefinition
  | AdvisorVerifiedRequirementBlockDefinition
  | UnknownRequirementBlockDefinition;

export function evaluateRequirementBlocks({
  blocks,
  courseCodes,
}: {
  blocks: RequirementBlockDefinition[];
  courseCodes: string[];
}): RequirementBlockResult[] {
  const plannedCourses = Array.from(new Set(courseCodes.map(normalizeCourseCode)));

  return blocks.map((block) => evaluateRequirementBlock(block, plannedCourses));
}

function evaluateRequirementBlock(
  block: RequirementBlockDefinition,
  plannedCourses: string[],
): RequirementBlockResult {
  switch (block.type) {
    case "exact_course":
      return evaluateExactCourseBlock(block, plannedCourses);
    case "one_of_many":
      return evaluateOneOfManyBlock(block, plannedCourses);
    case "minimum_credits_from_list":
      return evaluateMinimumCreditsBlock(block, plannedCourses);
    case "prefix_level_candidate":
      return evaluatePrefixLevelBlock(block, plannedCourses);
    case "advisor_verified":
      return {
        blockName: block.blockName,
        status: "advisor_review",
        satisfiedCourses: [],
        missingCourses: [],
        candidateCourses: [],
        requiredCredits: block.requiredCredits,
        notes: [
          ...readNotes(block),
          "This block requires advisor or official Degree Works verification before it can be marked satisfied.",
        ],
      };
    case "unknown_or_insufficient_data":
      return {
        blockName: block.blockName,
        status: "insufficient_data",
        satisfiedCourses: [],
        missingCourses: [],
        candidateCourses: [],
        requiredCredits: block.requiredCredits,
        notes: [
          ...readNotes(block),
          "The local rules do not contain enough approved-course data to validate this block deterministically.",
        ],
      };
  }
}

function evaluateExactCourseBlock(
  block: ExactCourseRequirementBlockDefinition,
  plannedCourses: string[],
): RequirementBlockResult {
  const courseCode = normalizeCourseCode(block.course.code);
  const isSatisfied = plannedCourses.includes(courseCode);

  return {
    blockName: block.blockName,
    status: isSatisfied ? "satisfied" : "missing",
    satisfiedCourses: isSatisfied ? [courseCode] : [],
    missingCourses: isSatisfied ? [] : [courseCode],
    candidateCourses: [courseCode],
    requiredCredits: block.requiredCredits ?? block.course.creditHours,
    matchedCredits: isSatisfied ? block.course.creditHours : 0,
    notes: readNotes(block),
  };
}

function evaluateOneOfManyBlock(
  block: OneOfManyRequirementBlockDefinition,
  plannedCourses: string[],
): RequirementBlockResult {
  const minimumCoursesRequired = block.minimumCoursesRequired ?? 1;
  const candidateCodes = block.courses.map((course) =>
    normalizeCourseCode(course.code),
  );
  const satisfiedCourses = candidateCodes.filter((courseCode) =>
    plannedCourses.includes(courseCode),
  );
  const matchedCredits = sumCourseCredits(block.courses, satisfiedCourses);
  const isSatisfied = satisfiedCourses.length >= minimumCoursesRequired;

  return {
    blockName: block.blockName,
    status: isSatisfied
      ? "satisfied"
      : satisfiedCourses.length > 0
        ? "partial"
        : "missing",
    satisfiedCourses,
    missingCourses: isSatisfied ? [] : candidateCodes,
    candidateCourses: candidateCodes,
    requiredCredits: block.requiredCredits,
    matchedCredits,
    notes: readNotes(block),
  };
}

function evaluateMinimumCreditsBlock(
  block: MinimumCreditsRequirementBlockDefinition,
  plannedCourses: string[],
): RequirementBlockResult {
  const candidateCodes = block.courses.map((course) =>
    normalizeCourseCode(course.code),
  );
  const satisfiedCourses = candidateCodes.filter((courseCode) =>
    plannedCourses.includes(courseCode),
  );
  const matchedCredits = sumCourseCredits(block.courses, satisfiedCourses);
  const creditStatus = getCreditStatus(matchedCredits, block.requiredCredits);

  return {
    blockName: block.blockName,
    status: block.autoSatisfy === false ? "advisor_review" : creditStatus,
    satisfiedCourses: block.autoSatisfy === false ? [] : satisfiedCourses,
    missingCourses: creditStatus === "satisfied" ? [] : candidateCodes,
    candidateCourses: satisfiedCourses,
    requiredCredits: block.requiredCredits,
    matchedCredits,
    notes:
      block.autoSatisfy === false
        ? [
            ...readNotes(block),
            "Candidate courses were found, but this block still requires advisor approval before it can be marked satisfied.",
          ]
        : readNotes(block),
  };
}

function evaluatePrefixLevelBlock(
  block: PrefixLevelRequirementBlockDefinition,
  plannedCourses: string[],
): RequirementBlockResult {
  const excludedCourses = new Set(
    (block.excludedCourses ?? []).map(normalizeCourseCode),
  );
  const prefixes = block.prefixes.map((prefix) => prefix.trim().toUpperCase());
  const candidateCourses = plannedCourses.filter((courseCode) => {
    const parsedCourse = parseCourseCode(courseCode);

    return (
      parsedCourse &&
      prefixes.includes(parsedCourse.prefix) &&
      parsedCourse.level >= block.minimumLevel &&
      (block.maximumLevel === undefined ||
        parsedCourse.level <= block.maximumLevel) &&
      !excludedCourses.has(courseCode)
    );
  });
  const matchedCredits =
    candidateCourses.length * (block.defaultCreditHours ?? 0);
  const creditStatus = getCreditStatus(matchedCredits, block.requiredCredits);

  return {
    blockName: block.blockName,
    status: block.autoSatisfy === true ? creditStatus : "advisor_review",
    satisfiedCourses: block.autoSatisfy === true ? candidateCourses : [],
    missingCourses: [],
    candidateCourses,
    requiredCredits: block.requiredCredits,
    matchedCredits,
    notes:
      block.autoSatisfy === true
        ? readNotes(block)
        : [
            ...readNotes(block),
            "These are prefix/level candidates only; the approved elective list and Degree Works block must be verified by an advisor.",
          ],
  };
}

function getCreditStatus(
  matchedCredits: number,
  requiredCredits: number,
): RequirementBlockStatus {
  if (matchedCredits >= requiredCredits) {
    return "satisfied";
  }

  return matchedCredits > 0 ? "partial" : "missing";
}

function sumCourseCredits(
  courses: RequirementBlockCourse[],
  matchingCourseCodes: string[],
) {
  const matchingSet = new Set(matchingCourseCodes.map(normalizeCourseCode));

  return courses.reduce(
    (total, course) =>
      matchingSet.has(normalizeCourseCode(course.code))
        ? total + course.creditHours
        : total,
    0,
  );
}

function parseCourseCode(courseCode: string) {
  const match = /^([A-Z]{2,5})\s+(\d{4}[A-Z]?)$/.exec(courseCode);

  if (!match) {
    return null;
  }

  return {
    prefix: match[1],
    level: Number(match[2].slice(0, 1)) * 1000,
  };
}

function readNotes(block: BaseRequirementBlockDefinition) {
  return block.notes ?? [];
}

export function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

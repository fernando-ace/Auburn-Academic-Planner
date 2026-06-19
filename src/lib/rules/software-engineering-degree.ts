import softwareEngineeringDegreeRuleJson from "../../../rules/auburn/software-engineering-degree.json" with { type: "json" };
import {
  evaluateRequirementBlocks,
  type RequirementBlockDefinition,
  type RequirementBlockResult,
} from "./requirement-blocks.ts";
import {
  createRuleProvenance,
  inheritRuleProvenance,
  type RuleProvenance,
  type RuleProvenanceOverride,
} from "./rule-provenance.ts";

export type CourseRule = {
  code: string;
  title: string;
  creditHours: number;
};

export type AlternativeCourseGroupRule = {
  name: string;
  minimumCoursesRequired: number;
  courses: CourseRule[];
  provenance?: RuleProvenanceOverride;
};

export type AdvisorVerifiedRequirementRule = {
  name: string;
  creditHoursRequired: number;
};

export type SoftwareEngineeringDegreeRule = {
  degreeName: string;
  program: string;
  catalogYear: string;
  totalHoursRequired: number;
  sourceId: string;
  provenance: RuleProvenance;
  exactRequiredCourses: CourseRule[];
  alternativeCourseGroups: AlternativeCourseGroupRule[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirementRule[];
  requirementBlocks: RequirementBlockDefinition[];
};

export type AlternativeCourseGroupCheck = AlternativeCourseGroupRule & {
  provenance: RuleProvenance;
  satisfiedCourses: CourseRule[];
  missingCourseOptions: CourseRule[];
  isSatisfied: boolean;
};

export type SoftwareEngineeringDegreeCheckResult = {
  provenance: RuleProvenance;
  exactRequiredCoursesSatisfied: CourseRule[];
  exactRequiredCoursesMissing: CourseRule[];
  alternativeCourseGroups: AlternativeCourseGroupCheck[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirementRule[];
  requirementBlocks: RequirementBlockResult[];
  totalHoursRequired: number;
  totalPlannedCredits: number | null;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export const softwareEngineeringDegreeRule =
  softwareEngineeringDegreeRuleJson as SoftwareEngineeringDegreeRule;

export const softwareEngineeringDegreeProvenance = createRuleProvenance(
  softwareEngineeringDegreeRule.provenance,
);

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

export function checkSoftwareEngineeringDegree({
  courseCodes,
  totalPlannedCredits = null,
}: {
  courseCodes: string[];
  totalPlannedCredits?: number | null;
}): SoftwareEngineeringDegreeCheckResult {
  const plannedCourses = new Set(courseCodes.map(normalizeCourseCode));

  const exactRequiredCoursesSatisfied =
    softwareEngineeringDegreeRule.exactRequiredCourses.filter((course) =>
      plannedCourses.has(normalizeCourseCode(course.code)),
    );

  const exactRequiredCoursesMissing =
    softwareEngineeringDegreeRule.exactRequiredCourses.filter(
      (course) => !plannedCourses.has(normalizeCourseCode(course.code)),
    );

  const alternativeCourseGroups =
    softwareEngineeringDegreeRule.alternativeCourseGroups.map((group) => {
      const satisfiedCourses = group.courses.filter((course) =>
        plannedCourses.has(normalizeCourseCode(course.code)),
      );

      return {
        ...group,
        provenance: inheritRuleProvenance(
          softwareEngineeringDegreeProvenance,
          group.provenance,
        ),
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
  const requirementBlocks = evaluateRequirementBlocks({
    blocks: softwareEngineeringDegreeRule.requirementBlocks,
    courseCodes: courseCodes,
    provenance: softwareEngineeringDegreeProvenance,
  });
  const hasEnoughTotalCredits =
    totalPlannedCredits === null
      ? null
      : totalPlannedCredits >= softwareEngineeringDegreeRule.totalHoursRequired;

  const isLikelyComplete =
    allExactRequiredCoursesSatisfied &&
    allAlternativeGroupsSatisfied &&
    hasEnoughTotalCredits === true;

  return {
    provenance: softwareEngineeringDegreeProvenance,
    exactRequiredCoursesSatisfied,
    exactRequiredCoursesMissing,
    alternativeCourseGroups,
    advisorVerifiedRequirements:
      softwareEngineeringDegreeRule.advisorVerifiedRequirements,
    requirementBlocks,
    totalHoursRequired: softwareEngineeringDegreeRule.totalHoursRequired,
    totalPlannedCredits,
    hasEnoughTotalCredits,
    isLikelyComplete,
    advisorVerificationRequired: true,
    notes: buildNotes({
      allExactRequiredCoursesSatisfied,
      allAlternativeGroupsSatisfied,
      hasEnoughTotalCredits,
      requirementBlocks,
    }),
  };
}

function buildNotes({
  allExactRequiredCoursesSatisfied,
  allAlternativeGroupsSatisfied,
  hasEnoughTotalCredits,
  requirementBlocks,
}: {
  allExactRequiredCoursesSatisfied: boolean;
  allAlternativeGroupsSatisfied: boolean;
  hasEnoughTotalCredits: boolean | null;
  requirementBlocks: RequirementBlockResult[];
}) {
  const notes: string[] = [
    `${softwareEngineeringDegreeRule.degreeName} requires ${softwareEngineeringDegreeRule.totalHoursRequired} total hours for catalog year ${softwareEngineeringDegreeRule.catalogYear}.`,
    `Requirement source: ${softwareEngineeringDegreeRule.sourceId}.`,
  ];

  if (allExactRequiredCoursesSatisfied) {
    notes.push("All exact required Software Engineering courses were found.");
  } else {
    notes.push(
      "One or more exact required Software Engineering courses were not found.",
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
    "Structured core and elective requirement blocks are included, but unresolved blocks still require advisor or official Degree Works verification.",
  );

  const unresolvedBlockNames = requirementBlocks
    .filter((block) => block.status !== "satisfied")
    .map((block) => `${block.blockName} (${block.status})`);

  if (unresolvedBlockNames.length > 0) {
    notes.push(
      `Unresolved requirement blocks: ${unresolvedBlockNames.join(", ")}.`,
    );
  }

  return notes;
}

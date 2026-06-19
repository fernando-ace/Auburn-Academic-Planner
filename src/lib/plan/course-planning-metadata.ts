import planningMetadataJson from "../../../rules/auburn/course-planning-metadata.json" with { type: "json" };
import { aiEngineeringCertificateRule } from "../rules/ai-certificate.ts";
import { computerScienceDegreeRule } from "../rules/computer-science-degree.ts";
import { getModeledMissingPrerequisites } from "../rules/software-engineering-prerequisites.ts";
import { softwareEngineeringDegreeRule } from "../rules/software-engineering-degree.ts";
import {
  createRuleProvenance,
  type RuleProvenance,
} from "../rules/rule-provenance.ts";

export type PlanningTerm = "spring" | "summer" | "fall" | "winter";

export type AvailabilityConfidence =
  | "known_local_rule"
  | "unknown_requires_advisor_review";

export type CoursePlanningMetadata = {
  code: string;
  title?: string;
  creditHours?: number;
  typicalTerms: PlanningTerm[];
  availabilityConfidence: AvailabilityConfidence;
  planningNotes: string[];
  provenance?: RuleProvenance;
};

type MetadataSeed = {
  code: string;
  title?: string;
  creditHours?: number;
};

type PlanningMetadataRule = {
  catalogYear: string;
  provenance: RuleProvenance;
  courses: Record<
    string,
    { typicalTerms: PlanningTerm[]; planningNotes: string[] }
  >;
  requirementBlocks: Record<string, string>;
};

const planningMetadataRule = planningMetadataJson as PlanningMetadataRule;
export const coursePlanningMetadataProvenance = createRuleProvenance(
  planningMetadataRule.provenance,
);

const coursePlanningMetadataByCode = buildMetadataMap();

export function getCoursePlanningMetadata(
  courseCode: string,
): CoursePlanningMetadata | null {
  return coursePlanningMetadataByCode.get(normalizeCourseCode(courseCode)) ?? null;
}

export function getAllCoursePlanningMetadata() {
  return Array.from(coursePlanningMetadataByCode.values());
}

export function getRequirementBlockPlanningNote(blockName: string) {
  return planningMetadataRule.requirementBlocks[blockName.trim().toUpperCase()] ?? null;
}

function buildMetadataMap() {
  const metadataByCode = new Map<string, CoursePlanningMetadata>();
  const seeds: MetadataSeed[] = [
    ...softwareEngineeringDegreeRule.exactRequiredCourses,
    ...softwareEngineeringDegreeRule.alternativeCourseGroups.flatMap(
      (group) => group.courses,
    ),
    ...computerScienceDegreeRule.exactRequiredCourses,
    ...computerScienceDegreeRule.alternativeCourseGroups.flatMap(
      (group) => group.courses,
    ),
    ...aiEngineeringCertificateRule.requiredCourses,
    ...aiEngineeringCertificateRule.electiveRequirement.candidateCourses,
    {
      code: "Approved AI elective",
      title: "Department-approved AI elective",
      creditHours:
        aiEngineeringCertificateRule.electiveRequirement.creditHoursRequired,
    },
  ];

  for (const seed of seeds) {
    const code = normalizeCourseCode(seed.code);
    const existing = metadataByCode.get(code);

    metadataByCode.set(code, {
      code: seed.code === "Approved AI elective" ? seed.code : code,
      title: existing?.title ?? seed.title,
      creditHours: existing?.creditHours ?? seed.creditHours,
      typicalTerms: planningMetadataRule.courses[code]?.typicalTerms ?? [],
      availabilityConfidence: "unknown_requires_advisor_review",
      planningNotes: buildPlanningNotes(code),
      provenance: coursePlanningMetadataProvenance,
    });
  }

  return metadataByCode;
}

function buildPlanningNotes(code: string) {
  const courseRule = planningMetadataRule.courses[code];
  const notes = [...(courseRule?.planningNotes ?? [])];
  const modeledPrerequisites = getModeledMissingPrerequisites(code, []);

  if (modeledPrerequisites.length > 0) {
    notes.push(
      `Modeled prerequisite(s): ${modeledPrerequisites.join(", ")}; verify catalog eligibility before registration.`,
    );
  }

  const curriculumTerms = courseRule?.typicalTerms;
  if (curriculumTerms?.length) {
    notes.push(
      `The checked-in bulletin plan grid places this item in ${formatTerms(curriculumTerms)}, but that is a curriculum hint, not proof of live availability.`,
    );
  }

  return notes;
}

function formatTerms(terms: PlanningTerm[]) {
  return terms.map((term) => `${term[0].toUpperCase()}${term.slice(1)}`).join(" or ");
}

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

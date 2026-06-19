import { aiEngineeringCertificateRule } from "../rules/ai-certificate.ts";
import { computerScienceDegreeRule } from "../rules/computer-science-degree.ts";
import { getModeledMissingPrerequisites } from "../rules/software-engineering-prerequisites.ts";
import { softwareEngineeringDegreeRule } from "../rules/software-engineering-degree.ts";

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
};

type MetadataSeed = {
  code: string;
  title?: string;
  creditHours?: number;
};

const curriculumTermHints: Partial<Record<string, PlanningTerm[]>> = {
  "COMP 4710": ["spring"],
  "COMP 4810": ["spring"],
  "UNIV 4AA0": ["spring"],
};

const specialPlanningNotes: Partial<Record<string, string[]>> = {
  "COMP 4710": [
    "Verify senior standing and any department approval requirements for Senior Design Project.",
  ],
  "COMP 4810": [
    "Treat Program Assessment as a zero-credit graduation milestone, not a credit-bearing course load item.",
  ],
  "UNIV 4AA0": [
    "Treat the university graduation requirement as a zero-credit milestone and verify completion steps with an advisor.",
  ],
  "APPROVED AI ELECTIVE": [
    "Confirm the course is an approved AI elective and is offered in the target term before registration.",
  ],
};

const requirementBlockPlanningNotes: Partial<Record<string, string>> = {
  "CORE SCIENCE SEQUENCE":
    "Confirm the approved core science sequence and whether its courses are offered in the intended terms.",
  "CORE HISTORY SEQUENCE":
    "Confirm the approved core history sequence and target-term offerings with an advisor.",
  "CORE LITERATURE":
    "Choose a qualifying core literature course only after Degree Works and target-term offering review.",
  "CORE SOCIAL SCIENCE ELECTIVE":
    "Choose a qualifying core social science elective only after Degree Works and target-term offering review.",
  "CORE FINE ARTS":
    "Choose a qualifying core fine arts course only after Degree Works and target-term offering review.",
  "MATH ELECTIVE":
    "Verify the approved math elective list, prerequisites, and target-term offering before selection.",
  "MATH ELECTIVES":
    "Verify the approved math elective list, prerequisites, and target-term offering before selection.",
  "TECHNICAL ELECTIVES":
    "Verify CSSE approval, prerequisites, and target-term offerings before choosing technical electives.",
  "FREE ELECTIVE":
    "Confirm how a proposed free elective applies in Degree Works and whether it is offered in the target term.",
};

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
  return requirementBlockPlanningNotes[blockName.trim().toUpperCase()] ?? null;
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
      typicalTerms: [],
      availabilityConfidence: "unknown_requires_advisor_review",
      planningNotes: buildPlanningNotes(code),
    });
  }

  return metadataByCode;
}

function buildPlanningNotes(code: string) {
  const notes = [...(specialPlanningNotes[code] ?? [])];
  const modeledPrerequisites = getModeledMissingPrerequisites(code, []);

  if (modeledPrerequisites.length > 0) {
    notes.push(
      `Modeled prerequisite(s): ${modeledPrerequisites.join(", ")}; verify catalog eligibility before registration.`,
    );
  }

  const curriculumTerms = curriculumTermHints[code];
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

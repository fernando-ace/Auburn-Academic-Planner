import aiCertificateRule from "../../../rules/auburn/ai-engineering-certificate.json" with { type: "json" };
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

export type ElectiveCandidateRule = CourseRule & {
  approvalStatus: "candidate_requires_advisor_verification";
};

export type AiCertificateCheckResult = {
  provenance: RuleProvenance;
  requiredCoursesSatisfied: CourseRule[];
  requiredCoursesMissing: CourseRule[];
  electiveCandidatesFound: ElectiveCandidateRule[];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

type AiCertificateRule = {
  certificateName: string;
  catalogYear: string;
  totalHoursRequired: number;
  sourceId: string;
  provenance: RuleProvenance;
  requiredCourses: CourseRule[];
  electiveRequirement: {
    description: string;
    creditHoursRequired: number;
    approvalRequired: boolean;
    provenance: RuleProvenanceOverride;
    candidateCourses: ElectiveCandidateRule[];
  };
};

export const aiEngineeringCertificateRule =
  aiCertificateRule as AiCertificateRule;

export const aiEngineeringCertificateProvenance = createRuleProvenance(
  aiEngineeringCertificateRule.provenance,
);

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

export function checkAiEngineeringCertificate(
  courseCodes: string[],
): AiCertificateCheckResult {
  const plannedCourses = new Set(courseCodes.map(normalizeCourseCode));
  const requiredCoursesSatisfied =
    aiEngineeringCertificateRule.requiredCourses.filter((course) =>
      plannedCourses.has(normalizeCourseCode(course.code)),
    );
  const requiredCoursesMissing =
    aiEngineeringCertificateRule.requiredCourses.filter(
      (course) => !plannedCourses.has(normalizeCourseCode(course.code)),
    );
  const electiveCandidatesFound =
    aiEngineeringCertificateRule.electiveRequirement.candidateCourses.filter(
      (course) => plannedCourses.has(normalizeCourseCode(course.code)),
    );
  const hasRequiredCourses = requiredCoursesMissing.length === 0;
  const hasElectiveCandidate = electiveCandidatesFound.length > 0;

  return {
    provenance: aiEngineeringCertificateProvenance,
    requiredCoursesSatisfied,
    requiredCoursesMissing,
    electiveCandidatesFound: electiveCandidatesFound.map((course) => ({
      ...course,
      provenance: inheritRuleProvenance(
        aiEngineeringCertificateProvenance,
        aiEngineeringCertificateRule.electiveRequirement.provenance,
      ),
    })),
    isLikelyComplete: hasRequiredCourses && hasElectiveCandidate,
    advisorVerificationRequired:
      aiEngineeringCertificateRule.electiveRequirement.approvalRequired,
    notes: buildNotes({
      hasRequiredCourses,
      hasElectiveCandidate,
      electiveCandidatesFound,
    }),
  };
}

function buildNotes({
  hasRequiredCourses,
  hasElectiveCandidate,
  electiveCandidatesFound,
}: {
  hasRequiredCourses: boolean;
  hasElectiveCandidate: boolean;
  electiveCandidatesFound: ElectiveCandidateRule[];
}) {
  const notes: string[] = [
    `${aiEngineeringCertificateRule.certificateName} requires ${aiEngineeringCertificateRule.totalHoursRequired} credit hours for catalog year ${aiEngineeringCertificateRule.catalogYear}.`,
    `Requirement source: ${aiEngineeringCertificateRule.sourceId}.`,
  ];

  if (hasRequiredCourses) {
    notes.push("All required AI Engineering certificate courses were found.");
  } else {
    notes.push("One or more required AI Engineering certificate courses are missing.");
  }

  if (hasElectiveCandidate) {
    const candidateCodes = electiveCandidatesFound
      .map((course) => course.code)
      .join(", ");
    notes.push(
      `${candidateCodes} is treated as a planned elective candidate only, not as guaranteed department approval.`,
    );
  } else {
    notes.push(
      `No planned course matched the local ${aiEngineeringCertificateRule.electiveRequirement.creditHoursRequired}-credit department-approved AI elective candidate list.`,
    );
  }

  notes.push("Advisor verification is required for AI elective approval.");

  return notes;
}

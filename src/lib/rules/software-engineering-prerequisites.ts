import softwareEngineeringPrerequisiteRuleJson from "../../../rules/auburn/software-engineering-prerequisites.json" with { type: "json" };
import type {
  DegreeWorksSemesterExtraction,
  DegreeWorksSemesterTerm,
} from "../plan/degreeworks-semesters.ts";
import type { DegreeWorksParserConfidence } from "../plan/degreeworks-analysis.ts";
import {
  createRuleProvenance,
  inheritRuleProvenance,
  type RuleProvenance,
  type RuleProvenanceOverride,
} from "./rule-provenance.ts";

export type PrerequisiteIssueSeverity =
  | "warning"
  | "blocking"
  | "advisor_review";

export type SoftwareEngineeringPrerequisiteIssue = {
  courseCode: string;
  termLabel?: string;
  missingPrerequisites: string[];
  severity: PrerequisiteIssueSeverity;
  message: string;
  provenance: RuleProvenance;
};

export type SoftwareEngineeringPrerequisiteCheckResult = {
  provenance: RuleProvenance;
  checkedCourseCount: number;
  prerequisiteIssues: SoftwareEngineeringPrerequisiteIssue[];
  advisorReviewItems: string[];
  semesterConfidence: DegreeWorksParserConfidence;
  isLikelySequenceValid: boolean | null;
  notes: string[];
};

type SoftwareEngineeringPrerequisiteRule = {
  courseCode: string;
  prerequisites: string[];
  verification: "modeled" | "advisor_review";
  advisorReviewNote?: string;
  provenance?: RuleProvenanceOverride;
};

type SoftwareEngineeringPrerequisiteRuleSet = {
  modelName: string;
  catalogYear: string;
  sourceId: string;
  provenance: RuleProvenance;
  rules: SoftwareEngineeringPrerequisiteRule[];
  excludedHardFailureCourses: string[];
  notes: string[];
};

const softwareEngineeringPrerequisiteRule =
  softwareEngineeringPrerequisiteRuleJson as SoftwareEngineeringPrerequisiteRuleSet;

export const softwareEngineeringPrerequisiteProvenance = createRuleProvenance(
  softwareEngineeringPrerequisiteRule.provenance,
);

export function checkSoftwareEngineeringPrerequisites({
  semesterPlanAnalysis,
  courseCodes,
}: {
  semesterPlanAnalysis?: DegreeWorksSemesterExtraction;
  courseCodes?: string[];
}): SoftwareEngineeringPrerequisiteCheckResult {
  const semesterConfidence = semesterPlanAnalysis?.confidence ?? "low";
  const normalizedFlatCourseCodes = (courseCodes ?? []).map(normalizeCourseCode);
  const normalizedTerms = (semesterPlanAnalysis?.terms ?? []).map((term) => ({
    ...term,
    courseCodes: term.courseCodes.map(normalizeCourseCode),
  }));
  const plannedCourseCodes =
    normalizedTerms.length > 0
      ? normalizedTerms.flatMap((term) => term.courseCodes)
      : normalizedFlatCourseCodes;
  const plannedCourseSet = new Set(plannedCourseCodes);
  const termIndexByCourse = buildTermIndexByCourse(normalizedTerms);
  const prerequisiteIssues: SoftwareEngineeringPrerequisiteIssue[] = [];
  const advisorReviewItems: string[] = [];

  for (const rule of softwareEngineeringPrerequisiteRule.rules) {
    const courseCode = normalizeCourseCode(rule.courseCode);

    if (!plannedCourseSet.has(courseCode)) {
      continue;
    }

    if (rule.verification === "advisor_review") {
      advisorReviewItems.push(
        rule.advisorReviewNote ??
          `${courseCode} requires advisor or catalog verification.`,
      );
      prerequisiteIssues.push({
        courseCode,
        termLabel: findTermLabel(normalizedTerms, courseCode),
        missingPrerequisites: [],
        severity: "advisor_review",
        message:
          rule.advisorReviewNote ??
          `${courseCode} requires advisor or catalog verification.`,
        provenance: inheritRuleProvenance(
          softwareEngineeringPrerequisiteProvenance,
          {
            ...rule.provenance,
            confidence: "advisor_review_required",
            evidenceLabel: `${courseCode} prerequisite eligibility`,
          },
        ),
      });
      continue;
    }

    const missingPrerequisites = rule.prerequisites
      .map(normalizeCourseCode)
      .filter((prerequisite) => !plannedCourseSet.has(prerequisite));

    if (missingPrerequisites.length > 0) {
      prerequisiteIssues.push({
        courseCode,
        termLabel: findTermLabel(normalizedTerms, courseCode),
        missingPrerequisites,
        severity: "warning",
        message: `${courseCode} is planned, but ${missingPrerequisites.join(
          ", ",
        )} was not found in the plan.`,
        provenance: inheritRuleProvenance(
          softwareEngineeringPrerequisiteProvenance,
          rule.provenance,
        ),
      });
      continue;
    }

    if (semesterConfidence === "low") {
      continue;
    }

    const courseTermIndex = termIndexByCourse.get(courseCode);
    const outOfOrderPrerequisites = rule.prerequisites
      .map(normalizeCourseCode)
      .filter((prerequisite) => {
        const prerequisiteTermIndex = termIndexByCourse.get(prerequisite);

        return (
          typeof courseTermIndex === "number" &&
          typeof prerequisiteTermIndex === "number" &&
          prerequisiteTermIndex >= courseTermIndex
        );
      });

    if (outOfOrderPrerequisites.length > 0) {
      prerequisiteIssues.push({
        courseCode,
        termLabel: findTermLabel(normalizedTerms, courseCode),
        missingPrerequisites: outOfOrderPrerequisites,
        severity: "warning",
        message: `${courseCode} appears before or in the same term as modeled prerequisite ${outOfOrderPrerequisites.join(
          ", ",
        )}.`,
        provenance: inheritRuleProvenance(
          softwareEngineeringPrerequisiteProvenance,
          rule.provenance,
        ),
      });
    }
  }

  const warningIssues = prerequisiteIssues.filter(
    (issue) => issue.severity === "warning",
  );

  return {
    provenance: softwareEngineeringPrerequisiteProvenance,
    checkedCourseCount: plannedCourseSet.size,
    prerequisiteIssues,
    advisorReviewItems,
    semesterConfidence,
    isLikelySequenceValid:
      semesterConfidence === "low" ? null : warningIssues.length === 0,
    notes: [
      `${softwareEngineeringPrerequisiteRule.modelName} uses conservative local rules for catalog year ${softwareEngineeringPrerequisiteRule.catalogYear}.`,
      `Rule source: ${softwareEngineeringPrerequisiteRule.sourceId}.`,
      ...softwareEngineeringPrerequisiteRule.notes,
      "Modeled missing or out-of-order prerequisites are warnings for advising review, not official registration decisions.",
    ],
  };
}

export function getModeledMissingPrerequisites(
  courseCode: string,
  plannedCourseCodes: string[],
) {
  const normalizedCourseCode = normalizeCourseCode(courseCode);
  const rule = softwareEngineeringPrerequisiteRule.rules.find(
    (candidateRule) =>
      normalizeCourseCode(candidateRule.courseCode) === normalizedCourseCode &&
      candidateRule.verification === "modeled",
  );

  if (!rule) {
    return [];
  }

  const plannedCourseSet = new Set(plannedCourseCodes.map(normalizeCourseCode));

  return rule.prerequisites
    .map(normalizeCourseCode)
    .filter((prerequisite) => !plannedCourseSet.has(prerequisite));
}

function buildTermIndexByCourse(terms: DegreeWorksSemesterTerm[]) {
  const termIndexByCourse = new Map<string, number>();

  for (const term of terms) {
    for (const courseCode of term.courseCodes) {
      if (!termIndexByCourse.has(courseCode)) {
        termIndexByCourse.set(courseCode, term.index);
      }
    }
  }

  return termIndexByCourse;
}

function findTermLabel(
  terms: DegreeWorksSemesterTerm[],
  courseCode: string,
) {
  return terms.find((term) => term.courseCodes.includes(courseCode))?.label;
}

function normalizeCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

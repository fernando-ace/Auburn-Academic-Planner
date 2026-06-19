import planningMetadataJson from "../../../rules/auburn/course-planning-metadata.json" with { type: "json" };
import prerequisiteRulesJson from "../../../rules/auburn/software-engineering-prerequisites.json" with { type: "json" };
import { aiEngineeringCertificateRule } from "./ai-certificate.ts";
import { computerScienceDegreeRule } from "./computer-science-degree.ts";
import type { RequirementBlockDefinition } from "./requirement-blocks.ts";
import type {
  RuleConfidence,
  RuleProvenance,
  RuleProvenanceOverride,
} from "./rule-provenance.ts";
import { softwareEngineeringDegreeRule } from "./software-engineering-degree.ts";
import { checkBundledSourceIntegrity } from "../sources/source-integrity-bundled.ts";

export type RuleCoverageProgramKey =
  | "ai_certificate"
  | "software_engineering"
  | "computer_science";

export type RuleCoverageStatus = RuleConfidence;

export type RuleCoverageRequirementBlock = {
  name: string;
  status: RuleCoverageStatus;
  modeledCredits?: number;
  requiredCredits?: number;
  notes: string[];
};

export type RuleCoverageCounts = {
  sourceBacked: number;
  localModel: number;
  advisorReviewRequired: number;
};

export type RuleCoverageSupportingModel = {
  modelKey: "prerequisite_rules" | "course_planning_metadata";
  modelName: string;
  appliesTo: RuleCoverageProgramKey[];
  sourceId: string;
  sourceUrl?: string;
  status: RuleCoverageStatus;
  totalRules: number;
  ruleCounts: RuleCoverageCounts;
  notes: string[];
  limitations: string[];
};

export type RuleCoverageProgram = {
  programKey: RuleCoverageProgramKey;
  programName: string;
  sourceId: string;
  sourceUrl?: string;
  totalExactRules: number;
  sourceBackedRules: number;
  localModelRules: number;
  advisorReviewRules: number;
  requirementBlocks: RuleCoverageRequirementBlock[];
  coverageSummary: {
    deterministicExactCourseCoverage: number;
    advisorReviewBlockCount: number;
    localModelRuleCount: number;
  };
  limitations: string[];
};

export type RuleCoverageAudit = {
  generatedAt: string;
  catalogYear: string;
  sourceIntegrity: {
    status: "pass" | "fail";
    warningsCount: number;
    lastCheckedAt: string;
    note: string;
  };
  programs: RuleCoverageProgram[];
  supportingModels: RuleCoverageSupportingModel[];
  globalLimitations: string[];
  recommendedNextImprovements: string[];
};

type PrerequisiteRuleData = {
  modelName: string;
  sourceId: string;
  provenance: RuleProvenance;
  rules: { verification: "modeled" | "advisor_review" }[];
};

type PlanningMetadataData = {
  provenance: RuleProvenance;
  courses: Record<string, unknown>;
};

const prerequisiteRuleData = prerequisiteRulesJson as PrerequisiteRuleData;
const planningMetadataData = planningMetadataJson as PlanningMetadataData;

const planningRuleKeys = Object.keys(planningMetadataData.courses);

export function buildRuleCoverageAudit(
  generatedAt = new Date().toISOString(),
): RuleCoverageAudit {
  const supportingModels = buildSupportingModels();
  const sourceIntegrity = checkBundledSourceIntegrity(generatedAt);

  return {
    generatedAt,
    catalogYear: aiEngineeringCertificateRule.catalogYear,
    sourceIntegrity: {
      status: sourceIntegrity.status,
      warningsCount: sourceIntegrity.warnings.length,
      lastCheckedAt: sourceIntegrity.checkedAt,
      note: "Uses local checked-in source files and does not query live Auburn pages.",
    },
    programs: [
      buildAiCertificateCoverage(),
      buildDegreeCoverage({
        programKey: "software_engineering",
        programName: softwareEngineeringDegreeRule.degreeName,
        rule: softwareEngineeringDegreeRule,
        includePrerequisiteModel: true,
        limitations: [
          "Core curriculum, math elective, technical elective, and free-elective applicability is not fully source-validated by the local model.",
          "The preliminary prerequisite sequence is a local warning model, not an official registration eligibility check.",
        ],
      }),
      buildDegreeCoverage({
        programKey: "computer_science",
        programName: computerScienceDegreeRule.degreeName,
        rule: computerScienceDegreeRule,
        includePrerequisiteModel: false,
        limitations: [
          "Core curriculum, math elective, technical elective, and free-elective applicability is not fully source-validated by the local model.",
          "Transfer credit, substitutions, exceptions, standing, and catalog applicability still require Degree Works or advisor review.",
        ],
      }),
    ],
    supportingModels,
    globalLimitations: [
      "This audit covers checked-in local rules for the listed catalog year; it does not query live Auburn systems.",
      "Advisor-review-only blocks are not treated as fully verified or as proof of degree completion.",
      "Course offerings, prerequisites, substitutions, transfer credit, exceptions, and catalog applicability can change the result.",
      "This transparency tool does not replace Degree Works, the Auburn bulletin, the Registrar, or an academic advisor.",
    ],
    recommendedNextImprovements: [
      "Source and model approved course lists for core, math, technical-elective, and free-elective blocks.",
      "Expand prerequisite coverage from the official Auburn catalog and preserve rule-level source citations.",
      "Add a verified course-offering source before treating target-term availability as known.",
      "Add catalog-year variants and explicit applicability rules for transfer credit, substitutions, and exceptions.",
    ],
  };
}

function buildAiCertificateCoverage(): RuleCoverageProgram {
  const provenance = aiEngineeringCertificateRule.provenance;
  const exactRules = aiEngineeringCertificateRule.requiredCourses.length;
  const exactSourceBacked =
    provenance.confidence === "source_backed" ? exactRules : 0;
  const planningRules = countPlanningRulesForProgram("ai_certificate");
  const requirementBlocks: RuleCoverageRequirementBlock[] = [
    {
      name: aiEngineeringCertificateRule.electiveRequirement.description,
      status: resolveConfidence(
        provenance,
        aiEngineeringCertificateRule.electiveRequirement.provenance,
      ),
      requiredCredits:
        aiEngineeringCertificateRule.electiveRequirement.creditHoursRequired,
      notes: [
        "Candidate courses are modeled locally, but department approval must be verified by an advisor.",
      ],
    },
  ];
  const blockCounts = countStatuses(requirementBlocks);

  return {
    programKey: "ai_certificate",
    programName: aiEngineeringCertificateRule.certificateName,
    sourceId: aiEngineeringCertificateRule.sourceId,
    sourceUrl: provenance.sourceUrl,
    totalExactRules: exactRules,
    sourceBackedRules: exactSourceBacked,
    localModelRules: blockCounts.localModel + planningRules,
    advisorReviewRules: blockCounts.advisorReviewRequired,
    requirementBlocks,
    coverageSummary: {
      deterministicExactCourseCoverage: coveragePercent(
        exactSourceBacked,
        exactRules,
      ),
      advisorReviewBlockCount: blockCounts.advisorReviewRequired,
      localModelRuleCount: blockCounts.localModel + planningRules,
    },
    limitations: [
      "Exact certificate courses are source-backed, but the approved AI elective remains an advisor-verification decision.",
      "Certificate applicability and completion must be confirmed in Degree Works or with an academic advisor.",
    ],
  };
}

function buildDegreeCoverage({
  programKey,
  programName,
  rule,
  includePrerequisiteModel,
  limitations,
}: {
  programKey: Exclude<RuleCoverageProgramKey, "ai_certificate">;
  programName: string;
  rule: typeof softwareEngineeringDegreeRule | typeof computerScienceDegreeRule;
  includePrerequisiteModel: boolean;
  limitations: string[];
}): RuleCoverageProgram {
  const exactRules = rule.exactRequiredCourses.length;
  const exactSourceBacked =
    rule.provenance.confidence === "source_backed" ? exactRules : 0;
  const sourceBackedAlternativeGroups = rule.alternativeCourseGroups.filter(
    (group) =>
      resolveConfidence(rule.provenance, group.provenance) === "source_backed",
  ).length;
  const requirementBlocks = rule.requirementBlocks.map((block) =>
    auditRequirementBlock(block, rule.provenance),
  );
  const blockCounts = countStatuses(requirementBlocks);
  const planningRules = countPlanningRulesForProgram(programKey);
  const prerequisiteCounts = includePrerequisiteModel
    ? countPrerequisiteRules()
    : { localModel: 0, advisorReviewRequired: 0 };
  const localModelRules =
    blockCounts.localModel + planningRules + prerequisiteCounts.localModel;
  const advisorReviewRules =
    blockCounts.advisorReviewRequired +
    prerequisiteCounts.advisorReviewRequired;

  return {
    programKey,
    programName,
    sourceId: rule.sourceId,
    sourceUrl: rule.provenance.sourceUrl,
    totalExactRules: exactRules,
    sourceBackedRules: exactSourceBacked + sourceBackedAlternativeGroups,
    localModelRules,
    advisorReviewRules,
    requirementBlocks,
    coverageSummary: {
      deterministicExactCourseCoverage: coveragePercent(
        exactSourceBacked,
        exactRules,
      ),
      advisorReviewBlockCount: blockCounts.advisorReviewRequired,
      localModelRuleCount: localModelRules,
    },
    limitations,
  };
}

function auditRequirementBlock(
  block: RequirementBlockDefinition,
  parentProvenance: RuleProvenance,
): RuleCoverageRequirementBlock {
  const status = resolveConfidence(parentProvenance, block.provenance);

  return {
    name: block.blockName,
    status,
    modeledCredits:
      status === "advisor_review_required" ? undefined : block.requiredCredits,
    requiredCredits: block.requiredCredits,
    notes: [...(block.notes ?? [])],
  };
}

function buildSupportingModels(): RuleCoverageSupportingModel[] {
  const prerequisiteCounts = countPrerequisiteRules();
  const planningRuleCount = planningRuleKeys.length;

  return [
    {
      modelKey: "prerequisite_rules",
      modelName: prerequisiteRuleData.modelName,
      appliesTo: ["software_engineering"],
      sourceId: prerequisiteRuleData.sourceId,
      sourceUrl: prerequisiteRuleData.provenance.sourceUrl,
      status: prerequisiteRuleData.provenance.confidence,
      totalRules: prerequisiteRuleData.rules.length,
      ruleCounts: {
        sourceBacked: 0,
        localModel: prerequisiteCounts.localModel,
        advisorReviewRequired: prerequisiteCounts.advisorReviewRequired,
      },
      notes: [...prerequisiteRuleData.provenance.notes],
      limitations: [
        "Only a conservative subset of Software Engineering prerequisite chains is modeled.",
        "Registration eligibility, minimum grades, standing, co-requisites, and approvals require official verification.",
      ],
    },
    {
      modelKey: "course_planning_metadata",
      modelName: planningMetadataData.provenance.sourceTitle,
      appliesTo: [
        "ai_certificate",
        "software_engineering",
        "computer_science",
      ],
      sourceId: planningMetadataData.provenance.sourceId,
      sourceUrl: planningMetadataData.provenance.sourceUrl,
      status: planningMetadataData.provenance.confidence,
      totalRules: planningRuleCount,
      ruleCounts: {
        sourceBacked: 0,
        localModel: planningRuleCount,
        advisorReviewRequired: 0,
      },
      notes: [...planningMetadataData.provenance.notes],
      limitations: [
        "Checked-in term hints are curriculum-planning metadata, not proof of live course availability.",
        "Unknown or future offerings must be verified with Auburn or an academic advisor.",
      ],
    },
  ];
}

function countPlanningRulesForProgram(programKey: RuleCoverageProgramKey) {
  const courseCodes = new Set(
    programKey === "ai_certificate"
      ? [
          ...aiEngineeringCertificateRule.requiredCourses.map(
            (course) => course.code,
          ),
          ...aiEngineeringCertificateRule.electiveRequirement.candidateCourses.map(
            (course) => course.code,
          ),
          "APPROVED AI ELECTIVE",
        ]
      : programKey === "software_engineering"
        ? degreeCourseCodes(softwareEngineeringDegreeRule)
        : degreeCourseCodes(computerScienceDegreeRule),
  );

  return planningRuleKeys.filter((code) => courseCodes.has(code)).length;
}

function degreeCourseCodes(
  rule: typeof softwareEngineeringDegreeRule | typeof computerScienceDegreeRule,
) {
  return [
    ...rule.exactRequiredCourses.map((course) => course.code),
    ...rule.alternativeCourseGroups.flatMap((group) =>
      group.courses.map((course) => course.code),
    ),
  ];
}

function countPrerequisiteRules() {
  return prerequisiteRuleData.rules.reduce(
    (counts, rule) => {
      if (rule.verification === "advisor_review") {
        counts.advisorReviewRequired += 1;
      } else {
        counts.localModel += 1;
      }
      return counts;
    },
    { localModel: 0, advisorReviewRequired: 0 },
  );
}

function resolveConfidence(
  parent: RuleProvenance,
  override?: RuleProvenanceOverride,
) {
  return override?.confidence ?? parent.confidence;
}

function countStatuses(items: { status: RuleCoverageStatus }[]) {
  return items.reduce<RuleCoverageCounts>(
    (counts, item) => {
      if (item.status === "source_backed") counts.sourceBacked += 1;
      if (item.status === "local_model") counts.localModel += 1;
      if (item.status === "advisor_review_required") {
        counts.advisorReviewRequired += 1;
      }
      return counts;
    },
    { sourceBacked: 0, localModel: 0, advisorReviewRequired: 0 },
  );
}

function coveragePercent(sourceBacked: number, total: number) {
  return total === 0 ? 0 : Math.round((sourceBacked / total) * 100);
}

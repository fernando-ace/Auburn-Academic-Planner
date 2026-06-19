export type RuleConfidence =
  | "source_backed"
  | "local_model"
  | "advisor_review_required";

export type RuleProvenance = {
  sourceId: string;
  sourceTitle: string;
  catalogYear: string;
  sourceFile?: string;
  sourceUrl?: string;
  evidenceLabel: string;
  confidence: RuleConfidence;
  notes: string[];
};

export type RuleProvenanceOverride = Partial<
  Omit<RuleProvenance, "notes">
> & { notes?: string[] };

export type RuleTrustNotes = {
  sourceBacked: string[];
  localModel: string[];
  advisorReviewRequired: string[];
};

const confidenceLabels: Record<RuleConfidence, string> = {
  source_backed: "Source-backed",
  local_model: "Local conservative model",
  advisor_review_required: "Advisor review required",
};

export function getRuleConfidenceLabel(confidence: RuleConfidence) {
  return confidenceLabels[confidence];
}

export function createRuleProvenance(
  provenance: RuleProvenance,
): RuleProvenance {
  for (const field of [
    "sourceId",
    "sourceTitle",
    "catalogYear",
    "evidenceLabel",
  ] as const) {
    if (!provenance[field].trim()) {
      throw new Error(`Rule provenance ${field} must not be empty.`);
    }
  }

  return {
    ...provenance,
    notes: [...provenance.notes],
  };
}

export function inheritRuleProvenance(
  parent: RuleProvenance,
  override?: RuleProvenanceOverride,
): RuleProvenance {
  return createRuleProvenance({
    ...parent,
    ...override,
    notes: override?.notes ?? parent.notes,
  });
}

export function groupRuleTrustNotes(
  provenances: RuleProvenance[],
): RuleTrustNotes {
  const trustNotes: RuleTrustNotes = {
    sourceBacked: [],
    localModel: [],
    advisorReviewRequired: [],
  };

  for (const provenance of provenances) {
    const note = `${provenance.evidenceLabel}: ${provenance.sourceTitle} (${provenance.catalogYear}).`;
    const target =
      provenance.confidence === "source_backed"
        ? trustNotes.sourceBacked
        : provenance.confidence === "local_model"
          ? trustNotes.localModel
          : trustNotes.advisorReviewRequired;

    if (!target.includes(note)) target.push(note);
  }

  return trustNotes;
}

import assert from "node:assert/strict";
import test from "node:test";

import {
  coursePlanningMetadataProvenance,
  getCoursePlanningMetadata,
} from "../src/lib/plan/course-planning-metadata.ts";
import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import {
  createRuleProvenance,
  getRuleConfidenceLabel,
  groupRuleTrustNotes,
  inheritRuleProvenance,
} from "../src/lib/rules/rule-provenance.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../src/lib/rules/software-engineering-prerequisites.ts";

const baseProvenance = createRuleProvenance({
  sourceId: "test-source",
  sourceTitle: "Test source",
  catalogYear: "2025-2026",
  evidenceLabel: "Test evidence",
  confidence: "source_backed",
  notes: ["Test note."],
});

test("creates, labels, inherits, and groups rule provenance", () => {
  const inherited = inheritRuleProvenance(baseProvenance, {
    evidenceLabel: "Local test evidence",
    confidence: "local_model",
  });
  const grouped = groupRuleTrustNotes([baseProvenance, inherited]);

  assert.equal(getRuleConfidenceLabel(inherited.confidence), "Local conservative model");
  assert.equal(inherited.sourceId, baseProvenance.sourceId);
  assert.equal(grouped.sourceBacked.length, 1);
  assert.equal(grouped.localModel.length, 1);
});

test("AI certificate result includes bulletin provenance", () => {
  const result = checkAiEngineeringCertificate(["COMP 5600"]);
  assert.equal(result.provenance.confidence, "source_backed");
  assert.match(result.provenance.sourceUrl ?? "", /artificialintelligence/);
});

test("Software Engineering result and blocks include provenance", () => {
  const result = checkSoftwareEngineeringDegree({ courseCodes: [] });
  assert.equal(result.provenance.sourceId, "auburn-software-engineering-bulletin");
  assert.ok(result.requirementBlocks.every((block) => block.provenance));
  assert.ok(
    result.requirementBlocks.some(
      (block) => block.provenance.confidence === "advisor_review_required",
    ),
  );
});

test("Computer Science result includes bulletin provenance", () => {
  const result = checkComputerScienceDegree({ courseCodes: [] });
  assert.equal(result.provenance.confidence, "source_backed");
  assert.match(result.provenance.sourceUrl ?? "", /computerscience_major/);
});

test("prerequisite issues expose local-model provenance", () => {
  const result = checkSoftwareEngineeringPrerequisites({
    courseCodes: ["COMP 3270"],
  });
  assert.equal(result.provenance.confidence, "local_model");
  assert.equal(result.prerequisiteIssues[0].provenance.confidence, "local_model");
});

test("planning metadata exposes its local source and zero-credit milestone note", () => {
  const metadata = getCoursePlanningMetadata("ENGR 1100");
  assert.equal(coursePlanningMetadataProvenance.confidence, "local_model");
  assert.equal(metadata?.provenance?.sourceId, "local-course-planning-metadata");
  assert.ok(metadata?.planningNotes.some((note) => note.includes("zero-credit milestone")));
});

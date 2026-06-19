import assert from "node:assert/strict";
import test from "node:test";

import { buildRuleCoverageAudit } from "../src/lib/rules/rule-coverage-audit.ts";

const fixedTimestamp = "2026-06-19T12:00:00.000Z";

test("returns all three audited programs with a stable timestamp", () => {
  const audit = buildRuleCoverageAudit(fixedTimestamp);

  assert.equal(audit.generatedAt, fixedTimestamp);
  assert.equal(audit.catalogYear, "2025-2026");
  assert.deepEqual(
    audit.programs.map((program) => program.programKey),
    ["ai_certificate", "software_engineering", "computer_science"],
  );
});

test("AI certificate exact requirements are source-backed", () => {
  const program = buildRuleCoverageAudit(fixedTimestamp).programs.find(
    (candidate) => candidate.programKey === "ai_certificate",
  );

  assert.ok(program);
  assert.equal(program.totalExactRules, 3);
  assert.ok(program.sourceBackedRules >= program.totalExactRules);
  assert.equal(program.coverageSummary.deterministicExactCourseCoverage, 100);
});

test("Software Engineering exposes advisor-review requirement blocks", () => {
  const program = buildRuleCoverageAudit(fixedTimestamp).programs.find(
    (candidate) => candidate.programKey === "software_engineering",
  );

  assert.ok(program);
  assert.ok(program.coverageSummary.advisorReviewBlockCount > 0);
  assert.ok(
    program.requirementBlocks.some(
      (block) =>
        block.name === "Technical Electives" &&
        block.status === "local_model",
    ),
  );
  assert.ok(
    program.requirementBlocks.some(
      (block) => block.status === "advisor_review_required",
    ),
  );
});

test("Computer Science exposes advisor-review requirement blocks", () => {
  const program = buildRuleCoverageAudit(fixedTimestamp).programs.find(
    (candidate) => candidate.programKey === "computer_science",
  );

  assert.ok(program);
  assert.ok(program.coverageSummary.advisorReviewBlockCount > 0);
  assert.ok(
    program.requirementBlocks.some(
      (block) => block.name === "Free Elective",
    ),
  );
});

test("prerequisite and availability supporting models remain conservative", () => {
  const audit = buildRuleCoverageAudit(fixedTimestamp);
  const prerequisiteModel = audit.supportingModels.find(
    (model) => model.modelKey === "prerequisite_rules",
  );
  const planningModel = audit.supportingModels.find(
    (model) => model.modelKey === "course_planning_metadata",
  );

  assert.equal(prerequisiteModel?.status, "local_model");
  assert.ok((prerequisiteModel?.ruleCounts.advisorReviewRequired ?? 0) > 0);
  assert.equal(planningModel?.status, "local_model");
  assert.match(planningModel?.limitations.join(" ") ?? "", /availability/i);
});

test("audit recommends concrete next improvements", () => {
  const audit = buildRuleCoverageAudit(fixedTimestamp);

  assert.ok(audit.recommendedNextImprovements.length > 0);
  assert.match(audit.recommendedNextImprovements.join(" "), /source|verified/i);
});

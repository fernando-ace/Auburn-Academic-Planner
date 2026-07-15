import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyGeneratedTermFeasibility,
  summarizeGeneratedPathFeasibility,
  type GeneratedPathFeasibilityItem,
} from "../src/lib/plan/course-feasibility.ts";
import type { BulletinSamplePlanOrdering } from "../src/lib/plan/bulletin-sample-plan.ts";

const bulletinOrdering: BulletinSamplePlanOrdering = {
  matchedMajorTitle: "Software Engineering",
  catalogYear: "2025-2026",
  fileName: "auburn/majors/auburn-major-softwareengineering.html",
  confidence: "high",
  coursesByCode: {
    "COMP 3220": {
      code: "COMP 3220",
      credits: 3,
      order: 10,
      termLabel: "Fall Junior",
      yearLabel: "Junior",
      requirementText: "COMP 3220",
    },
  },
};

test("classifies a sample-plan season mismatch as a review signal, not an offering rule", () => {
  const result = classifyGeneratedTermFeasibility({
    auditCatalogYear: "2025-26",
    items: [courseItem("COMP 3220")],
    ordering: bulletinOrdering,
    termLabel: "Spring 2027",
  });

  assert.equal(result.assessments[0].basis, "bulletin_sample_term_mismatch");
  assert.match(result.warnings[0], /COMP 3220 \(Fall Junior\) appears/);
  assert.match(result.warnings[0], /not proof that a course is unavailable/);
  assert.equal(
    result.warnings.some((warning) => warning.includes("catalog year")),
    false,
  );
});

test("classifies Degree Works-only placement as credit-cap-only", () => {
  const result = classifyGeneratedTermFeasibility({
    auditCatalogYear: "2025-2026",
    items: [courseItem("ELEC 2200")],
    ordering: bulletinOrdering,
    termLabel: "Fall 2026",
  });

  assert.equal(result.assessments[0].basis, "degreeworks_credit_cap_only");
  assert.match(result.warnings[0], /ELEC 2200 is placed/);
  assert.match(result.warnings[0], /no checked-in course sequence/);
});

test("keeps current courses separate from unverified advisor choices", () => {
  const current: GeneratedPathFeasibilityItem = {
    ...courseItem("COMP 2710"),
    kind: "registered",
    locked: true,
  };
  const option: GeneratedPathFeasibilityItem = {
    ...courseItem("PHIL 1020"),
    kind: "option",
  };
  const result = classifyGeneratedTermFeasibility({
    auditCatalogYear: "2025-2026",
    items: [current, option],
    ordering: bulletinOrdering,
    termLabel: "Fall 2026",
  });

  assert.deepEqual(
    result.assessments.map((assessment) => assessment.basis),
    ["current_progress_term", "advisor_review"],
  );
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /advisor-choice option/);
});

test("flags Bulletin sequencing when Current Progress catalog year is unconfirmed", () => {
  const result = classifyGeneratedTermFeasibility({
    auditCatalogYear: null,
    items: [courseItem("COMP 3220")],
    ordering: bulletinOrdering,
    termLabel: "Fall 2026",
  });

  assert.equal(result.assessments[0].basis, "bulletin_sample_order_hint");
  assert.match(result.warnings[0], /catalog year could not be confirmed/);
});

test("summarizes exactly which universal schedule checks were and were not performed", () => {
  assert.deepEqual(
    summarizeGeneratedPathFeasibility({
      auditCatalogYear: "2025-2026",
      ordering: bulletinOrdering,
    }),
    {
      degreeWorksGrounding: "checked",
      creditCaps: "checked",
      bulletinSequence: "catalog_matched_hint",
      prerequisitesAndCorequisites: "not_checked",
      courseOfferings: "not_checked",
      seatAvailability: "not_checked",
    },
  );

  assert.equal(
    summarizeGeneratedPathFeasibility({
      auditCatalogYear: "2025-2026",
      ordering: null,
    }).bulletinSequence,
    "not_available",
  );
});

function courseItem(code: string): GeneratedPathFeasibilityItem {
  return {
    kind: "course",
    label: code,
    courseCodes: [code],
  };
}

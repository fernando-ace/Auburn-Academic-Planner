import assert from "node:assert/strict";
import test from "node:test";

import { getCoursePlanningMetadata } from "../src/lib/plan/course-planning-metadata.ts";
import {
  determineCourseTermAvailability,
  getAvailabilityAdvisorReviewItems,
  parseSpecificPlanningTerm,
} from "../src/lib/plan/planning-constraints.ts";

test("metadata lookup returns title and credit hours from local rules", () => {
  const metadata = getCoursePlanningMetadata(" comp   2210 ");

  assert.equal(metadata?.title, "Fundamentals of Computing II");
  assert.equal(metadata?.creditHours, 4);
  assert.equal(metadata?.availabilityConfidence, "unknown_requires_advisor_review");
});

test("unknown availability creates an advisor-review note", () => {
  const items = getAvailabilityAdvisorReviewItems("COMP 2210", "Fall 2027");

  assert.equal(items.length, 1);
  assert.match(items[0], /does not confirm COMP 2210 is offered in Fall 2027/);
});

test("generic terms do not enforce a known local term rule", () => {
  const result = determineCourseTermAvailability(
    {
      code: "TEST 1000",
      title: "Test Course",
      creditHours: 3,
      typicalTerms: ["spring"],
      availabilityConfidence: "known_local_rule",
      planningNotes: [],
    },
    "Next Semester",
  );

  assert.equal(result.canPlace, true);
  assert.equal(result.termIsSpecific, false);
  assert.equal(result.advisorReviewItems.length, 1);
});

test("specific terms enforce a known local term rule", () => {
  const metadata = {
    code: "TEST 1000",
    title: "Test Course",
    creditHours: 3,
    typicalTerms: ["spring" as const],
    availabilityConfidence: "known_local_rule" as const,
    planningNotes: [],
  };

  assert.equal(determineCourseTermAvailability(metadata, "Fall 2027").canPlace, false);
  assert.equal(determineCourseTermAvailability(metadata, "Spring 2028").canPlace, true);
  assert.equal(parseSpecificPlanningTerm("Semester 2"), null);
});

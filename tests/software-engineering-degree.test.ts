import assert from "node:assert/strict";
import test from "node:test";

import {
  checkSoftwareEngineeringDegree,
  softwareEngineeringDegreeRule,
} from "../src/lib/rules/software-engineering-degree.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "../src/lib/samples/degreeworks-plan-sample.ts";

test("Degree Works sample has enough total credits but is not proven complete", () => {
  const result = checkSoftwareEngineeringDegree({
    courseCodes: getDegreeWorksPlanSampleCourseCodes(),
    totalPlannedCredits: 122,
  });

  assert.equal(result.hasEnoughTotalCredits, true);
  assert.equal(result.isLikelyComplete, false);
  assert.equal(result.requirementBlocks.length, 8);
  assert.ok(
    result.requirementBlocks.some(
      (block) =>
        block.blockName === "Technical Electives" &&
        block.status === "advisor_review" &&
        block.candidateCourses.includes("COMP 5600") &&
        block.candidateCourses.includes("COMP 5610"),
    ),
  );
  assert.ok(
    result.requirementBlocks.some(
      (block) =>
        block.blockName === "Math Electives" &&
        block.status === "advisor_review" &&
        block.matchedCredits === 6,
    ),
  );
  assert.deepEqual(
    result.exactRequiredCoursesMissing.map((course) => course.code),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200"],
  );
  assert.equal(result.advisorVerificationRequired, true);
});

test("all exact required courses plus one ethics option is likely complete with enough credits", () => {
  const result = checkSoftwareEngineeringDegree({
    courseCodes: [
      ...softwareEngineeringDegreeRule.exactRequiredCourses.map(
        (course) => course.code,
      ),
      softwareEngineeringDegreeRule.alternativeCourseGroups[0].courses[0].code,
    ],
    totalPlannedCredits: 122,
  });

  assert.deepEqual(result.exactRequiredCoursesMissing, []);
  assert.equal(
    result.alternativeCourseGroups.every((group) => group.isSatisfied),
    true,
  );
  assert.equal(result.hasEnoughTotalCredits, true);
  assert.equal(result.isLikelyComplete, true);
  assert.equal(result.advisorVerificationRequired, true);
  assert.ok(
    result.requirementBlocks.some(
      (block) =>
        block.blockName === "Core Science Sequence" &&
        block.status === "advisor_review",
    ),
  );
});

test("complete courses without total planned credits are not likely complete", () => {
  const result = checkSoftwareEngineeringDegree({
    courseCodes: [
      ...softwareEngineeringDegreeRule.exactRequiredCourses.map(
        (course) => course.code,
      ),
      softwareEngineeringDegreeRule.alternativeCourseGroups[0].courses[0].code,
    ],
    totalPlannedCredits: null,
  });

  assert.deepEqual(result.exactRequiredCoursesMissing, []);
  assert.equal(
    result.alternativeCourseGroups.every((group) => group.isSatisfied),
    true,
  );
  assert.equal(result.hasEnoughTotalCredits, null);
  assert.equal(result.isLikelyComplete, false);
  assert.equal(result.advisorVerificationRequired, true);
});

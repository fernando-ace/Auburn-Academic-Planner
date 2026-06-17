import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRequirementBlocks } from "../src/lib/rules/requirement-blocks.ts";

test("satisfies exact course and one-of-many blocks", () => {
  const [exactBlock, alternativeBlock] = evaluateRequirementBlocks({
    courseCodes: ["COMP 1210", "PHIL 1020"],
    blocks: [
      {
        blockName: "Computing I",
        type: "exact_course",
        course: {
          code: "COMP 1210",
          title: "Fundamentals of Computing I",
          creditHours: 3,
        },
      },
      {
        blockName: "Ethics",
        type: "one_of_many",
        courses: [
          {
            code: "PHIL 1020",
            title: "Introduction to Ethics",
            creditHours: 3,
          },
          {
            code: "PHIL 1110",
            title: "Ethical and Conceptual Foundations of Science",
            creditHours: 3,
          },
        ],
      },
    ],
  });

  assert.equal(exactBlock.status, "satisfied");
  assert.deepEqual(exactBlock.satisfiedCourses, ["COMP 1210"]);
  assert.equal(alternativeBlock.status, "satisfied");
  assert.deepEqual(alternativeBlock.satisfiedCourses, ["PHIL 1020"]);
});

test("reports partial minimum-credit blocks", () => {
  const [block] = evaluateRequirementBlocks({
    courseCodes: ["STAT 3600"],
    blocks: [
      {
        blockName: "Math electives",
        type: "minimum_credits_from_list",
        requiredCredits: 6,
        courses: [
          {
            code: "STAT 3600",
            title: "Probability and Statistics I",
            creditHours: 3,
          },
          {
            code: "STAT 3610",
            title: "Probability and Statistics II",
            creditHours: 3,
          },
        ],
      },
    ],
  });

  assert.equal(block.status, "partial");
  assert.equal(block.requiredCredits, 6);
  assert.equal(block.matchedCredits, 3);
});

test("keeps advisor-review blocks conservative", () => {
  const [block] = evaluateRequirementBlocks({
    courseCodes: ["COMP 5610"],
    blocks: [
      {
        blockName: "Technical electives",
        type: "prefix_level_candidate",
        requiredCredits: 9,
        prefixes: ["COMP"],
        minimumLevel: 5000,
        defaultCreditHours: 3,
      },
    ],
  });

  assert.equal(block.status, "advisor_review");
  assert.deepEqual(block.satisfiedCourses, []);
  assert.deepEqual(block.candidateCourses, ["COMP 5610"]);
  assert.equal(block.matchedCredits, 3);
});

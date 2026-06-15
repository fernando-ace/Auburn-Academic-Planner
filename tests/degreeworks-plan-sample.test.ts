import assert from "node:assert/strict";
import test from "node:test";

import {
  getDegreeWorksPlanSample,
  getDegreeWorksPlanSampleCourseCodes,
} from "../src/lib/samples/degreeworks-plan-sample.ts";

test("loads the Degree Works Plan Sample metadata", () => {
  const sample = getDegreeWorksPlanSample();

  assert.equal(sample.totalPlannedCredits, 122);
});

test("loads AI certificate course codes from the Degree Works Plan Sample", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();

  assert.ok(courseCodes.includes("COMP 5600"));
  assert.ok(courseCodes.includes("COMP 5630"));
  assert.ok(courseCodes.includes("COMP 5130"));
  assert.ok(courseCodes.includes("COMP 5610"));
});

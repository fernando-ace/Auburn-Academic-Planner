import assert from "node:assert/strict";
import test from "node:test";

import { extractTotalPlannedCredits } from "../src/lib/plan/total-planned-credits.ts";

test("extracts Degree Works total planned credits with decimal text", () => {
  assert.equal(
    extractTotalPlannedCredits(
      "Plan Description 3 Year Bachelors Degree Total planned credits 122.0 Active No",
    ),
    122,
  );
});

test("extracts labeled total planned credits variants", () => {
  assert.equal(extractTotalPlannedCredits("Total planned credits: 122"), 122);
  assert.equal(extractTotalPlannedCredits("Total Planned Credits 122"), 122);
  assert.equal(extractTotalPlannedCredits("Total Hours: 122"), 122);
  assert.equal(extractTotalPlannedCredits("Total Credits: 122"), 122);
});

test("returns null when no confident total credit label is present", () => {
  assert.equal(
    extractTotalPlannedCredits("Summer 2025 Credits: 21 MATH 1610 Credits: 4"),
    null,
  );
  assert.equal(extractTotalPlannedCredits("Required course credits vary."), null);
});

test("extracts planned-hour labels and equals separators", () => {
  assert.equal(extractTotalPlannedCredits("Total Planned Hours: 122"), 122);
  assert.equal(extractTotalPlannedCredits("Total Credits Planned = 120.5"), 120.5);
});

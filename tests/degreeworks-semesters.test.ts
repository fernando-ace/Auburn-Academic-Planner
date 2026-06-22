import assert from "node:assert/strict";
import test from "node:test";

import { extractDegreeWorksSemesters } from "../src/lib/plan/degreeworks-semesters.ts";

test("extracts Degree Works semesters from term-labeled text", () => {
  const analysis = extractDegreeWorksSemesters(
    [
      "Auburn University Degree Works plan",
      "Fall 2025 Credits: 14 COMP 1210 Fundamentals Of Computing I Credits: 3.0 MATH 1610 Calculus I Credits: 4.0",
      "Spring 2026 Credits: 17 COMP 2210 Fundamentals of Computing II Credits: 4.0 COMP 2240 Discrete Structures Credits: 3.0",
    ].join(" "),
  );

  assert.equal(analysis.confidence, "high");
  assert.deepEqual(
    analysis.terms.map((term) => term.label),
    ["Fall 2025", "Spring 2026"],
  );
  assert.deepEqual(analysis.terms[0].courseCodes, ["COMP 1210", "MATH 1610"]);
  assert.deepEqual(analysis.terms[1].courseCodes, ["COMP 2210", "COMP 2240"]);
  assert.equal(analysis.terms[0].plannedCredits, 14);
  assert.equal(analysis.terms[1].plannedCredits, 17);
  assert.deepEqual(analysis.unassignedCourseCodes, []);
});

test("returns low confidence for flat course text without term labels", () => {
  const analysis = extractDegreeWorksSemesters(
    "COMP 1210 COMP 2210 COMP 3270 MATH 1610",
  );

  assert.equal(analysis.confidence, "low");
  assert.deepEqual(analysis.terms, []);
  assert.deepEqual(analysis.unassignedCourseCodes, [
    "COMP 1210",
    "COMP 2210",
    "COMP 3270",
    "MATH 1610",
  ]);
  assert.ok(
    analysis.warnings.some((warning) =>
      warning.includes("No reliable Degree Works term labels"),
    ),
  );
});

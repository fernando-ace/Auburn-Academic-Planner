import assert from "node:assert/strict";
import test from "node:test";

import { checkSoftwareEngineeringPrerequisites } from "../src/lib/rules/software-engineering-prerequisites.ts";

test("detects a course planned before its modeled prerequisite", () => {
  const result = checkSoftwareEngineeringPrerequisites({
    semesterPlanAnalysis: {
      confidence: "high",
      warnings: [],
      unassignedCourseCodes: [],
      terms: [
        {
          label: "Fall 2025",
          index: 0,
          courseCodes: ["COMP 3270"],
        },
        {
          label: "Spring 2026",
          index: 1,
          courseCodes: ["COMP 2210", "COMP 2240"],
        },
      ],
    },
  });

  assert.equal(result.isLikelySequenceValid, false);
  const issue = result.prerequisiteIssues.find(
    (prerequisiteIssue) => prerequisiteIssue.courseCode === "COMP 3270",
  );

  assert.ok(issue);
  assert.equal(issue.severity, "warning");
  assert.deepEqual(issue.missingPrerequisites, ["COMP 2210", "COMP 2240"]);
});

test("returns null sequence validity when semester confidence is low", () => {
  const result = checkSoftwareEngineeringPrerequisites({
    courseCodes: ["COMP 1210", "COMP 2210", "COMP 3270"],
  });

  assert.equal(result.semesterConfidence, "low");
  assert.equal(result.isLikelySequenceValid, null);
  assert.equal(result.checkedCourseCount, 3);
});

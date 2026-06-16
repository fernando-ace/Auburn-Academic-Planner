import assert from "node:assert/strict";
import test from "node:test";

import {
  GET,
  POST,
} from "../src/app/api/plan/check-computer-science/route.ts";
import { computerScienceDegreeRule } from "../src/lib/rules/computer-science-degree.ts";

test("GET returns the Degree Works sample Computer Science check", async () => {
  const response = await GET();
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(
    result.planDescription,
    "3 Year Bachelors Degree + AI Certificate",
  );
  assert.equal(result.major, "Computer Science");
  assert.equal(result.program, "CSCI Computer Science");
  assert.equal(result.totalPlannedCredits, 122);
  assert.equal(result.totalHoursRequired, 122);
  assert.equal(result.hasEnoughTotalCredits, true);
  assert.equal(result.isLikelyComplete, false);
  assert.deepEqual(
    result.exactRequiredCoursesMissing.map(
      (course: { code: string }) => course.code,
    ),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200", "COMP 4200"],
  );
  assert.equal(result.advisorVerificationRequired, true);
});

test("POST checks and normalizes a custom complete Computer Science course list", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: [
        ...computerScienceDegreeRule.exactRequiredCourses.map(
          (course) => course.code.toLowerCase(),
        ),
        "phil   1020",
      ],
      planDescription: "Custom CS plan",
      major: "Computer Science",
      totalPlannedCredits: 122,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.planDescription, "Custom CS plan");
  assert.equal(result.major, "Computer Science");
  assert.deepEqual(result.exactRequiredCoursesMissing, []);
  assert.equal(result.alternativeCourseGroups[0].isSatisfied, true);
  assert.equal(result.isLikelyComplete, true);
});

test("POST rejects an empty Computer Science custom course list", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: [],
      planDescription: "Empty plan",
      major: "Computer Science",
      totalPlannedCredits: null,
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    result.error,
    "courseCodes must be a non-empty array of course code strings.",
  );
});

test("POST rejects invalid Computer Science total planned credits", async () => {
  const response = await POST(
    jsonRequest({
      courseCodes: ["COMP 1210"],
      totalPlannedCredits: "122",
    }),
  );
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    result.error,
    "totalPlannedCredits must be a finite number or null when provided.",
  );
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/plan/check-computer-science", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

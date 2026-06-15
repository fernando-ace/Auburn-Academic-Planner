import assert from "node:assert/strict";
import test from "node:test";

import { parseCourseCodes } from "../src/lib/courses/course-code-parser.ts";

test("parses comma-separated course codes", () => {
  assert.deepEqual(parseCourseCodes("COMP 5600, MATH 1610, STAT 3610"), [
    "COMP 5600",
    "MATH 1610",
    "STAT 3610",
  ]);
});

test("parses newline-separated course codes", () => {
  assert.deepEqual(parseCourseCodes("COMP 5600\nCOMP 5630\nCOMP 5130"), [
    "COMP 5600",
    "COMP 5630",
    "COMP 5130",
  ]);
});

test("normalizes lowercase course codes", () => {
  assert.deepEqual(parseCourseCodes("comp 5600, engl 1120"), [
    "COMP 5600",
    "ENGL 1120",
  ]);
});

test("parses course codes without spaces", () => {
  assert.deepEqual(parseCourseCodes("COMP5600 MATH1610"), [
    "COMP 5600",
    "MATH 1610",
  ]);
});

test("parses pasted Degree Works style text with titles and credits", () => {
  const degreeWorksText = `
    Still Needed:
    COMP5600 Computer Ethics and Advanced Computing 3 Credits
    COMP 5630 Secure Software Process 3.000 Credits Grade: IP
    Choose from department-approved elective list: COMP 5610 Artificial Intelligence Programming Credits: 3
    Advisor note: verify total hours before registration.
  `;

  assert.deepEqual(parseCourseCodes(degreeWorksText), [
    "COMP 5600",
    "COMP 5630",
    "COMP 5610",
  ]);
});

test("removes duplicate courses while preserving first-seen order", () => {
  assert.deepEqual(
    parseCourseCodes("comp 5600, COMP5600, MATH 1610, math1610, COMP 5630"),
    ["COMP 5600", "MATH 1610", "COMP 5630"],
  );
});

test("ignores text without supported course codes", () => {
  assert.deepEqual(
    parseCourseCodes("Complete 12 credits and meet with an academic advisor."),
    [],
  );
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  countDegreeWorksCourseStatuses,
  extractDegreeWorksCourseStatuses,
} from "../src/lib/plan/degreeworks-course-status.ts";

test("extracts completed course status from grade-like evidence", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Satisfied requirement COMP 1210 Fundamentals Of Computing I Grade: A Credits: 3.0",
  );

  assert.equal(records[0].code, "COMP 1210");
  assert.equal(records[0].status, "completed");
  assert.equal(records[0].confidence, "high");
  assert.equal(records[0].credits, 3);
});

test("extracts in-progress course status", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Currently Enrolled Fall 2026 COMP 3270 Introduction To Algorithms Credits: 3.0",
  );

  assert.equal(records[0].status, "in_progress");
  assert.equal(records[0].termLabel, "Fall 2026");
});

test("extracts planned status from term-labeled Degree Works plan text", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Spring 2027 Credits: 15 COMP 3500 Intro To Operating Systems Credits: 3.0",
  );

  assert.equal(records[0].status, "planned");
  assert.equal(records[0].confidence, "medium");
  assert.equal(records[0].termLabel, "Spring 2027");
});

test("extracts transfer and AP status", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Transfer TR Advanced Placement AP credit applied for MATH 1610 Credits: 4.0",
  );

  assert.equal(records[0].status, "transfer_or_ap");
});

test("extracts substituted or waived status", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Advisor Exception Substitution petition waived COMP 4730 Computer Ethics Credits: 2.0",
  );

  assert.equal(records[0].status, "substituted_or_waived");
});

test("extracts missing status from still-needed lines", () => {
  const records = extractDegreeWorksCourseStatuses(
    "Still Needed: ENGL 1100 English Composition I Credits: 3.0",
  );

  assert.equal(records[0].status, "missing");
});

test("uses unknown status when evidence is not reliable", () => {
  const records = extractDegreeWorksCourseStatuses(
    "A course appears in unrelated extracted text: COMP 5600 Artificial Intelligence.",
  );

  assert.equal(records[0].status, "unknown");
  assert.equal(records[0].confidence, "low");
});

test("counts all status categories", () => {
  const records = extractDegreeWorksCourseStatuses(
    [
      "COMP 1210 Grade: A Credits: 3.0",
      "COMP 2210 In Progress Credits: 4.0",
      "Spring 2027 COMP 3270 Credits: 3.0",
      "Transfer credit MATH 1610 Credits: 4.0",
      "Substitution COMP 4730 Credits: 2.0",
      "Still Needed ENGL 1100 Credits: 3.0",
      "COMP 5600 Artificial Intelligence",
    ].join("\n"),
  );
  const counts = countDegreeWorksCourseStatuses(records);

  assert.equal(counts.completed, 1);
  assert.equal(counts.in_progress, 1);
  assert.equal(counts.planned, 1);
  assert.equal(counts.transfer_or_ap, 1);
  assert.equal(counts.substituted_or_waived, 1);
  assert.equal(counts.missing, 1);
  assert.equal(counts.unknown, 1);
});

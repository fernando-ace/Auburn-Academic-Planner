import assert from "node:assert/strict";
import test from "node:test";

import {
  countExternalCreditRecords,
  extractExternalCreditRecords,
  parseSatisfiedByEvidence,
} from "../src/lib/plan/degreeworks-external-credit.ts";

test("parses AP satisfied-by evidence into friendly display names", () => {
  const statistics = parseSatisfiedByEvidence(
    "AP9002 - Statistics - Advanced Placement Credit",
  );
  const calculus = parseSatisfiedByEvidence(
    "AP6802 - Math: Calculus BC - Advanced Placement Credit",
  );

  assert.equal(statistics?.sourceCode, "AP9002");
  assert.equal(statistics?.displayName, "AP Statistics");
  assert.equal(statistics?.sourceType, "advanced_placement");
  assert.equal(calculus?.displayName, "AP Math: Calculus BC");
});

test("parses transfer evidence with institution", () => {
  const record = parseSatisfiedByEvidence(
    "ENG101 - Written Composition I - Jefferson State CC",
  );

  assert.equal(record?.sourceCode, "ENG101");
  assert.equal(record?.displayName, "ENG101 Written Composition I");
  assert.equal(record?.sourceType, "transfer");
  assert.equal(record?.institution, "Jefferson State CC");
});

test("links external credit to nearby Auburn course rows", () => {
  const records = extractExternalCreditRecords(
    [
      "Complete See Core Requirements Below",
      "STAT 2510 Statistics for Biological and Health Sciences Grade AP Credits 3 Term Fall 2024",
      "Satisfied by: AP9002 - Statistics - Advanced Placement Credit",
      "ENGL 1100 English Composition I Grade TR Credits 3 Term Fall 2024",
      "Satisfied by: ENG101 - Written Composition I - Jefferson State CC",
    ].join(" "),
  );

  assert.equal(records.length, 2);
  assert.equal(records[0].displayName, "AP Statistics");
  assert.equal(records[0].satisfiesCourseCode, "STAT 2510");
  assert.equal(records[1].displayName, "ENG101 Written Composition I");
  assert.equal(records[1].satisfiesCourseCode, "ENGL 1100");
  assert.equal(records[1].institution, "Jefferson State CC");
});

test("keeps unlinked external credits visible without claiming equivalency", () => {
  const records = extractExternalCreditRecords(
    "Satisfied by: AP3201 - Computer Science Principles - Advanced Placement Credit",
  );

  assert.equal(records.length, 1);
  assert.equal(records[0].sourceCode, "AP3201");
  assert.equal(records[0].displayName, "AP Computer Science Principles");
  assert.equal(records[0].sourceType, "advanced_placement");
  assert.equal(records[0].satisfiesCourseCode, undefined);
  assert.equal(records[0].confidence, "medium");
});

test("ignores ordinary Auburn satisfied-by course evidence", () => {
  const records = extractExternalCreditRecords(
    "Satisfied by: MATH 1610 Calculus I Grade B Credits 4 Term Fall 2024",
  );

  assert.deepEqual(records, []);
  assert.deepEqual(countExternalCreditRecords(records), {
    advanced_placement: 0,
    transfer: 0,
    other: 0,
  });
});

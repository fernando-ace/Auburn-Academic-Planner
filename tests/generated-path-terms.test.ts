import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGeneratedPathStartTermOptions,
  getDefaultGeneratedPathStartTerm,
  normalizeGeneratedPathStartTerm,
} from "../src/lib/plan/generated-path-terms.ts";

test("default generated-path terms roll forward instead of freezing to a release year", () => {
  assert.equal(
    getDefaultGeneratedPathStartTerm(new Date(2031, 0, 15)),
    "Fall 2031",
  );
  assert.equal(
    getDefaultGeneratedPathStartTerm(new Date(2031, 0, 15), true),
    "Summer 2031",
  );
  assert.equal(
    getDefaultGeneratedPathStartTerm(new Date(2031, 9, 15)),
    "Spring 2032",
  );
});

test("generated-path term options include a rolling three-season horizon", () => {
  assert.deepEqual(
    buildGeneratedPathStartTermOptions(new Date(2031, 4, 15), 7),
    [
      "Fall 2031",
      "Spring 2032",
      "Summer 2032",
      "Fall 2032",
      "Spring 2033",
      "Summer 2033",
      "Fall 2033",
    ],
  );
});

test("generated-path start terms normalize invalid and disabled Summer preferences", () => {
  const futureRequestTime = new Date(2038, 0, 15);

  assert.equal(
    normalizeGeneratedPathStartTerm(
      "not a term",
      false,
      futureRequestTime,
    ),
    "Fall 2038",
  );
  assert.equal(
    normalizeGeneratedPathStartTerm("Summer 2039", false, futureRequestTime),
    "Fall 2039",
  );
  assert.equal(
    normalizeGeneratedPathStartTerm("Summer 2039", true, futureRequestTime),
    "Summer 2039",
  );
});

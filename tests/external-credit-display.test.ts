import assert from "node:assert/strict";
import test from "node:test";

import { buildExternalCreditAwareBucketItems } from "../src/lib/plan/external-credit-display.ts";

test("uses external credit labels consistently in status bucket items", () => {
  const items = buildExternalCreditAwareBucketItems({
    codes: ["AP 3201", "COMP 2000", "HIST 1010"],
    externalCreditRecords: [
      {
        sourceCode: "AP3201",
        displayName: "AP Computer Science Principles",
        sourceType: "advanced_placement",
        satisfiesCourseCode: "COMP 2000",
        rawEvidence:
          "AP3201 - Computer Science Principles - Advanced Placement Credit",
        confidence: "high",
      },
    ],
    linkedCourseVerb: "associated with",
  });

  assert.equal(items[0].primaryLabel, "AP Computer Science Principles");
  assert.equal(items[0].secondaryText, "associated with COMP 2000");
  assert.equal(items.some((item) => item.primaryLabel === "AP 3201"), false);
  assert.equal(
    items.filter(
      (item) => item.primaryLabel === "AP Computer Science Principles",
    ).length,
    1,
  );
  assert.equal(items.at(-1)?.primaryLabel, "HIST 1010");
});

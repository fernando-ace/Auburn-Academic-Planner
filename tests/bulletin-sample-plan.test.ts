import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import {
  extractBulletinSamplePlanOrdering,
  findBulletinSamplePlanOrdering,
} from "../src/lib/plan/bulletin-sample-plan.ts";
import { analyzeCurrentDegreeAuditText } from "../src/lib/plan/current-degree-audit-analysis.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const fixtureDirectory = path.join(testDir, "fixtures", "degreeworks");

test("extracts Auburn Bulletin sample plan ordering from Computer Science HTML", async () => {
  const html = await readFile(
    path.join(
      projectRoot,
      "sources",
      "auburn",
      "majors",
      "auburn-major-computerscience.html",
    ),
    "utf8",
  );
  const ordering = extractBulletinSamplePlanOrdering({
    fileName: "auburn/majors/auburn-major-computerscience.html",
    html,
    title: "Computer Science",
  });

  assert.equal(ordering.matchedMajorTitle, "Computer Science");
  assert.equal(ordering.coursesByCode["COMP 1210"].credits, 3);
  assert.equal(ordering.coursesByCode["COMP 3220"].termLabel, "Fall Junior");
  assert.ok(
    ordering.coursesByCode["COMP 3220"].order <
      ordering.coursesByCode["COMP 4710"].order,
  );
});

test("matches checked-in Bulletin plan to detected Current Progress program", async () => {
  const audit = analyzeCurrentDegreeAuditText(
    await readFile(
      path.join(fixtureDirectory, "worksheet-business-audit-sample.txt"),
      "utf8",
    ),
  );
  const ordering = findBulletinSamplePlanOrdering(audit);

  assert.ok(ordering);
  assert.match(ordering.matchedMajorTitle, /Business Administration/);
  assert.ok(ordering.coursesByCode["ACCT 2110"]);
});

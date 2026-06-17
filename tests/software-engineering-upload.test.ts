import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/check-software-engineering/upload/route.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const samplePdfPath = path.join(
  projectRoot,
  "sources",
  "auburn",
  "degreeworks-plan-sample.pdf",
);

test("POST extracts Software Engineering total planned credits from uploaded Degree Works PDF", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "degreeworks-plan-sample.pdf");
  assert.equal(result.parsedCourseCount, 45);
  assert.equal(result.totalPlannedCredits, 122);
  assert.match(result.parserConfidence, /^(high|medium|low)$/);
  assert.ok(Array.isArray(result.parserWarnings));
  assert.equal(typeof result.detectedSignals.hasInProgressSignal, "boolean");
  assert.equal(result.hasEnoughTotalCredits, true);
  assert.ok(Array.isArray(result.requirementBlocks));
  assert.ok(
    result.requirementBlocks.some(
      (block: { blockName: string; status: string; candidateCourses: string[] }) =>
        block.blockName === "Technical Electives" &&
        block.status === "advisor_review" &&
        block.candidateCourses.includes("COMP 5610"),
    ),
  );
  assert.deepEqual(
    result.exactRequiredCoursesMissing.map(
      (course: { code: string }) => course.code,
    ),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200"],
  );
  assert.equal(result.advisorVerificationRequired, true);
});

async function pdfUploadRequest(pdfPath: string) {
  const pdfData = await readFile(pdfPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfData], { type: "application/pdf" }),
    path.basename(pdfPath),
  );

  return new Request(
    "http://localhost/api/plan/check-software-engineering/upload",
    {
      method: "POST",
      body: formData,
    },
  );
}

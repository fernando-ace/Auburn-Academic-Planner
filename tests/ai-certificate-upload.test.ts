import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/check-ai-certificate/upload/route.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const samplePdfPath = path.join(
  projectRoot,
  "sources",
  "auburn",
  "degreeworks-plan-sample.pdf",
);

test("POST extracts and checks an uploaded Degree Works PDF", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "degreeworks-plan-sample.pdf");
  assert.equal(result.parsedCourseCount, 45);
  assert.equal(result.totalPlannedCredits, 122);
  assert.match(result.parserConfidence, /^(high|medium|low)$/);
  assert.ok(Array.isArray(result.parserWarnings));
  assert.ok(Array.isArray(result.courseStatusRecords));
  assert.equal(result.courseStatusRecords.length, 45);
  assert.equal(typeof result.courseStatusCounts.planned, "number");
  assert.equal(typeof result.detectedSignals.hasTransferCreditSignal, "boolean");
  assert.ok(result.parsedCourseCodes.includes("COMP 5600"));
  assert.ok(result.parsedCourseCodes.includes("COMP 5630"));
  assert.ok(result.parsedCourseCodes.includes("COMP 5130"));
  assert.ok(result.parsedCourseCodes.includes("COMP 5610"));
  assert.deepEqual(
    result.requiredCoursesSatisfied.map(
      (course: { code: string }) => course.code,
    ),
    ["COMP 5600", "COMP 5630", "COMP 5130"],
  );
  assert.deepEqual(result.requiredCoursesMissing, []);
  assert.deepEqual(
    result.electiveCandidatesFound.map((course: { code: string }) => course.code),
    ["COMP 5610"],
  );
  assert.equal(result.isLikelyComplete, true);
  assert.equal(result.advisorVerificationRequired, true);
  assert.ok(Array.isArray(result.notes));
});

test("POST rejects a request without a file field", async () => {
  const response = await POST(formDataRequest(new FormData()));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error, 'Upload a PDF file using the "file" form field.');
});

test("POST rejects a non-PDF upload", async () => {
  const formData = new FormData();
  formData.append(
    "file",
    new Blob(["not a pdf"], { type: "text/plain" }),
    "degreeworks.txt",
  );

  const response = await POST(formDataRequest(formData));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error, "Uploaded file must be a PDF.");
});

async function pdfUploadRequest(pdfPath: string) {
  const pdfData = await readFile(pdfPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfData], { type: "application/pdf" }),
    path.basename(pdfPath),
  );

  return formDataRequest(formData);
}

function formDataRequest(formData: FormData) {
  return new Request(
    "http://localhost/api/plan/check-ai-certificate/upload",
    {
      method: "POST",
      body: formData,
    },
  );
}

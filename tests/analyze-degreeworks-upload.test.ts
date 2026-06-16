import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/analyze-degreeworks/upload/route.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");
const samplePdfPath = path.join(
  projectRoot,
  "sources",
  "auburn",
  "degreeworks-plan-sample.pdf",
);

test("POST runs both deterministic Degree Works checks from one uploaded PDF", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "degreeworks-plan-sample.pdf");
  assert.equal(result.parsedCourseCount, 45);
  assert.equal(result.totalPlannedCredits, 122);
  assert.match(result.parserConfidence, /^(high|medium|low)$/);
  assert.ok(Array.isArray(result.parserWarnings));
  assert.equal(typeof result.detectedSignals.hasApCreditSignal, "boolean");
  assert.equal(
    typeof result.detectedSignals.hasInsufficientTextSignal,
    "boolean",
  );
  assert.ok(result.parsedCourseCodes.includes("COMP 5600"));
  assert.equal(result.aiCertificateCheck.isLikelyComplete, true);
  assert.equal(result.aiCertificateCheck.advisorVerificationRequired, true);
  assert.equal(result.softwareEngineeringCheck.isLikelyComplete, false);
  assert.equal(
    result.softwareEngineeringCheck.advisorVerificationRequired,
    true,
  );
  assert.deepEqual(
    result.softwareEngineeringCheck.exactRequiredCoursesMissing.map(
      (course: { code: string }) => course.code,
    ),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200"],
  );
  assert.ok(
    result.notes.some((note: string) =>
      note.includes("not an official degree audit"),
    ),
  );
});

test("POST rejects a request without a file field", async () => {
  const response = await POST(formDataRequest(new FormData()));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error, 'Upload a PDF file using the "file" form field.');
});

test("POST includes semester and prerequisite analysis fields", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.semesterPlanAnalysis.confidence, "high");
  assert.ok(Array.isArray(result.semesterPlanAnalysis.terms));
  assert.ok(result.semesterPlanAnalysis.terms.length >= 2);
  assert.equal(result.semesterPlanAnalysis.terms[0].label, "Summer 2025");
  assert.ok(
    result.semesterPlanAnalysis.terms.some(
      (term: { label: string; courseCodes: string[] }) =>
        term.label === "Fall 2025" &&
        term.courseCodes.includes("COMP 1210"),
    ),
  );
  assert.equal(result.prerequisiteCheck.semesterConfidence, "high");
  assert.equal(result.prerequisiteCheck.checkedCourseCount, 45);
  assert.equal(
    typeof result.prerequisiteCheck.isLikelySequenceValid,
    "boolean",
  );
  assert.ok(Array.isArray(result.prerequisiteCheck.prerequisiteIssues));
  assert.ok(Array.isArray(result.prerequisiteCheck.advisorReviewItems));
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
    "http://localhost/api/plan/analyze-degreeworks/upload",
    {
      method: "POST",
      body: formData,
    },
  );
}

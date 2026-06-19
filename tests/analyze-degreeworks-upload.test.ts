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
  assert.equal(result.selectedTargetPath, "auto");
  assert.equal(result.parsedCourseCount, 45);
  assert.equal(result.totalPlannedCredits, 122);
  assert.match(result.parserConfidence, /^(high|medium|low)$/);
  assert.ok(Array.isArray(result.parserWarnings));
  assert.ok(Array.isArray(result.courseStatusRecords));
  assert.equal(result.courseStatusRecords.length, 45);
  assert.equal(typeof result.courseStatusCounts.planned, "number");
  assert.equal(typeof result.courseStatusCounts.unknown, "number");
  assert.equal(typeof result.detectedSignals.hasApCreditSignal, "boolean");
  assert.equal(
    typeof result.detectedSignals.hasInsufficientTextSignal,
    "boolean",
  );
  assert.ok(result.parsedCourseCodes.includes("COMP 5600"));
  assert.equal(result.aiCertificateCheck.isLikelyComplete, true);
  assert.equal(result.aiCertificateCheck.advisorVerificationRequired, true);
  assert.equal(result.aiCertificateCheck.provenance.confidence, "source_backed");
  assert.equal(
    result.softwareEngineeringCheck.provenance.sourceId,
    "auburn-software-engineering-bulletin",
  );
  assert.equal(result.prerequisiteCheck.provenance.confidence, "local_model");
  assert.ok(Array.isArray(result.nextSemesterSuggestions.advisorMilestones));
  assert.ok(result.gapReport.trustNotes.localModel.length > 0);
  assert.equal(result.gapReport.bestFitPath, "ai_certificate");
  assert.equal(result.gapReport.overallStatus, "missing_requirements");
  assert.ok(
    result.gapReport.satisfiedHighlights.some((highlight: string) =>
      highlight.includes("AI Engineering certificate looks likely complete"),
    ),
  );
  assert.equal(result.softwareEngineeringCheck.isLikelyComplete, false);
  assert.equal(
    result.softwareEngineeringCheck.advisorVerificationRequired,
    true,
  );
  assert.ok(Array.isArray(result.softwareEngineeringCheck.requirementBlocks));
  assert.ok(
    result.softwareEngineeringCheck.requirementBlocks.some(
      (block: { blockName: string; status: string }) =>
        block.blockName === "Core Science Sequence" &&
        block.status === "advisor_review",
    ),
  );
  assert.equal(result.computerScienceCheck.isLikelyComplete, false);
  assert.equal(result.computerScienceCheck.advisorVerificationRequired, true);
  assert.ok(Array.isArray(result.computerScienceCheck.requirementBlocks));
  assert.ok(
    result.gapReport.missingRequirements.some(
      (requirement: { area: string; items: string[] }) =>
        requirement.area === "Software Engineering requirement blocks" &&
        requirement.items.some((item) => item.includes("Technical Electives")),
    ),
  );
  assert.deepEqual(
    result.softwareEngineeringCheck.exactRequiredCoursesMissing.map(
      (course: { code: string }) => course.code,
    ),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200"],
  );
  assert.ok(
    result.gapReport.missingRequirements.some(
      (requirement: { area: string; items: string[] }) =>
        requirement.area === "Software Engineering" &&
        requirement.items.some((item) => item.includes("ENGL 1100")) &&
        requirement.items.some((item) => item.includes("ELEC 2200")),
    ),
  );
  assert.deepEqual(
    result.computerScienceCheck.exactRequiredCoursesMissing.map(
      (course: { code: string }) => course.code,
    ),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200", "COMP 4200"],
  );
  assert.ok(
    result.gapReport.missingRequirements.some(
      (requirement: { area: string; items: string[] }) =>
        requirement.area === "Computer Science" &&
        requirement.items.some((item) => item.includes("COMP 4200")),
    ),
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

test("POST includes deterministic next semester suggestions", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.ok(result.nextSemesterSuggestions);
  assert.match(
    result.nextSemesterSuggestions.targetPath,
    /^(software_engineering|computer_science|ai_certificate|mixed_or_unclear)$/,
  );
  assert.match(result.nextSemesterSuggestions.confidence, /^(high|medium|low)$/);
  assert.ok(Array.isArray(result.nextSemesterSuggestions.suggestedCourses));
  assert.ok(
    result.nextSemesterSuggestions.suggestedCourses.every(
      (course: {
        reason?: string;
        priority?: string;
        creditHours?: number;
        availabilityNotes?: string[];
      }) =>
        typeof course.reason === "string" &&
        /^(high|medium|low)$/.test(course.priority ?? "") &&
        typeof course.creditHours === "number" &&
        Array.isArray(course.availabilityNotes),
    ),
  );
  assert.ok(Array.isArray(result.nextSemesterSuggestions.advisorQuestions));
  assert.ok(
    result.nextSemesterSuggestions.notes.some((note: string) =>
      note.includes("not registration advice"),
    ),
  );
});

test("POST includes a deterministic draft semester plan", async () => {
  const response = await POST(await pdfUploadRequest(samplePdfPath));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.ok(result.gapReport);
  assert.ok(result.nextSemesterSuggestions);
  assert.ok(result.draftSemesterPlan);
  assert.match(
    result.draftSemesterPlan.targetPath,
    /^(software_engineering|computer_science|ai_certificate|mixed_or_unclear)$/,
  );
  assert.ok(Array.isArray(result.draftSemesterPlan.semesters));
  assert.ok(
    result.draftSemesterPlan.semesters
      .flatMap((semester: { plannedCourses: unknown[] }) => semester.plannedCourses)
      .every(
        (course: { availabilityNotes?: string[] }) =>
          Array.isArray(course.availabilityNotes),
      ),
  );
  assert.ok(
    result.gapReport.nextActions.includes(
      "Review the draft semester plan with an academic advisor.",
    ),
  );
});

test("POST accepts, propagates, and validates targetPath", async () => {
  const response = await POST(
    await pdfUploadRequest(samplePdfPath, "software_engineering"),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.selectedTargetPath, "software_engineering");
  assert.equal(result.gapReport.bestFitPath, "software_engineering");
  assert.equal(result.nextSemesterSuggestions.targetPath, "software_engineering");
  assert.equal(result.draftSemesterPlan.targetPath, "software_engineering");
  assert.ok(result.aiCertificateCheck);
  assert.ok(result.softwareEngineeringCheck);
  assert.ok(result.computerScienceCheck);

  const invalidResponse = await POST(
    await pdfUploadRequest(samplePdfPath, "invalid_path"),
  );
  assert.equal(invalidResponse.status, 400);
});

async function pdfUploadRequest(pdfPath: string, targetPath?: string) {
  const pdfData = await readFile(pdfPath);
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([pdfData], { type: "application/pdf" }),
    path.basename(pdfPath),
  );
  if (targetPath) {
    formData.append("targetPath", targetPath);
  }

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

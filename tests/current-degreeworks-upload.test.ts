import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

import { POST as currentPost } from "../src/app/api/plan/analyze-degreeworks-current/upload/route.ts";
import { POST as plannedPost } from "../src/app/api/plan/analyze-degreeworks/upload/route.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = path.join(testDir, "fixtures", "degreeworks");
const plannedPathText =
  "Degree Works Plan Description Universal plan Total planned credits 122 Fall 2026 ACCT 2110 PHIL 1020 FREE 9999";

test("current-progress upload route returns worksheet current-state response", async () => {
  const worksheetText = await readFile(
    path.join(fixtureDirectory, "worksheet-preregistered-sample.txt"),
    "utf8",
  );
  const response = await currentPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks-current/upload",
      await pdfFileFromText(worksheetText, "worksheet-current-progress.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.documentType, "worksheet_audit");
  assert.equal(result.currentProgressAnalysis.creditsRequired, 122);
  assert.ok(
    result.currentProgressAnalysis.preregisteredCourseCodes.includes("COMP 3220"),
  );
  assert.ok(
    result.currentStateNextSteps.verificationItems.some(
      (item: { code: string; status: string }) =>
        item.code === "COMP 3220" && item.status === "preregistered",
    ),
  );
  assert.ok(
    !result.currentStateNextSteps.suggestedCourses.some(
      (course: { code: string }) => course.code === "COMP 3220",
    ),
  );
  assert.match(result.advisorMeetingSummary, /Advisor Meeting Summary/);
});

test("current-progress upload route warns when a planned-path PDF is uploaded", async () => {
  const response = await currentPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks-current/upload",
      await pdfFileFromText(plannedPathText, "universal-plan.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.documentType, "planned_path");
  assert.equal(result.currentProgressAnalysis.confidence, "low");
  assert.equal(result.currentStateGapReport.overallStatus, "insufficient_data");
});

test("current-progress upload route includes external AP and transfer records", async () => {
  const worksheetText = await readFile(
    path.join(fixtureDirectory, "worksheet-transfer-ap-sample.txt"),
    "utf8",
  );
  const response = await currentPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks-current/upload",
      await pdfFileFromText(worksheetText, "worksheet-external-credit.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.currentProgressAnalysis.externalCreditCounts.advanced_placement, 3);
  assert.equal(result.currentProgressAnalysis.externalCreditCounts.transfer, 4);
  assert.ok(
    result.currentProgressAnalysis.externalCreditRecords.some(
      (record: { displayName: string; satisfiesCourseCode?: string }) =>
        record.displayName === "AP Statistics" &&
        record.satisfiesCourseCode === "STAT 2510",
    ),
  );
  assert.ok(
    result.currentProgressAnalysis.externalCreditRecords.some(
      (record: { displayName: string; institution?: string }) =>
        record.displayName === "ENG102 Written Composition II" &&
        record.institution === "Jefferson State CC",
    ),
  );
  assert.ok(
    !result.currentProgressAnalysis.transferOrApCourseCodes.includes("AP 9002"),
  );
  assert.match(
    result.advisorMeetingSummary,
    /AP, transfer, Fall Through/,
  );
});

test("current-progress upload route returns universal native analysis", async () => {
  const worksheetText = await readFile(
    path.join(fixtureDirectory, "worksheet-business-audit-sample.txt"),
    "utf8",
  );
  const response = await currentPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks-current/upload",
      await pdfFileFromText(worksheetText, "worksheet-business.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.detectedProgram.program, "BSBA Business Administration");
  assert.equal(result.availableEnrichments, undefined);
  assert.ok(result.degreeWorksNativeAnalysis.stillNeededItems.length > 0);
  assert.equal(result.catalogEnrichmentResults, undefined);
  assert.equal(result.currentStateNextSteps.targetPath, "degreeworks_native");
});

test("planned-path upload route returns Degree Works-native planned result", async () => {
  const response = await plannedPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks/upload",
      await pdfFileFromText(plannedPathText, "universal-plan.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.documentType, "planned_path");
  assert.ok(result.parsedCourseCount > 0);
  assert.equal(result.totalPlannedCredits, 122);
  assert.equal(result.nextSemesterSuggestions, undefined);
});

test("planned-path upload route can compare against current progress evidence", async () => {
  const worksheetText = await readFile(
    path.join(fixtureDirectory, "worksheet-business-audit-sample.txt"),
    "utf8",
  );
  const currentResponse = await currentPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks-current/upload",
      await pdfFileFromText(worksheetText, "worksheet-business.pdf"),
    ),
  );
  const currentResult = await currentResponse.json();
  const response = await plannedPost(
    formDataRequest(
      "http://localhost/api/plan/analyze-degreeworks/upload",
      await pdfFileFromText(
        "Degree Works Plan Description Business plan Total planned credits 120 Fall 2026 ACCT 2110 PHIL 1020 FREE 9999",
        "business-plan.pdf",
      ),
      currentResult.currentProgressAnalysis,
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.ok(result.plannedPathCoverage);
  assert.ok(
    result.plannedPathCoverage.coveredStillNeededItems.some(
      (item: { matchedCourses: string[] }) =>
        item.matchedCourses.includes("ACCT 2110"),
    ),
  );
  assert.ok(
    result.plannedPathCoverage.coveredStillNeededItems.some(
      (item: { matchedCourses: string[] }) =>
        item.matchedCourses.includes("PHIL 1020"),
    ),
  );
});

async function pdfFileFromText(text: string, fileName: string) {
  return new File([makePdf(text)], fileName, { type: "application/pdf" });
}

function formDataRequest(
  url: string,
  file: File,
  currentProgressAnalysis?: unknown,
) {
  const formData = new FormData();
  formData.append("file", file);
  if (currentProgressAnalysis) {
    formData.append(
      "currentProgressAnalysis",
      JSON.stringify(currentProgressAnalysis),
    );
  }

  return new Request(url, {
    method: "POST",
    body: formData,
  });
}

function makePdf(text: string) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const content = [
    "BT",
    "/F1 9 Tf",
    "40 760 Td",
    ...lines.flatMap((line, index) => [
      `${index === 0 ? "" : "0 -12 Td "}${`(${escapePdfText(line)}) Tj`}`,
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${content.length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.7\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

function escapePdfText(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

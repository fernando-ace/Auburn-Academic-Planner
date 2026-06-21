import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/analyze-degreeworks/upload/route.ts";

const plannedPathText = `
Degree Works Plan
Plan Description Universal planned path
Summer 2026
ACCT 2110 Principles of Financial Accounting 3
PHIL 1020 Introduction to Ethics 3
Fall 2026
MKTG 3310 Principles of Marketing 3
UNIV 4AA0 University Graduation 0
Total planned credits 122.0
`;

test("POST parses a Degree Works-native planned path upload", async () => {
  const response = await POST(
    formDataRequest(await pdfFileFromText(plannedPathText, "universal-plan.pdf")),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "universal-plan.pdf");
  assert.equal(result.selectedTargetPath, "degreeworks_native");
  assert.equal(result.documentType, "planned_path");
  assert.ok(result.parsedCourseCodes.includes("ACCT 2110"));
  assert.ok(result.parsedCourseCodes.includes("PHIL 1020"));
  assert.equal(result.totalPlannedCredits, 122);
  assert.ok(Array.isArray(result.semesterPlanAnalysis.terms));
  assert.equal(result.aiCertificateCheck, undefined);
  assert.equal(result.softwareEngineeringCheck, undefined);
  assert.equal(result.computerScienceCheck, undefined);
  assert.equal(result.prerequisiteCheck, undefined);
  assert.equal(result.gapReport, undefined);
  assert.equal(result.nextSemesterSuggestions, undefined);
  assert.equal(result.draftSemesterPlan, undefined);
});

test("POST compares planned path to current-progress evidence when provided", async () => {
  const currentProgressAnalysis = {
    documentType: "worksheet_audit",
    stillNeededItems: [
      {
        blockName: "Business Major",
        requirementLabel: "ACCT 2110",
        neededText: "Still needed: ACCT 2110",
        requirementType: "specific_course",
        courseOptions: ["ACCT 2110"],
      },
    ],
    completedCourseCodes: [],
    preregisteredCourseCodes: [],
    inProgressCourseCodes: [],
    transferOrApCourseCodes: [],
    confidence: "high",
  };
  const file = await pdfFileFromText(plannedPathText, "business-plan.pdf");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("currentProgressAnalysis", JSON.stringify(currentProgressAnalysis));

  const response = await POST(formDataRequest(formData));
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.ok(result.plannedPathCoverage);
  assert.equal(result.plannedPathCoverage.coveredStillNeededItems.length, 1);
});

test("POST rejects a request without a file field", async () => {
  const response = await POST(formDataRequest(new FormData()));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error, 'Upload a PDF file using the "file" form field.');
});

async function pdfFileFromText(text: string, fileName: string) {
  return new File([makePdf(text)], fileName, { type: "application/pdf" });
}

function formDataRequest(fileOrFormData: File | FormData) {
  const formData = fileOrFormData instanceof FormData ? fileOrFormData : new FormData();

  if (fileOrFormData instanceof File) {
    formData.append("file", fileOrFormData);
  }

  return new Request("http://localhost/api/plan/analyze-degreeworks/upload", {
    method: "POST",
    body: formData,
  });
}

function makePdf(text: string) {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => `BT /F1 10 Tf 40 ${760 - index * 14} Td (${line}) Tj ET`)
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${escaped.length} >>\nstream\n${escaped}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.7\n";

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

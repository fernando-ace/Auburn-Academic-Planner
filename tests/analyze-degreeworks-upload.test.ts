import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "../src/app/api/plan/analyze-degreeworks/upload/route.ts";

const plannedPathText = `
Degree Works Plan
Plan Description Universal planned path
Summer 2026 Credits: 6
ACCT 2110 Principles of Financial Accounting 3
PHIL 1020 Introduction to Ethics 3
Fall 2026 Credits: 19
MKTG 3310 Principles of Marketing 3
ELEC 2200 Elective placeholder 3
UNIV 4AA0 University Graduation 0
Total planned credits 122.0
`;

const currentProgressWorksheetText = `
Auburn University Degree Works Worksheet
Audit date 01/15/2026
Credits required 122
Credits applied 96
Unmet conditions for this set of requirements: 26 Credits needed
Bachelor of Software Engineering INCOMPLETE
Still needed: 3 Credits in COMP 3220
Still needed: 3 Credits in COMP 3270
Preregistered
Fall Through
Disclaimer: This audit is a guide and is not official graduation certification.
`;

test("POST parses a Degree Works-native planned path upload", async () => {
  const response = await POST(
    formDataRequest(await pdfFileFromText(plannedPathText, "universal-plan.pdf")),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.sourceFileName, "Uploaded Degree Works PDF");
  assert.notEqual(result.sourceFileName, "universal-plan.pdf");
  assert.equal(result.selectedTargetPath, "degreeworks_native");
  assert.equal(result.documentType, "planned_path");
  assert.ok(result.parsedCourseCodes.includes("ACCT 2110"));
  assert.ok(result.parsedCourseCodes.includes("PHIL 1020"));
  assert.equal(result.totalPlannedCredits, 122);
  assert.ok(Array.isArray(result.semesterPlanAnalysis.terms));
  assert.equal(result.semesterPlanAnalysis.terms[0].plannedCredits, 6);
  assert.equal(result.semesterPlanAnalysis.terms[1].plannedCredits, 19);
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
      {
        blockName: "Business Major",
        requirementLabel: "Choose one from PHIL 1020 or HIST 1020",
        neededText: "Still needed: PHIL 1020 or HIST 1020",
        requirementType: "course_options",
        courseOptions: ["PHIL 1020", "HIST 1020"],
      },
      {
        blockName: "Business Major",
        requirementLabel: "Business elective list",
        neededText: "Still needed: 6 Credits from MKTG 3310, MNGT 3100, FINC 3610",
        requirementType: "credit_hours_from_list",
        courseOptions: ["MKTG 3310", "MNGT 3100", "FINC 3610"],
      },
      {
        blockName: "University Requirements",
        requirementLabel: "UNIV 4AA0 graduation requirement",
        neededText: "Still needed: UNIV 4AA0",
        requirementType: "graduation_milestone",
        courseOptions: ["UNIV 4AA0"],
      },
      {
        blockName: "Business Major",
        requirementLabel: "See major requirements block",
        neededText: "Still needed: See major requirements block",
        requirementType: "block_reference",
        courseOptions: [],
      },
      {
        blockName: "Business Major",
        requirementLabel: "SCMN 3720",
        neededText: "Still needed: SCMN 3720",
        requirementType: "specific_course",
        courseOptions: ["SCMN 3720"],
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
  assert.ok(
    result.plannedPathCoverage.coveredStillNeededItems.some(
      (item: { requirementLabel: string }) => item.requirementLabel === "ACCT 2110",
    ),
  );
  assert.ok(
    result.plannedPathCoverage.coveredStillNeededItems.some(
      (item: { requirementLabel: string }) =>
        item.requirementLabel === "Choose one from PHIL 1020 or HIST 1020",
    ),
  );
  assert.ok(
    result.plannedPathCoverage.coveredStillNeededItems.some(
      (item: { requirementLabel: string }) =>
        item.requirementLabel === "UNIV 4AA0 graduation requirement",
    ),
  );
  assert.ok(
    result.plannedPathCoverage.advisorReviewStillNeededItems.some(
      (item: { requirementLabel: string }) =>
        item.requirementLabel === "Business elective list",
    ),
  );
  assert.ok(
    result.plannedPathCoverage.advisorReviewStillNeededItems.some(
      (item: { requirementLabel: string }) =>
        item.requirementLabel === "See major requirements block",
    ),
  );
  assert.ok(
    result.plannedPathCoverage.uncoveredStillNeededItems.some(
      (item: { requirementLabel: string }) => item.requirementLabel === "SCMN 3720",
    ),
  );
  assert.ok(result.plannedPathCoverage.plannedButUnmatchedCourses.includes("ELEC 2200"));
});

test("POST rejects a request without a file field", async () => {
  const response = await POST(formDataRequest(new FormData()));
  const result = await response.json();

  assert.equal(response.status, 400);
  assert.equal(result.error, 'Upload a PDF file using the "file" form field.');
});

test("POST rejects a Current Progress worksheet uploaded as Planned Path", async () => {
  const response = await POST(
    formDataRequest(
      await pdfFileFromText(currentProgressWorksheetText, "current-progress.pdf"),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 422);
  assert.equal(result.detectedDocumentType, "worksheet_audit");
  assert.match(result.error, /Current Progress Worksheet/);
  assert.match(result.error, /Planned Path/);
});

test("POST limits confidence when a PDF is not confidently a Planned Path", async () => {
  const response = await POST(
    formDataRequest(
      await pdfFileFromText(
        "Fall 2026 Credits: 6 ACCT 2110 PHIL 1020",
        "ambiguous-plan.pdf",
      ),
    ),
  );
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.parserConfidence, "low");
  assert.ok(
    result.parserWarnings.some((warning: string) =>
      warning.includes("not confidently detected"),
    ),
  );
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

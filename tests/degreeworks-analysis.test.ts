import assert from "node:assert/strict";
import test from "node:test";

import { analyzeDegreeWorksText } from "../src/lib/plan/degreeworks-analysis.ts";

const cleanCourseCodes = Array.from(
  { length: 32 },
  (_, index) => `COMP ${String(1000 + index)}`,
);

function buildDegreeWorksText({
  courses = cleanCourseCodes,
  extraText = "",
}: {
  courses?: string[];
  extraText?: string;
} = {}) {
  return [
    "Degree Works audit worksheet for Software Engineering progress.",
    "Catalog year 2025-2026. Total planned credits: 122.",
    "The following planned coursework appears in the extracted text.",
    courses
      .map((courseCode, index) => `${courseCode} Planned Course ${index + 1}`)
      .join("\n"),
    "Additional audit text repeats requirement labels, section headings, semester labels, and advising notes so extracted text length is sufficient for deterministic confidence checks.",
    "This line is intentionally ordinary audit text with no special parser signal wording.",
    extraText,
  ].join("\n");
}

test("analyzes Degree Works-like text with courses and total planned credits", () => {
  const analysis = analyzeDegreeWorksText(buildDegreeWorksText());

  assert.equal(analysis.parsedCourseCount, 32);
  assert.equal(analysis.courseStatusRecords.length, 32);
  assert.equal(analysis.courseStatusCounts.planned, 32);
  assert.equal(analysis.courseStatusCounts.unknown, 0);
  assert.deepEqual(analysis.parsedCourseCodes.slice(0, 3), [
    "COMP 1000",
    "COMP 1001",
    "COMP 1002",
  ]);
  assert.equal(analysis.totalPlannedCredits, 122);
  assert.equal(analysis.confidence, "high");
  assert.deepEqual(analysis.parserWarnings, []);
});

test("warns and lowers confidence when many course statuses are unknown", () => {
  const courseText = cleanCourseCodes
    .map((courseCode, index) => `${courseCode} Course Name ${index + 1}`)
    .join("\n");
  const analysis = analyzeDegreeWorksText(
    [
      "Degree Works audit worksheet for Software Engineering progress.",
      "Catalog year 2025-2026. Total planned credits: 122.",
      "The following extracted coursework appears in unclassified audit text.",
      courseText,
      "Additional ordinary audit text repeats neutral requirement labels and advising notes so extracted text length is sufficient for deterministic confidence checks.",
      "No reliable status words are present near the parsed course codes.",
    ].join("\n"),
  );

  assert.equal(analysis.courseStatusCounts.unknown, 32);
  assert.equal(analysis.confidence, "low");
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("statuses marked unknown"),
    ),
  );
});

test("warns when AP, transfer, substitution, exception, and in-progress signals appear", () => {
  const analysis = analyzeDegreeWorksText(
    buildDegreeWorksText({
      extraText:
        "AP credit, Advanced Placement, AICE, IB, Transfer, TR, TRAN, transferred, In-progress, In Progress, Registered, Currently Enrolled, Substitution, Substituted, Exception, Waived, Petition.",
    }),
  );

  assert.equal(analysis.confidence, "medium");
  assert.equal(analysis.detectedSignals.hasApCreditSignal, true);
  assert.equal(analysis.detectedSignals.hasTransferCreditSignal, true);
  assert.equal(analysis.detectedSignals.hasInProgressSignal, true);
  assert.equal(analysis.detectedSignals.hasSubstitutionSignal, true);
  assert.equal(analysis.detectedSignals.hasExceptionSignal, true);
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("Advanced Placement"),
    ),
  );
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("transfer credit"),
    ),
  );
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("in-progress"),
    ),
  );
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("substitution"),
    ),
  );
  assert.ok(
    analysis.parserWarnings.some((warning) => warning.includes("exception")),
  );
});

test("uses low confidence for empty or very short extracted text", () => {
  const emptyAnalysis = analyzeDegreeWorksText("");
  const shortAnalysis = analyzeDegreeWorksText("COMP 1210 Total planned credits: 3");

  assert.equal(emptyAnalysis.confidence, "low");
  assert.equal(emptyAnalysis.detectedSignals.hasInsufficientTextSignal, true);
  assert.equal(shortAnalysis.confidence, "low");
  assert.equal(shortAnalysis.detectedSignals.hasInsufficientTextSignal, true);
  assert.ok(
    shortAnalysis.parserWarnings.some((warning) =>
      warning.includes("very few course codes"),
    ),
  );
});

test("detects requirement block labels without assigning nearby courses", () => {
  const analysis = analyzeDegreeWorksText(
    buildDegreeWorksText({
      extraText:
        "Core Science Sequence Technical Elective Free Elective Humanities Social Science Math Elective",
    }),
  );

  assert.ok(analysis.detectedRequirementBlockLabels.includes("Core Science"));
  assert.ok(
    analysis.detectedRequirementBlockLabels.includes("Technical Elective"),
  );
  assert.ok(
    analysis.parserWarnings.some((warning) =>
      warning.includes("does not safely map nearby courses"),
    ),
  );
});

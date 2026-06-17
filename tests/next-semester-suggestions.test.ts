import assert from "node:assert/strict";
import test from "node:test";

import { buildNextSemesterSuggestions } from "../src/lib/plan/next-semester-suggestions.ts";
import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "../src/lib/samples/degreeworks-plan-sample.ts";

test("suggests missing AI certificate courses when missing", () => {
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: ["COMP 5600"],
    aiCertificateCheck: checkAiEngineeringCertificate(["COMP 5600"]),
    targetPath: "ai_certificate",
    parserConfidence: "high",
  });

  assert.equal(suggestions.targetPath, "ai_certificate");
  assert.equal(suggestions.confidence, "high");
  assert.deepEqual(
    suggestions.suggestedCourses.map((course) => course.code),
    ["COMP 5630", "COMP 5130"],
  );
  assert.ok(
    suggestions.suggestedCourses.every(
      (course) => course.category === "certificate_requirement",
    ),
  );
});

test("suggests missing Software Engineering required courses when eligible", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    targetPath: "software_engineering",
    parserConfidence: "high",
  });

  assert.deepEqual(
    suggestions.suggestedCourses.map((course) => course.code),
    ["ENGL 1100", "ENGL 1120", "ENGR 1100", "ELEC 2200"],
  );
  assert.ok(
    suggestions.suggestedCourses.every(
      (course) => course.category === "missing_required",
    ),
  );
});

test("does not suggest a modeled course when prerequisites are missing", () => {
  const courseCodes = ["COMP 1210"];
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    targetPath: "software_engineering",
    parserConfidence: "medium",
  });

  assert.ok(
    suggestions.notYetRecommended.some(
      (course) =>
        course.code === "COMP 3270" &&
        course.reason.includes("COMP 2210") &&
        course.reason.includes("COMP 2240"),
    ),
  );
  assert.ok(
    !suggestions.suggestedCourses.some((course) => course.code === "COMP 3270"),
  );
});

test("low parser confidence lowers suggestion confidence", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    computerScienceCheck: checkComputerScienceDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    targetPath: "auto",
    parserConfidence: "low",
  });

  assert.equal(suggestions.targetPath, "mixed_or_unclear");
  assert.equal(suggestions.confidence, "low");
  assert.ok(
    suggestions.notes.some((note) =>
      note.includes("PDF parser confidence is low"),
    ),
  );
});

test("caps suggestions to avoid huge lists", () => {
  const courseCodes: string[] = [];
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: null,
    }),
    targetPath: "software_engineering",
    parserConfidence: "medium",
  });

  assert.equal(suggestions.suggestedCourses.length, 5);
});

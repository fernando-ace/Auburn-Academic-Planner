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
  assert.equal(suggestions.suggestedCourses[0].creditHours, 3);
  assert.equal(
    suggestions.suggestedCourses[0].availabilityConfidence,
    "unknown_requires_advisor_review",
  );
  assert.match(
    suggestions.suggestedCourses[0].availabilityNotes?.[0] ?? "",
    /verify the target-term offering/,
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
  assert.ok(
    suggestions.notes.some((note) =>
      note.includes("Unresolved core and elective requirement blocks"),
    ),
  );
  assert.ok(
    suggestions.advisorQuestions.some((question) =>
      question.includes("unresolved core, math elective, technical elective"),
    ),
  );
  assert.ok(
    !suggestions.suggestedCourses.some((course) =>
      /elective/i.test(course.code),
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

test("avoids recommending completed or already planned missing courses", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({
      courseCodes,
      totalPlannedCredits: 122,
    }),
    targetPath: "software_engineering",
    parserConfidence: "high",
    courseStatusRecords: [
      {
        code: "ENGL 1100",
        status: "completed",
        confidence: "high",
      },
      {
        code: "ENGL 1120",
        status: "planned",
        confidence: "medium",
      },
    ],
  });

  assert.ok(
    !suggestions.suggestedCourses.some((course) => course.code === "ENGL 1100"),
  );
  assert.ok(
    !suggestions.suggestedCourses.some((course) => course.code === "ENGL 1120"),
  );
  assert.ok(
    suggestions.notYetRecommended.some(
      (course) =>
        course.code === "ENGL 1100" &&
        course.reason.includes("appears completed"),
    ),
  );
  assert.ok(
    suggestions.notYetRecommended.some(
      (course) =>
        course.code === "ENGL 1120" &&
        course.reason.includes("verify enrollment or completion"),
    ),
  );
});

test("Software Engineering target excludes Computer Science-only courses", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({ courseCodes }),
    computerScienceCheck: checkComputerScienceDegree({ courseCodes }),
    targetPath: "software_engineering",
    parserConfidence: "high",
  });

  assert.ok(!suggestions.suggestedCourses.some((course) => course.code === "COMP 4200"));
  assert.ok(!suggestions.notYetRecommended.some((course) => course.code === "COMP 4200"));
});

test("Computer Science target can include missing COMP 4200", () => {
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    computerScienceCheck: checkComputerScienceDegree({ courseCodes }),
    targetPath: "computer_science",
    parserConfidence: "high",
  });

  assert.ok(suggestions.suggestedCourses.some((course) => course.code === "COMP 4200"));
});

test("AI certificate target stays within certificate requirements and elective discussion", () => {
  const courseCodes = ["COMP 5600", "COMP 5630", "COMP 5130"];
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({ courseCodes }),
    computerScienceCheck: checkComputerScienceDegree({ courseCodes }),
    targetPath: "ai_certificate",
    parserConfidence: "high",
  });

  assert.deepEqual(
    suggestions.suggestedCourses.map((course) => course.code),
    ["Approved AI elective"],
  );
  assert.ok(suggestions.suggestedCourses[0].reason.includes("AI certificate"));
});

test("auto target preserves mixed-path behavior when inference is unclear", () => {
  const courseCodes: string[] = [];
  const suggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    aiCertificateCheck: checkAiEngineeringCertificate(courseCodes),
    softwareEngineeringCheck: checkSoftwareEngineeringDegree({ courseCodes }),
    computerScienceCheck: checkComputerScienceDegree({ courseCodes }),
    targetPath: "auto",
    parserConfidence: "low",
  });

  assert.equal(suggestions.targetPath, "mixed_or_unclear");
  assert.ok(suggestions.suggestedCourses.some((course) => course.code === "COMP 5600"));
  assert.ok(suggestions.suggestedCourses.some((course) => course.code === "ENGL 1100"));
});

import assert from "node:assert/strict";
import test from "node:test";

import { buildDraftSemesterPlan } from "../src/lib/plan/draft-semester-plan.ts";
import { buildNextSemesterSuggestions } from "../src/lib/plan/next-semester-suggestions.ts";
import type { DegreeWorksCourseStatusRecord } from "../src/lib/plan/degreeworks-course-status.ts";
import type { DraftSemesterPlanTargetPathInput } from "../src/lib/plan/draft-semester-plan.ts";
import { checkAiEngineeringCertificate } from "../src/lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../src/lib/rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../src/lib/rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../src/lib/rules/software-engineering-prerequisites.ts";

function buildPlan({
  courseCodes = ["MATH 1000"],
  targetPath = "software_engineering" as const,
  courseStatusRecords = [],
  maxCreditsPerSemester = 15,
  maxSemesters = 6,
}: {
  courseCodes?: string[];
  targetPath?: DraftSemesterPlanTargetPathInput;
  courseStatusRecords?: DegreeWorksCourseStatusRecord[];
  maxCreditsPerSemester?: number;
  maxSemesters?: number;
} = {}) {
  const aiCertificateCheck = checkAiEngineeringCertificate(courseCodes);
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes,
    totalPlannedCredits: null,
  });
  const computerScienceCheck = checkComputerScienceDegree({
    courseCodes,
    totalPlannedCredits: null,
  });
  const prerequisiteCheck = checkSoftwareEngineeringPrerequisites({ courseCodes });
  const nextSemesterSuggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    prerequisiteCheck,
    targetPath,
    parserConfidence: courseCodes.length === 0 ? "low" : "medium",
    courseStatusRecords,
  });

  return buildDraftSemesterPlan({
    parsedCourseCodes: courseCodes,
    courseStatusRecords,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    prerequisiteCheck,
    requirementBlockResults: {
      softwareEngineering: softwareEngineeringCheck.requirementBlocks,
      computerScience: computerScienceCheck.requirementBlocks,
    },
    nextSemesterSuggestions,
    targetPath,
    maxCreditsPerSemester,
    maxSemesters,
  });
}

test("does not place a course marked completed", () => {
  const plan = buildPlan({
    courseCodes: ["COMP 5600"],
    targetPath: "ai_certificate",
    courseStatusRecords: [
      { code: "COMP 5130", status: "completed", confidence: "high" },
    ],
  });

  assert.ok(
    !plan.semesters.some((semester) =>
      semester.plannedCourses.some((course) => course.code === "COMP 5130"),
    ),
  );
  assert.ok(plan.advisorReviewItems.some((item) => item.includes("COMP 5130")));
});

test("does not duplicate in-progress or planned courses", () => {
  const plan = buildPlan({
    courseCodes: ["COMP 5600"],
    targetPath: "ai_certificate",
    courseStatusRecords: [
      { code: "COMP 5130", status: "in_progress", confidence: "high" },
      { code: "COMP 5630", status: "planned", confidence: "medium" },
    ],
  });
  const placedCodes = plan.semesters.flatMap((semester) =>
    semester.plannedCourses.map((course) => course.code),
  );

  assert.ok(!placedCodes.includes("COMP 5130"));
  assert.ok(!placedCodes.includes("COMP 5630"));
});

test("places modeled prerequisites in earlier semesters", () => {
  const plan = buildPlan({ maxCreditsPerSemester: 30 });
  const termByCourse = new Map<string, number>();

  plan.semesters.forEach((semester, semesterIndex) => {
    semester.plannedCourses.forEach((course) => {
      termByCourse.set(course.code, semesterIndex);
    });
  });

  assert.ok(termByCourse.has("COMP 1210"));
  assert.ok(termByCourse.has("COMP 2210"));
  assert.ok(termByCourse.has("COMP 3270"));
  assert.ok(termByCourse.get("COMP 1210")! < termByCourse.get("COMP 2210")!);
  assert.ok(termByCourse.get("COMP 2210")! < termByCourse.get("COMP 3270")!);
});

test("keeps semester credits at or below the configured cap", () => {
  const plan = buildPlan({ maxCreditsPerSemester: 6 });

  assert.ok(plan.semesters.length > 0);
  assert.ok(plan.semesters.every((semester) => semester.estimatedCredits <= 6));
});

test("caps the draft and returns remaining courses as unplaced", () => {
  const plan = buildPlan({ maxCreditsPerSemester: 3, maxSemesters: 1 });

  assert.equal(plan.semesters.length, 1);
  assert.ok(plan.unplacedCourses.length > 0);
});

test("returns a course as unplaced when modeled prerequisites are unavailable", () => {
  const courseCodes = ["MATH 1000"];
  const aiCertificateCheck = checkAiEngineeringCertificate(courseCodes);
  const baseSoftwareCheck = checkSoftwareEngineeringDegree({ courseCodes });
  const computerScienceCheck = checkComputerScienceDegree({ courseCodes });
  const softwareEngineeringCheck = {
    ...baseSoftwareCheck,
    exactRequiredCoursesMissing: baseSoftwareCheck.exactRequiredCoursesMissing.filter(
      (course) => course.code === "COMP 3270",
    ),
  };
  const prerequisiteCheck = checkSoftwareEngineeringPrerequisites({ courseCodes });
  const nextSemesterSuggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: courseCodes,
    softwareEngineeringCheck,
    targetPath: "software_engineering",
  });
  const plan = buildDraftSemesterPlan({
    parsedCourseCodes: courseCodes,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    prerequisiteCheck,
    requirementBlockResults: {
      softwareEngineering: softwareEngineeringCheck.requirementBlocks,
      computerScience: computerScienceCheck.requirementBlocks,
    },
    nextSemesterSuggestions,
    targetPath: "software_engineering",
  });

  assert.ok(
    plan.unplacedCourses.some(
      (course) =>
        course.code === "COMP 3270" && course.reason.includes("COMP 2210"),
    ),
  );
});

test("turns unresolved requirement blocks into advisor review items", () => {
  const plan = buildPlan();

  assert.ok(
    plan.advisorReviewItems.some((item) =>
      item.includes("confirm the applicable core or elective choices"),
    ),
  );
});

test("is deterministic and low confidence when input is insufficient", () => {
  const first = buildPlan({ courseCodes: [], targetPath: "auto" });
  const second = buildPlan({ courseCodes: [], targetPath: "auto" });

  assert.deepEqual(first, second);
  assert.equal(first.confidence, "low");
});

test("draft semester planner respects the selected target path", () => {
  const courseCodes = [
    "COMP 1210",
    "COMP 2210",
    "COMP 2240",
    "COMP 2710",
    "COMP 3240",
  ];
  const softwarePlan = buildPlan({ courseCodes, targetPath: "software_engineering" });
  const computerSciencePlan = buildPlan({ courseCodes, targetPath: "computer_science" });
  const aiPlan = buildPlan({ courseCodes, targetPath: "ai_certificate" });
  const softwareCodes = softwarePlan.semesters.flatMap((semester) =>
    semester.plannedCourses.map((course) => course.code),
  );
  const computerScienceCodes = computerSciencePlan.semesters.flatMap((semester) =>
    semester.plannedCourses.map((course) => course.code),
  );
  const aiCodes = aiPlan.semesters.flatMap((semester) =>
    semester.plannedCourses.map((course) => course.code),
  );

  assert.ok(!softwareCodes.includes("COMP 4200"));
  assert.ok(computerScienceCodes.includes("COMP 4200"));
  assert.ok(aiCodes.every((code) => ["COMP 5600", "COMP 5630", "COMP 5130"].includes(code)));
  assert.ok(aiPlan.advisorReviewItems.some((item) => item.includes("certificate elective")));
});

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parseCourseCodes } from "../src/lib/courses/course-code-parser.ts";
import { extractPdfText } from "../src/lib/pdf/pdf-text.ts";
import {
  checkAiEngineeringCertificate,
  type CourseRule,
  type ElectiveCandidateRule,
} from "../src/lib/rules/ai-certificate.ts";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourceRelativePath = "sources/auburn/degreeworks-plan-sample.pdf";
const sourcePath = path.join(projectRoot, sourceRelativePath);

async function main() {
  const pdfText = await extractPdfText(await readFile(sourcePath));
  const courseCodes = parseCourseCodes(pdfText);
  const certificateCheck = checkAiEngineeringCertificate(courseCodes);

  console.log(`Source: ${sourceRelativePath}`);
  console.log(`Parsed course codes: ${courseCodes.length}`);
  console.log("Course codes:");

  for (const courseCode of courseCodes) {
    console.log(courseCode);
  }

  console.log("");
  console.log("AI Certificate Check");
  console.log(
    `Required courses satisfied: ${formatCourses(
      certificateCheck.requiredCoursesSatisfied,
    )}`,
  );
  console.log(
    `Required courses missing: ${formatCourses(
      certificateCheck.requiredCoursesMissing,
    )}`,
  );
  console.log(
    `Elective candidates found: ${formatElectiveCandidates(
      certificateCheck.electiveCandidatesFound,
    )}`,
  );
  console.log(
    `Likely complete: ${formatBoolean(certificateCheck.isLikelyComplete)}`,
  );
  console.log(
    `Advisor verification required: ${formatBoolean(
      certificateCheck.advisorVerificationRequired,
    )}`,
  );
  console.log("Notes:");

  for (const note of certificateCheck.notes) {
    console.log(`- ${note}`);
  }
}

function formatCourses(courses: CourseRule[]) {
  if (courses.length === 0) {
    return "none";
  }

  return courses.map((course) => course.code).join(", ");
}

function formatElectiveCandidates(courses: ElectiveCandidateRule[]) {
  if (courses.length === 0) {
    return "none";
  }

  return courses
    .map((course) => `${course.code} (${course.approvalStatus})`)
    .join(", ");
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

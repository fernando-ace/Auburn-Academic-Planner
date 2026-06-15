import type { AuburnSource, IncomingMessage, ModelAnswer } from "./gemini-rag.ts";
import {
  aiEngineeringCertificateRule,
  checkAiEngineeringCertificate,
  type CourseRule,
  type ElectiveCandidateRule,
} from "./rules/ai-certificate.ts";
import { getDegreeWorksPlanSampleCourseCodes } from "./samples/degreeworks-plan-sample.ts";

const ADVISOR_VERIFICATION_NOTE =
  "Advisor verification required: use this as preparation and verify your plan with an Auburn academic advisor.";

function latestUserQuestion(messages: IncomingMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.trim();
}

function includesAny(value: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(value));
}

export function isDegreeWorksPlanAiCertificateQuestion(
  messages: IncomingMessage[],
) {
  const question = latestUserQuestion(messages)?.toLowerCase() ?? "";
  const mentionsAiCertificate = includesAny(question, [
    /\bai\s+(engineering\s+)?certificate\b/,
    /\bartificial\s+intelligence\s+engineering\s+certificate\b/,
  ]);
  const mentionsDegreeWorksPlanSample = includesAny(question, [
    /\bdegree\s*works\b.*\bplan\s*sample\b/,
    /\bdegreeworks[-\s]?plan[-\s]?sample\b/,
  ]);
  const asksPlanCourseFit = includesAny(question, [
    /\bcourses?\s+in\s+my\s+plan\b.*\bcounts?\b/,
    /\bmy\s+plan\b.*\bcourses?\b.*\bcounts?\b/,
    /\bwhich\s+courses?\b.*\bplan\b.*\bcertificate\b/,
  ]);

  return mentionsAiCertificate && (mentionsDegreeWorksPlanSample || asksPlanCourseFit);
}

function formatCourses(courses: CourseRule[]) {
  if (courses.length === 0) {
    return "none";
  }

  return courses
    .map((course) => `${course.code} ${course.title} (${course.creditHours} credits)`)
    .join("; ");
}

function formatElectiveCandidates(courses: ElectiveCandidateRule[]) {
  if (courses.length === 0) {
    return "none found in the sample plan";
  }

  return courses
    .map(
      (course) =>
        `${course.code} ${course.title} (${course.creditHours} credits; advisor verification required)`,
    )
    .join("; ");
}

export function buildDegreeWorksPlanAiCertificateAnswer(
  sources: AuburnSource[] = [],
  courseCodes = getDegreeWorksPlanSampleCourseCodes(),
): ModelAnswer {
  const result = checkAiEngineeringCertificate(courseCodes);
  const status = result.isLikelyComplete
    ? "Likely complete for planning purposes, because the sample plan includes all three required courses and one local elective candidate."
    : "Not likely complete yet for planning purposes.";

  return {
    answer: [
      `Using the local deterministic checker for the Degree Works Plan Sample courses (${courseCodes.join(", ")}):`,
      `Required courses satisfied: ${formatCourses(result.requiredCoursesSatisfied)}.`,
      `Required courses missing: ${formatCourses(result.requiredCoursesMissing)}.`,
      `Elective candidates found: ${formatElectiveCandidates(result.electiveCandidatesFound)}.`,
      `Likely complete: ${result.isLikelyComplete ? "yes" : "no"}. ${status}`,
      `Advisor verification required: ${result.advisorVerificationRequired ? "yes" : "no"}. The ${aiEngineeringCertificateRule.electiveRequirement.description.toLowerCase()} still needs Auburn department/advisor approval.`,
    ].join("\n\n"),
    sources,
    confidence: "High",
    advisorVerificationNote: ADVISOR_VERIFICATION_NOTE,
  };
}

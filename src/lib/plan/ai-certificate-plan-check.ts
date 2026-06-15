import { checkAiEngineeringCertificate } from "../rules/ai-certificate.ts";
import {
  getDegreeWorksPlanSample,
  getDegreeWorksPlanSampleCourseCodes,
} from "../samples/degreeworks-plan-sample.ts";

export type AiCertificatePlanCheck = {
  planDescription: string;
  major: string;
  totalPlannedCredits: number | null;
  requiredCoursesSatisfied: ReturnType<
    typeof checkAiEngineeringCertificate
  >["requiredCoursesSatisfied"];
  requiredCoursesMissing: ReturnType<
    typeof checkAiEngineeringCertificate
  >["requiredCoursesMissing"];
  electiveCandidatesFound: ReturnType<
    typeof checkAiEngineeringCertificate
  >["electiveCandidatesFound"];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

export type CustomAiCertificatePlanCheckInput = {
  courseCodes: string[];
  planDescription: string;
  major: string;
  totalPlannedCredits: number | null;
};

export function normalizePlanCheckCourseCode(courseCode: string) {
  return courseCode.trim().toUpperCase().replace(/\s+/g, " ");
}

export function buildAiCertificatePlanCheck() {
  const plan = getDegreeWorksPlanSample();
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();

  return buildCustomAiCertificatePlanCheck({
    courseCodes,
    planDescription: plan.planDescription,
    major: plan.major,
    totalPlannedCredits: plan.totalPlannedCredits,
  });
}

export function buildCustomAiCertificatePlanCheck({
  courseCodes,
  major,
  planDescription,
  totalPlannedCredits,
}: CustomAiCertificatePlanCheckInput): AiCertificatePlanCheck {
  const normalizedCourseCodes = courseCodes.map(normalizePlanCheckCourseCode);
  const result = checkAiEngineeringCertificate(normalizedCourseCodes);

  return {
    planDescription,
    major,
    totalPlannedCredits,
    requiredCoursesSatisfied: result.requiredCoursesSatisfied,
    requiredCoursesMissing: result.requiredCoursesMissing,
    electiveCandidatesFound: result.electiveCandidatesFound,
    isLikelyComplete: result.isLikelyComplete,
    advisorVerificationRequired: result.advisorVerificationRequired,
    notes: result.notes,
  };
}

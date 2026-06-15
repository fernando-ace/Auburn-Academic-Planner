import { checkAiEngineeringCertificate } from "../rules/ai-certificate.ts";
import {
  getDegreeWorksPlanSample,
  getDegreeWorksPlanSampleCourseCodes,
} from "../samples/degreeworks-plan-sample.ts";

export function buildAiCertificatePlanCheck() {
  const plan = getDegreeWorksPlanSample();
  const courseCodes = getDegreeWorksPlanSampleCourseCodes();
  const result = checkAiEngineeringCertificate(courseCodes);

  return {
    planDescription: plan.planDescription,
    major: plan.major,
    totalPlannedCredits: plan.totalPlannedCredits,
    requiredCoursesSatisfied: result.requiredCoursesSatisfied,
    requiredCoursesMissing: result.requiredCoursesMissing,
    electiveCandidatesFound: result.electiveCandidatesFound,
    isLikelyComplete: result.isLikelyComplete,
    advisorVerificationRequired: result.advisorVerificationRequired,
    notes: result.notes,
  };
}

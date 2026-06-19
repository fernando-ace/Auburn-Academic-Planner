import { analyzeDegreeWorksText } from "./degreeworks-analysis.ts";
import { buildDraftSemesterPlan } from "./draft-semester-plan.ts";
import { extractDegreeWorksSemesters } from "./degreeworks-semesters.ts";
import { buildGapReport } from "./gap-report.ts";
import { buildNextSemesterSuggestions } from "./next-semester-suggestions.ts";
import type { PlanningTargetPathInput } from "./target-path.ts";
import { checkAiEngineeringCertificate } from "../rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../rules/computer-science-degree.ts";
import { checkSoftwareEngineeringDegree } from "../rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../rules/software-engineering-prerequisites.ts";

export function analyzeCombinedDegreeWorksText({
  text,
  targetPath,
}: {
  text: string;
  targetPath: PlanningTargetPathInput;
}) {
  const degreeWorksAnalysis = analyzeDegreeWorksText(text);
  const semesterPlanAnalysis = extractDegreeWorksSemesters(text);
  const aiCertificateCheck = checkAiEngineeringCertificate(
    degreeWorksAnalysis.parsedCourseCodes,
  );
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
  });
  const computerScienceCheck = checkComputerScienceDegree({
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
  });
  const prerequisiteCheck = checkSoftwareEngineeringPrerequisites({
    semesterPlanAnalysis,
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
  });
  const nextSemesterSuggestions = buildNextSemesterSuggestions({
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    prerequisiteCheck,
    parserConfidence: degreeWorksAnalysis.confidence,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    targetPath,
  });
  const draftSemesterPlan = buildDraftSemesterPlan({
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    softwareEngineeringCheck,
    computerScienceCheck,
    aiCertificateCheck,
    prerequisiteCheck,
    requirementBlockResults: {
      softwareEngineering: softwareEngineeringCheck.requirementBlocks,
      computerScience: computerScienceCheck.requirementBlocks,
    },
    nextSemesterSuggestions,
    targetPath,
  });
  const gapReport = buildGapReport({
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    detectedSignals: degreeWorksAnalysis.detectedSignals,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    parserConfidence: degreeWorksAnalysis.confidence,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    prerequisiteCheck,
    draftSemesterPlanGenerated: true,
    targetPath,
  });

  return {
    selectedTargetPath: targetPath,
    parsedCourseCount: degreeWorksAnalysis.parsedCourseCount,
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
    detectedSignals: degreeWorksAnalysis.detectedSignals,
    detectedRequirementBlockLabels:
      degreeWorksAnalysis.detectedRequirementBlockLabels,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    courseStatusCounts: degreeWorksAnalysis.courseStatusCounts,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    parserConfidence: degreeWorksAnalysis.confidence,
    semesterPlanAnalysis,
    prerequisiteCheck,
    gapReport,
    nextSemesterSuggestions,
    draftSemesterPlan,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
  };
}

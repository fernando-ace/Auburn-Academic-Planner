import { analyzeDegreeWorksText } from "./degreeworks-analysis.ts";
import { extractDegreeWorksSemesters } from "./degreeworks-semesters.ts";

export function analyzeCombinedDegreeWorksText({ text }: { text: string }) {
  const degreeWorksAnalysis = analyzeDegreeWorksText(text);
  const semesterPlanAnalysis = extractDegreeWorksSemesters(text);

  return {
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
  };
}

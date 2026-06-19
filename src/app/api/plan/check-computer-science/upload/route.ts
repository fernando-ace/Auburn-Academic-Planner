import { validatePdfUpload } from "../../../../../lib/api/pdf-upload-validation.ts";
import { analyzeDegreeWorksText } from "../../../../../lib/plan/degreeworks-analysis.ts";
import { checkComputerScienceDegree } from "../../../../../lib/rules/computer-science-degree.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return Response.json(
      { error: "Request body must be multipart/form-data." },
      { status: 400 },
    );
  }

  const uploadedFile = formData.get("file");

  const upload = await validatePdfUpload(uploadedFile);
  if (!upload.ok) {
    return Response.json({ error: upload.error }, { status: upload.status });
  }

  const degreeWorksAnalysis = analyzeDegreeWorksText(upload.text);
  const degreeCheck = checkComputerScienceDegree({
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
  });

  return Response.json({
    sourceFileName: upload.fileName,
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    parsedCourseCount: degreeWorksAnalysis.parsedCourseCount,
    detectedSignals: degreeWorksAnalysis.detectedSignals,
    detectedRequirementBlockLabels:
      degreeWorksAnalysis.detectedRequirementBlockLabels,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    courseStatusCounts: degreeWorksAnalysis.courseStatusCounts,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    parserConfidence: degreeWorksAnalysis.confidence,
    exactRequiredCoursesSatisfied: degreeCheck.exactRequiredCoursesSatisfied,
    exactRequiredCoursesMissing: degreeCheck.exactRequiredCoursesMissing,
    alternativeCourseGroups: degreeCheck.alternativeCourseGroups,
    advisorVerifiedRequirements: degreeCheck.advisorVerifiedRequirements,
    requirementBlocks: degreeCheck.requirementBlocks,
    totalHoursRequired: degreeCheck.totalHoursRequired,
    totalPlannedCredits: degreeCheck.totalPlannedCredits,
    hasEnoughTotalCredits: degreeCheck.hasEnoughTotalCredits,
    isLikelyComplete: degreeCheck.isLikelyComplete,
    advisorVerificationRequired: degreeCheck.advisorVerificationRequired,
    notes: [
      "This extracted plan does not prove final degree completion.",
      "Advisor verification is required.",
      ...degreeCheck.notes,
    ],
  });
}

import { validatePdfUpload } from "../../../../../lib/api/pdf-upload-validation.ts";
import { analyzeDegreeWorksText } from "../../../../../lib/plan/degreeworks-analysis.ts";
import { checkAiEngineeringCertificate } from "../../../../../lib/rules/ai-certificate.ts";

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
  const certificateCheck = checkAiEngineeringCertificate(
    degreeWorksAnalysis.parsedCourseCodes,
  );

  return Response.json({
    sourceFileName: upload.fileName,
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    parsedCourseCount: degreeWorksAnalysis.parsedCourseCount,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
    detectedSignals: degreeWorksAnalysis.detectedSignals,
    courseStatusRecords: degreeWorksAnalysis.courseStatusRecords,
    courseStatusCounts: degreeWorksAnalysis.courseStatusCounts,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    parserConfidence: degreeWorksAnalysis.confidence,
    requiredCoursesSatisfied: certificateCheck.requiredCoursesSatisfied,
    requiredCoursesMissing: certificateCheck.requiredCoursesMissing,
    electiveCandidatesFound: certificateCheck.electiveCandidatesFound,
    isLikelyComplete: certificateCheck.isLikelyComplete,
    advisorVerificationRequired: certificateCheck.advisorVerificationRequired,
    notes: certificateCheck.notes,
  });
}

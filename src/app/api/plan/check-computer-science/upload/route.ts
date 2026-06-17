import { extractPdfText, hasPdfHeader } from "../../../../../lib/pdf/pdf-text.ts";
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

  if (!isUploadedFile(uploadedFile) || uploadedFile.size === 0) {
    return Response.json(
      { error: 'Upload a PDF file using the "file" form field.' },
      { status: 400 },
    );
  }

  if (!isPdfUpload(uploadedFile)) {
    return Response.json(
      { error: "Uploaded file must be a PDF." },
      { status: 400 },
    );
  }

  const pdfData = new Uint8Array(await uploadedFile.arrayBuffer());

  if (!hasPdfHeader(pdfData)) {
    return Response.json(
      { error: "Uploaded file must be a valid PDF." },
      { status: 400 },
    );
  }

  const pdfText = await extractPdfText(pdfData);
  const degreeWorksAnalysis = analyzeDegreeWorksText(pdfText);
  const degreeCheck = checkComputerScienceDegree({
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
  });

  return Response.json({
    sourceFileName: uploadedFile.name,
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

function isUploadedFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File;
}

function isPdfUpload(file: File) {
  return (
    file.type.toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

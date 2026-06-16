import { extractPdfText, hasPdfHeader } from "../../../../../lib/pdf/pdf-text.ts";
import { analyzeDegreeWorksText } from "../../../../../lib/plan/degreeworks-analysis.ts";
import { extractDegreeWorksSemesters } from "../../../../../lib/plan/degreeworks-semesters.ts";
import { checkAiEngineeringCertificate } from "../../../../../lib/rules/ai-certificate.ts";
import { checkSoftwareEngineeringDegree } from "../../../../../lib/rules/software-engineering-degree.ts";
import { checkSoftwareEngineeringPrerequisites } from "../../../../../lib/rules/software-engineering-prerequisites.ts";

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
  const semesterPlanAnalysis = extractDegreeWorksSemesters(pdfText);
  const aiCertificateCheck =
    checkAiEngineeringCertificate(degreeWorksAnalysis.parsedCourseCodes);
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
  });
  const prerequisiteCheck = checkSoftwareEngineeringPrerequisites({
    semesterPlanAnalysis,
    courseCodes: degreeWorksAnalysis.parsedCourseCodes,
  });

  return Response.json({
    sourceFileName: uploadedFile.name,
    parsedCourseCount: degreeWorksAnalysis.parsedCourseCount,
    parsedCourseCodes: degreeWorksAnalysis.parsedCourseCodes,
    totalPlannedCredits: degreeWorksAnalysis.totalPlannedCredits,
    detectedSignals: degreeWorksAnalysis.detectedSignals,
    parserWarnings: degreeWorksAnalysis.parserWarnings,
    parserConfidence: degreeWorksAnalysis.confidence,
    semesterPlanAnalysis,
    prerequisiteCheck,
    aiCertificateCheck,
    softwareEngineeringCheck,
    notes: [
      "This combined Degree Works PDF analysis is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Extracted PDF text can omit substitutions, exceptions, transfer equivalencies, catalog changes, and advisor-approved electives.",
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

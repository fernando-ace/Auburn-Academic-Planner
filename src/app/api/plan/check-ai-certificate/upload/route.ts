import { parseCourseCodes } from "../../../../../lib/courses/course-code-parser.ts";
import { extractPdfText, hasPdfHeader } from "../../../../../lib/pdf/pdf-text.ts";
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
  const parsedCourseCodes = parseCourseCodes(pdfText);
  const certificateCheck = checkAiEngineeringCertificate(parsedCourseCodes);

  return Response.json({
    sourceFileName: uploadedFile.name,
    parsedCourseCodes,
    parsedCourseCount: parsedCourseCodes.length,
    requiredCoursesSatisfied: certificateCheck.requiredCoursesSatisfied,
    requiredCoursesMissing: certificateCheck.requiredCoursesMissing,
    electiveCandidatesFound: certificateCheck.electiveCandidatesFound,
    isLikelyComplete: certificateCheck.isLikelyComplete,
    advisorVerificationRequired: certificateCheck.advisorVerificationRequired,
    notes: certificateCheck.notes,
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

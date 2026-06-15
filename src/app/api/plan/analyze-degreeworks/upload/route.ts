import { parseCourseCodes } from "../../../../../lib/courses/course-code-parser.ts";
import { extractPdfText, hasPdfHeader } from "../../../../../lib/pdf/pdf-text.ts";
import { extractTotalPlannedCredits } from "../../../../../lib/plan/total-planned-credits.ts";
import { checkAiEngineeringCertificate } from "../../../../../lib/rules/ai-certificate.ts";
import { checkSoftwareEngineeringDegree } from "../../../../../lib/rules/software-engineering-degree.ts";

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
  const totalPlannedCredits = extractTotalPlannedCredits(pdfText);
  const aiCertificateCheck =
    checkAiEngineeringCertificate(parsedCourseCodes);
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes: parsedCourseCodes,
    totalPlannedCredits,
  });

  return Response.json({
    sourceFileName: uploadedFile.name,
    parsedCourseCount: parsedCourseCodes.length,
    parsedCourseCodes,
    totalPlannedCredits,
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

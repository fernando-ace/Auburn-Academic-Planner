import { extractPdfText, hasPdfHeader } from "../../../../../lib/pdf/pdf-text.ts";
import { analyzeCombinedDegreeWorksText } from "../../../../../lib/plan/combined-degreeworks-analysis.ts";
import {
  isPlanningTargetPathInput,
  type PlanningTargetPathInput,
} from "../../../../../lib/plan/target-path.ts";

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
  const targetPathValue = formData.get("targetPath") ?? "auto";

  if (!isPlanningTargetPathInput(targetPathValue)) {
    return Response.json(
      {
        error:
          "targetPath must be auto, software_engineering, computer_science, or ai_certificate.",
      },
      { status: 400 },
    );
  }

  const targetPath: PlanningTargetPathInput = targetPathValue;

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
  const combinedAnalysis = analyzeCombinedDegreeWorksText({
    text: pdfText,
    targetPath,
  });

  return Response.json({
    sourceFileName: uploadedFile.name,
    ...combinedAnalysis,
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

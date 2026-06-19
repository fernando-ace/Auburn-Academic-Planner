import { extractPdfText, hasPdfHeader } from "../pdf/pdf-text.ts";

export const MAX_PDF_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_EXTRACTED_PDF_TEXT_LENGTH = 1_000_000;

type PdfUploadFailure = {
  ok: false;
  error: string;
  status: 400 | 413 | 422;
};

type PdfUploadSuccess = {
  ok: true;
  fileName: string;
  text: string;
};

export type PdfUploadValidationResult = PdfUploadFailure | PdfUploadSuccess;

export type PdfUploadValidationOptions = {
  extractText?: (pdfData: Uint8Array) => Promise<string>;
  maxBytes?: number;
  maxTextLength?: number;
};

export async function validatePdfUpload(
  value: FormDataEntryValue | null,
  options: PdfUploadValidationOptions = {},
): Promise<PdfUploadValidationResult> {
  if (!(value instanceof File) || value.size === 0) {
    return failure(400, 'Upload a PDF file using the "file" form field.');
  }

  if (!isPdfUpload(value)) {
    return failure(400, "Uploaded file must be a PDF.");
  }

  const maxBytes = options.maxBytes ?? MAX_PDF_UPLOAD_BYTES;
  if (value.size > maxBytes) {
    return failure(413, "Uploaded PDF must be 10 MiB or smaller.");
  }

  let pdfData: Uint8Array;
  try {
    pdfData = new Uint8Array(await value.arrayBuffer());
  } catch {
    return failure(422, "Uploaded PDF could not be read. Try exporting the file again.");
  }

  if (!hasPdfHeader(pdfData)) {
    return failure(400, "Uploaded file must be a valid PDF.");
  }

  let text: string;
  try {
    text = await (options.extractText ?? extractPdfText)(pdfData);
  } catch {
    return failure(
      422,
      "Uploaded PDF could not be parsed. Try exporting a text-based PDF from Degree Works.",
    );
  }

  if (!text.trim()) {
    return failure(
      422,
      "Uploaded PDF did not contain readable text. Try exporting a text-based PDF from Degree Works.",
    );
  }

  const maxTextLength =
    options.maxTextLength ?? MAX_EXTRACTED_PDF_TEXT_LENGTH;
  if (text.length > maxTextLength) {
    return failure(
      422,
      "Uploaded PDF contains too much extracted text to process safely.",
    );
  }

  return { ok: true, fileName: value.name, text };
}

function failure(status: PdfUploadFailure["status"], error: string): PdfUploadFailure {
  return { ok: false, error, status };
}

function isPdfUpload(file: File) {
  return (
    file.type.toLowerCase() === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

import {
  MAX_PDF_MULTIPART_REQUEST_BYTES,
  validatePdfUpload,
} from "../../../../../lib/api/pdf-upload-validation.ts";
import { checkRateLimit } from "../../../../../lib/api/rate-limit.ts";
import {
  isDeclaredBodyTooLarge,
  privateJsonResponse,
  validateApiRequest,
} from "../../../../../lib/api/request-security.ts";
import { analyzeCombinedDegreeWorksText } from "../../../../../lib/plan/combined-degreeworks-analysis.ts";
import { parseCurrentProgressAnalysisInput } from "../../../../../lib/plan/current-progress-analysis-input.ts";
import { detectDegreeWorksDocumentType } from "../../../../../lib/plan/degreeworks-document-type.ts";
import { comparePlannedPathToCurrentProgress } from "../../../../../lib/plan/planned-path-coverage.ts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestValidation = validateApiRequest(request, "multipart");
  if (!requestValidation.ok) {
    return privateJsonResponse(
      { error: requestValidation.error },
      { status: requestValidation.status },
    );
  }

  if (isDeclaredBodyTooLarge(request, MAX_PDF_MULTIPART_REQUEST_BYTES)) {
    return privateJsonResponse(
      { error: "Upload request is too large to process safely." },
      { status: 413 },
    );
  }

  const rateLimit = await checkRateLimit(request, {
    namespace: "planned-path-pdf",
    limit: 8,
    windowSeconds: 10 * 60,
  });

  if (!rateLimit.ok) {
    return privateJsonResponse(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return privateJsonResponse(
      { error: "Request body must be multipart/form-data." },
      { status: 400 },
    );
  }

  const uploadedFile = formData.get("file");
  const currentProgressAnalysisValue = formData.get("currentProgressAnalysis");

  const upload = await validatePdfUpload(uploadedFile);
  if (!upload.ok) {
    return privateJsonResponse({ error: upload.error }, { status: upload.status });
  }

  const documentTypeDetection = detectDegreeWorksDocumentType(upload.text);

  if (documentTypeDetection.documentType === "worksheet_audit") {
    return privateJsonResponse(
      {
        error:
          "This PDF looks like a Current Progress Worksheet, not a Planned Path. Export Planned Path from Degree Works and upload that PDF here.",
        detectedDocumentType: documentTypeDetection.documentType,
      },
      { status: 422 },
    );
  }

  const combinedAnalysis = analyzeCombinedDegreeWorksText({
    text: upload.text,
  });
  const plannedPathConfidence =
    documentTypeDetection.documentType === "planned_path"
      ? combinedAnalysis.parserConfidence
      : "low";
  const parserWarnings =
    documentTypeDetection.documentType === "unknown"
      ? [
          ...combinedAnalysis.parserWarnings,
          "This PDF was not confidently detected as a Degree Works Planned Path, so comparison confidence is limited to low.",
        ]
      : combinedAnalysis.parserWarnings;
  const currentProgressInput = parseCurrentProgressAnalysisInput(
    currentProgressAnalysisValue,
  );
  if (currentProgressInput.status === "invalid") {
    return privateJsonResponse(
      { error: currentProgressInput.error },
      { status: 400 },
    );
  }

  const currentProgressAnalysis =
    currentProgressInput.status === "valid" ? currentProgressInput.value : null;
  const plannedPathCoverage = currentProgressAnalysis
    ? comparePlannedPathToCurrentProgress({
        currentAudit: currentProgressAnalysis,
        plannedCourseCodes: combinedAnalysis.parsedCourseCodes,
        plannedPathConfidence,
      })
    : null;

  return privateJsonResponse({
    sourceFileName: "Uploaded Degree Works PDF",
    documentType: "planned_path",
    selectedTargetPath: "degreeworks_native",
    ...combinedAnalysis,
    parserWarnings,
    parserConfidence: plannedPathConfidence,
    ...(plannedPathCoverage ? { plannedPathCoverage } : {}),
    notes: [
      "This combined Degree Works PDF analysis is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Extracted PDF text can omit substitutions, exceptions, transfer equivalencies, catalog changes, and advisor-approved electives.",
    ],
  });
}

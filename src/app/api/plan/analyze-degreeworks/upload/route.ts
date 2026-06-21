import { validatePdfUpload } from "../../../../../lib/api/pdf-upload-validation.ts";
import { analyzeCombinedDegreeWorksText } from "../../../../../lib/plan/combined-degreeworks-analysis.ts";
import type { CurrentDegreeAuditAnalysis } from "../../../../../lib/plan/current-degree-audit-analysis.ts";
import { comparePlannedPathToCurrentProgress } from "../../../../../lib/plan/planned-path-coverage.ts";
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
  const currentProgressAnalysisValue = formData.get("currentProgressAnalysis");

  if (!isPlanningTargetPathInput(targetPathValue)) {
    return Response.json(
      {
        error:
          "targetPath must be auto, software_engineering, computer_science, ai_certificate, or degreeworks_only.",
      },
      { status: 400 },
    );
  }

  const targetPath: PlanningTargetPathInput = targetPathValue;

  const upload = await validatePdfUpload(uploadedFile);
  if (!upload.ok) {
    return Response.json({ error: upload.error }, { status: upload.status });
  }

  const combinedAnalysis = analyzeCombinedDegreeWorksText({
    text: upload.text,
    targetPath,
  });
  const currentProgressAnalysis = parseCurrentProgressAnalysis(
    currentProgressAnalysisValue,
  );
  const plannedPathCoverage = currentProgressAnalysis
    ? comparePlannedPathToCurrentProgress({
        currentAudit: currentProgressAnalysis,
        plannedCourseCodes: combinedAnalysis.parsedCourseCodes,
      })
    : null;

  return Response.json({
    sourceFileName: upload.fileName,
    documentType: "planned_path",
    ...combinedAnalysis,
    ...(plannedPathCoverage ? { plannedPathCoverage } : {}),
    notes: [
      "This combined Degree Works PDF analysis is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Extracted PDF text can omit substitutions, exceptions, transfer equivalencies, catalog changes, and advisor-approved electives.",
    ],
  });
}

function parseCurrentProgressAnalysis(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<CurrentDegreeAuditAnalysis>;
    if (
      parsed.documentType !== "worksheet_audit" ||
      !Array.isArray(parsed.stillNeededItems) ||
      !Array.isArray(parsed.completedCourseCodes) ||
      !Array.isArray(parsed.preregisteredCourseCodes)
    ) {
      return null;
    }

    return parsed as CurrentDegreeAuditAnalysis;
  } catch {
    return null;
  }
}

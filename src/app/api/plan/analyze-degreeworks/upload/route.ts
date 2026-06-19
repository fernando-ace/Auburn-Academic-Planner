import { validatePdfUpload } from "../../../../../lib/api/pdf-upload-validation.ts";
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

  const upload = await validatePdfUpload(uploadedFile);
  if (!upload.ok) {
    return Response.json({ error: upload.error }, { status: upload.status });
  }

  const combinedAnalysis = analyzeCombinedDegreeWorksText({
    text: upload.text,
    targetPath,
  });

  return Response.json({
    sourceFileName: upload.fileName,
    documentType: "planned_path",
    ...combinedAnalysis,
    notes: [
      "This combined Degree Works PDF analysis is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Extracted PDF text can omit substitutions, exceptions, transfer equivalencies, catalog changes, and advisor-approved electives.",
    ],
  });
}

import { validatePdfUpload } from "../../../../../lib/api/pdf-upload-validation.ts";
import {
  analyzeCurrentDegreeAuditText,
  emptyCurrentDegreeAuditAnalysis,
} from "../../../../../lib/plan/current-degree-audit-analysis.ts";
import { detectDegreeWorksDocumentType } from "../../../../../lib/plan/degreeworks-document-type.ts";
import {
  buildCurrentProgressAdvisorSummary,
  buildCurrentStateGapReport,
  buildCurrentStateNextSteps,
} from "../../../../../lib/plan/current-state-next-steps.ts";
import {
  isPlanningTargetPathInput,
  type PlanningTargetPathInput,
} from "../../../../../lib/plan/target-path.ts";
import { checkAiEngineeringCertificate } from "../../../../../lib/rules/ai-certificate.ts";
import { checkComputerScienceDegree } from "../../../../../lib/rules/computer-science-degree.ts";
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

  const documentTypeDetection = detectDegreeWorksDocumentType(upload.text);

  if (documentTypeDetection.documentType !== "worksheet_audit") {
    const currentProgressAnalysis = emptyCurrentDegreeAuditAnalysis(
      documentTypeDetection.documentType,
    );

    return Response.json({
      sourceFileName: upload.fileName,
      selectedTargetPath: targetPath,
      documentType: documentTypeDetection.documentType,
      documentTypeDetection,
      currentProgressAnalysis,
      currentStateGapReport: {
        overallStatus: "insufficient_data",
        summaryBullets: [
          "The uploaded PDF was not confidently detected as a Degree Works Worksheet audit.",
          "Use Current Progress for Worksheet/Audit PDFs and Planned Path for Degree Works plan PDFs.",
        ],
        incompleteBlocks: [],
        stillNeededCourseCodes: [],
        advisorReviewItems: currentProgressAnalysis.parserWarnings,
        nextActions: [
          "Re-export the Degree Works Worksheet audit PDF and upload it under Current Progress.",
          "Use Planned Path if this file is a Degree Works Plan PDF.",
        ],
        advisorQuestions: [
          "Can you confirm which Degree Works document I should use for current standing?",
        ],
      },
      currentStateNextSteps: {
        targetPath: "mixed_or_unclear",
        confidence: "low",
        suggestedCourses: [],
        verificationItems: [],
        notYetRecommended: [],
        advisorQuestions: [],
        notes: [
          "No current-progress suggestions were produced because the PDF was not detected as a worksheet audit.",
        ],
      },
      advisorMeetingSummary:
        "Advisor Meeting Summary\n\nThe uploaded PDF was not confidently detected as a Degree Works Worksheet audit. Re-export the Worksheet audit PDF for Current Progress, or use Planned Path for a Degree Works Plan PDF.",
      parserDiagnostics: {
        parserWarnings: currentProgressAnalysis.parserWarnings,
        parserConfidence: "low",
      },
      notes: [
        "This current-progress check is not an official degree audit.",
        "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
        "The PDF is processed server-side for this check and is not permanently stored.",
      ],
    });
  }

  const currentProgressAnalysis = analyzeCurrentDegreeAuditText(upload.text);
  const currentCourseCodes = currentProgressAnalysis.currentApplicableCourseCodes;
  const aiCertificateCheck = checkAiEngineeringCertificate(currentCourseCodes);
  const softwareEngineeringCheck = checkSoftwareEngineeringDegree({
    courseCodes: currentCourseCodes,
    totalPlannedCredits: currentProgressAnalysis.creditsApplied ?? null,
  });
  const computerScienceCheck = checkComputerScienceDegree({
    courseCodes: currentCourseCodes,
    totalPlannedCredits: currentProgressAnalysis.creditsApplied ?? null,
  });
  const currentStateGapReport = buildCurrentStateGapReport({
    audit: currentProgressAnalysis,
  });
  const currentStateNextSteps = buildCurrentStateNextSteps({
    audit: currentProgressAnalysis,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    targetPath,
  });
  const advisorMeetingSummary = buildCurrentProgressAdvisorSummary({
    audit: currentProgressAnalysis,
    gapReport: currentStateGapReport,
    nextSteps: currentStateNextSteps,
  });

  return Response.json({
    sourceFileName: upload.fileName,
    selectedTargetPath: targetPath,
    documentType: "worksheet_audit",
    documentTypeDetection,
    currentProgressAnalysis,
    currentStateGapReport,
    currentStateNextSteps,
    aiCertificateCheck,
    softwareEngineeringCheck,
    computerScienceCheck,
    advisorMeetingSummary,
    parserDiagnostics: {
      parserWarnings: currentProgressAnalysis.parserWarnings,
      parserConfidence: currentProgressAnalysis.confidence,
    },
    notes: [
      "This current-progress check is not an official degree audit.",
      "Advisor verification is required before making registration, graduation, certificate, or degree-completion decisions.",
      "Completed and preregistered courses are kept status-aware so they are not suggested again as new courses.",
      "The PDF is processed server-side for this check and is not permanently stored.",
    ],
  });
}

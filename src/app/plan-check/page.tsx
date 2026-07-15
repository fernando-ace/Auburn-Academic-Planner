"use client";

import {
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useMemo, useState } from "react";

import { StakeholderMoreMenu } from "@/components/stakeholder-more-menu";
import { EmptyState } from "@/components/ui-primitives";
import { getPdfUploadSizeError } from "@/lib/api/pdf-upload-policy";
import type { GeneratedPathPreferences } from "@/lib/plan/generated-planned-path";
import { AdvisorMeetingSummary } from "./components/advisor-meeting-summary";
import {
  CombinedDegreeWorksParsedDetails,
  PlannedPathCoverageCard,
  PlannedPathOverviewCard,
  PlannedPathSemesterPlanCard,
  PlannedPathFixListCard,
} from "./components/combined-analysis-details";
import { CurrentProgressResultDetails } from "./components/current-progress-details";
import {
  DegreeWorksWorkflowUploadSection,
  type PlannedPathInputMode,
  type PlanCheckStep,
} from "./components/plan-check-input-sections";
import type {
  CombinedDegreeWorksUploadResult,
  CurrentDegreeWorksUploadResult,
} from "./types";

const combinedDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks/upload";
const currentDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks-current/upload";
const generatedPlannedPathEndpoint = "/api/plan/generate-path";
const manualPlannedPathEndpoint =
  "/api/plan/analyze-degreeworks/manual";

export default function PlanCheckPage() {
  const [selectedCombinedDegreeWorksPdfFile, setSelectedCombinedDegreeWorksPdfFile] =
    useState<File | null>(null);
  const [activeStep, setActiveStep] =
    useState<PlanCheckStep>("current_progress");
  const [plannedPathInputMode, setPlannedPathInputMode] =
    useState<PlannedPathInputMode>("pdf");
  const [manualPlannedCoursesText, setManualPlannedCoursesText] =
    useState("");
  const [generatedPathPreferences, setGeneratedPathPreferences] =
    useState<GeneratedPathPreferences>({
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 15,
      includeSummer: false,
      maxSummerCredits: 6,
    });
  const [combinedDegreeWorksResult, setCombinedDegreeWorksResult] =
    useState<CombinedDegreeWorksUploadResult | null>(null);
  const [currentDegreeWorksResult, setCurrentDegreeWorksResult] =
    useState<CurrentDegreeWorksUploadResult | null>(null);
  const [combinedDegreeWorksError, setCombinedDegreeWorksError] = useState<
    string | null
  >(null);
  const [
    combinedDegreeWorksUploadValidationError,
    setCombinedDegreeWorksUploadValidationError,
  ] = useState<string | null>(null);
  const [advisorSummaryCopyStatus, setAdvisorSummaryCopyStatus] = useState<
    string | null
  >(null);
  const [isCombinedDegreeWorksLoading, setIsCombinedDegreeWorksLoading] =
    useState(false);

  const advisorMeetingSummary = useMemo(
    () =>
      (combinedDegreeWorksResult
        ? buildPlannedPathAdvisorSummary(combinedDegreeWorksResult)
        : currentDegreeWorksResult?.advisorMeetingSummary ?? ""),
    [combinedDegreeWorksResult, currentDegreeWorksResult?.advisorMeetingSummary],
  );

  async function runCombinedDegreeWorksUploadPlanCheck(
    file: File,
    currentProgressAnalysis?: CurrentDegreeWorksUploadResult["currentProgressAnalysis"],
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);

    const formData = new FormData();
    formData.append("file", file);
    if (currentProgressAnalysis) {
      formData.append(
        "currentProgressAnalysis",
        JSON.stringify(currentProgressAnalysis),
      );
    }

    try {
      const response = await fetch(combinedDegreeWorksUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | CombinedDegreeWorksUploadResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The combined Degree Works PDF analysis could not run.",
        );
      }

      const combinedPayload = payload as CombinedDegreeWorksUploadResult;
      setCombinedDegreeWorksResult(combinedPayload);
    } catch (fetchError) {
      setCombinedDegreeWorksResult(null);
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The combined Degree Works PDF analysis could not run.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  async function runManualPlannedPathCheck(
    plannedCoursesText: string,
    currentProgressAnalysis?: CurrentDegreeWorksUploadResult["currentProgressAnalysis"],
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);

    try {
      const response = await fetch(manualPlannedPathEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plannedCoursesText,
          ...(currentProgressAnalysis ? { currentProgressAnalysis } : {}),
        }),
      });
      const payload = (await response.json()) as
        | CombinedDegreeWorksUploadResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The manual planned-path analysis could not run.",
        );
      }

      setCombinedDegreeWorksResult(payload as CombinedDegreeWorksUploadResult);
    } catch (fetchError) {
      setCombinedDegreeWorksResult(null);
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The manual planned-path analysis could not run.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  async function runCurrentDegreeWorksUploadPlanCheck(
    file: File,
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "generatedPathPreferences",
      JSON.stringify(generatedPathPreferences),
    );

    try {
      const response = await fetch(currentDegreeWorksUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | CurrentDegreeWorksUploadResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The current-progress Degree Works analysis could not run.",
        );
      }

      setCurrentDegreeWorksResult(payload as CurrentDegreeWorksUploadResult);
    } catch (fetchError) {
      setCurrentDegreeWorksResult(null);
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The current-progress Degree Works analysis could not run.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  async function regenerateGeneratedPlannedPath() {
    if (isCombinedDegreeWorksLoading || !currentDegreeWorksResult) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);

    try {
      const response = await fetch(generatedPlannedPathEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentProgressAnalysis:
            currentDegreeWorksResult.currentProgressAnalysis,
          preferences: generatedPathPreferences,
        }),
      });
      const payload = (await response.json()) as
        | {
            generatedPlannedPath: CurrentDegreeWorksUploadResult["generatedPlannedPath"];
            advisorMeetingSummary: string;
          }
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The generated planned path could not be updated.",
        );
      }

      if ("generatedPlannedPath" in payload) {
        setCurrentDegreeWorksResult((currentResult) =>
          currentResult
            ? {
                ...currentResult,
                generatedPlannedPath: payload.generatedPlannedPath,
                advisorMeetingSummary: payload.advisorMeetingSummary,
                degreeWorksNativeAnalysis: {
                  ...currentResult.degreeWorksNativeAnalysis,
                  generatedPlannedPath: payload.generatedPlannedPath,
                  advisorMeetingSummary: payload.advisorMeetingSummary,
                },
              }
            : currentResult,
        );
      }
    } catch (fetchError) {
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The generated planned path could not be updated.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  function handleCombinedDegreeWorksPdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedCombinedDegreeWorksPdfFile(file);
    setCombinedDegreeWorksUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedCombinedDegreeWorksPdfFile(null);
      setCombinedDegreeWorksUploadValidationError(
        "Choose a PDF file before running the combined Degree Works analysis.",
      );
      event.target.value = "";
      return;
    }

    const uploadSizeError = getPdfUploadSizeError(file.size);
    if (uploadSizeError) {
      setSelectedCombinedDegreeWorksPdfFile(null);
      setCombinedDegreeWorksUploadValidationError(uploadSizeError);
      event.target.value = "";
    }
  }

  function checkCombinedDegreeWorksUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setCombinedDegreeWorksUploadValidationError(null);

    if (
      activeStep === "planned_path" &&
      plannedPathInputMode === "manual"
    ) {
      const trimmed = manualPlannedCoursesText.trim();

      if (!trimmed) {
        setCombinedDegreeWorksResult(null);
        setCombinedDegreeWorksUploadValidationError(
          "Paste planned Auburn courses before checking Planned Path.",
        );
        return;
      }

      void runManualPlannedPathCheck(
        trimmed,
        currentDegreeWorksResult?.currentProgressAnalysis,
      );
      return;
    }

    if (!selectedCombinedDegreeWorksPdfFile) {
      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(
        activeStep === "current_progress"
          ? "Choose a Degree Works Worksheet/Audit PDF before checking Current Progress."
          : "Choose a Degree Works Plan PDF before checking Planned Path.",
      );
      return;
    }

    if (!isPdfFile(selectedCombinedDegreeWorksPdfFile)) {
      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(
        "Choose a PDF file before running the Degree Works workflow.",
      );
      return;
    }

    const uploadSizeError = getPdfUploadSizeError(
      selectedCombinedDegreeWorksPdfFile.size,
    );
    if (uploadSizeError) {
      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(uploadSizeError);
      return;
    }

    if (activeStep === "current_progress") {
      void runCurrentDegreeWorksUploadPlanCheck(
        selectedCombinedDegreeWorksPdfFile,
      );
    } else {
      void runCombinedDegreeWorksUploadPlanCheck(
        selectedCombinedDegreeWorksPdfFile,
        currentDegreeWorksResult?.currentProgressAnalysis,
      );
    }
  }

  function clearDegreeWorksAnalysis() {
    setSelectedCombinedDegreeWorksPdfFile(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setCombinedDegreeWorksUploadValidationError(null);
    setAdvisorSummaryCopyStatus(null);
    setManualPlannedCoursesText("");
    setPlannedPathInputMode("pdf");
    setGeneratedPathPreferences({
      startTerm: "Fall 2026",
      maxCreditsPerTerm: 15,
      includeSummer: false,
      maxSummerCredits: 6,
    });
    setActiveStep("current_progress");
  }

  function changeActiveStep(step: PlanCheckStep) {
    if (step === "advisor_summary" && !advisorSummaryAvailable) {
      return;
    }

    if (step !== activeStep && step !== "advisor_summary") {
      setSelectedCombinedDegreeWorksPdfFile(null);
    }

    setActiveStep(step);
    setCombinedDegreeWorksUploadValidationError(null);
  }

  function copyAdvisorMeetingSummary() {
    if (!advisorMeetingSummary) {
      return;
    }

    const selectVisibleSummary = () => {
      const textarea = document.getElementById(
        "advisor-meeting-summary-text",
      );

      if (textarea instanceof HTMLTextAreaElement) {
        textarea.focus();
        textarea.select();
      }
    };

    const copyWithFallback = () => {
      const textarea = document.createElement("textarea");
      textarea.value = advisorMeetingSummary;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();

      try {
        return document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    };

    if (!navigator.clipboard?.writeText) {
      if (copyWithFallback()) {
        setAdvisorSummaryCopyStatus("Summary copied.");
      } else {
        selectVisibleSummary();
        setAdvisorSummaryCopyStatus(
          "Summary selected. Press Ctrl+C to copy it.",
        );
      }
      return;
    }

    void navigator.clipboard
      .writeText(advisorMeetingSummary)
      .then(() => setAdvisorSummaryCopyStatus("Summary copied."))
      .catch(() => {
        if (copyWithFallback()) {
          setAdvisorSummaryCopyStatus("Summary copied.");
        } else {
          selectVisibleSummary();
          setAdvisorSummaryCopyStatus(
            "Summary selected. Press Ctrl+C to copy it.",
          );
        }
      });
  }

  function isPdfFile(file: File) {
    return (
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
  }

  const hasResultOrStatus = Boolean(
    combinedDegreeWorksResult ||
      currentDegreeWorksResult ||
      combinedDegreeWorksError ||
      isCombinedDegreeWorksLoading,
  );
  const currentProgressFileSummary = currentDegreeWorksResult
    ? {
        workflowType: "Current Progress",
        fileName: currentDegreeWorksResult.sourceFileName,
        detectedProgram:
          currentDegreeWorksResult.currentProgressAnalysis.detectedProgram.displayName,
        creditsSummary: formatCurrentProgressCredits(
          currentDegreeWorksResult.currentProgressAnalysis.creditsApplied,
          currentDegreeWorksResult.currentProgressAnalysis.creditsRequired,
          currentDegreeWorksResult.currentProgressAnalysis.creditsNeeded,
        ),
      }
    : undefined;
  const plannedPathFileSummary = combinedDegreeWorksResult
    ? {
          workflowType: "Planned Path",
          fileName: combinedDegreeWorksResult.sourceFileName,
          detectedProgram: currentDegreeWorksResult
            ? currentDegreeWorksResult.currentProgressAnalysis.detectedProgram.displayName
            : formatSelectedPlanningTarget(),
          creditsSummary:
            typeof combinedDegreeWorksResult.totalPlannedCredits === "number"
              ? `${combinedDegreeWorksResult.totalPlannedCredits} planned credits`
              : null,
        }
      : undefined;
  const analyzedFileSummary =
    activeStep === "current_progress"
      ? currentProgressFileSummary
      : plannedPathFileSummary ?? currentProgressFileSummary;
  const hasPlannedPathComparison = Boolean(
    combinedDegreeWorksResult?.plannedPathCoverage,
  );
  const advisorSummaryAvailable = Boolean(
    advisorMeetingSummary &&
      (currentDegreeWorksResult?.generatedPlannedPath ||
        hasPlannedPathComparison),
  );

  return (
    <main className="min-h-dvh bg-slate-100 text-slate-950">
      <header className="bg-[#03244d] px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
              <ClipboardCheck aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold leading-6 sm:text-[20px]">
                Auburn Academic Planner
              </h1>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Planning Hub: Current Progress and Planned Path
              </p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Planning Hub navigation">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
              href="/chat"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Chat
            </Link>
            <StakeholderMoreMenu />
          </nav>
        </div>
      </header>

      <DegreeWorksWorkflowUploadSection
        activeStep={activeStep}
        analyzedFileSummary={analyzedFileSummary}
        advisorSummaryAvailable={advisorSummaryAvailable}
        generatedPathPreferences={generatedPathPreferences}
        isLoading={isCombinedDegreeWorksLoading}
        onAnalyze={checkCombinedDegreeWorksUploadedPdf}
        onClearAnalysis={clearDegreeWorksAnalysis}
        onFileChange={handleCombinedDegreeWorksPdfFileChange}
        onGeneratedPathPreferencesChange={setGeneratedPathPreferences}
        onManualPlannedCoursesChange={(event) => {
          setManualPlannedCoursesText(event.currentTarget.value);
          setCombinedDegreeWorksUploadValidationError(null);
        }}
        onPlannedPathInputModeChange={(mode) => {
          setPlannedPathInputMode(mode);
          setCombinedDegreeWorksUploadValidationError(null);
        }}
        onRegenerateGeneratedPath={() => {
          void regenerateGeneratedPlannedPath();
        }}
        onStepChange={changeActiveStep}
        plannedPathInputMode={plannedPathInputMode}
        manualPlannedCoursesText={manualPlannedCoursesText}
        selectedFile={selectedCombinedDegreeWorksPdfFile}
        validationError={combinedDegreeWorksUploadValidationError}
        hasCurrentProgressResult={Boolean(currentDegreeWorksResult)}
        hasPlannedPathComparison={hasPlannedPathComparison}
        hasPlannedPathResult={Boolean(combinedDegreeWorksResult)}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <section className={`min-w-0 ${hasResultOrStatus ? "order-first" : "order-last"}`}>
          {advisorMeetingSummary && !combinedDegreeWorksResult && !currentDegreeWorksResult ? (
            <AdvisorMeetingSummary
              copyStatus={advisorSummaryCopyStatus}
              onCopySummary={copyAdvisorMeetingSummary}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {combinedDegreeWorksError ? (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-orange-700"
                  size={18}
                />
                <p className="text-[14px] leading-6 text-orange-800">
                  {combinedDegreeWorksError}
                </p>
              </div>
            </div>
          ) : null}

          {isCombinedDegreeWorksLoading ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#dd550c]"
                size={19}
              />
              Analyzing planning input...
            </div>
          ) : null}

          {currentDegreeWorksResult && !combinedDegreeWorksResult && activeStep === "current_progress" ? (
            <CurrentProgressResultDetails
              advisorSummarySlot={
                advisorMeetingSummary ? (
                <AdvisorMeetingSummary
                  copyStatus={advisorSummaryCopyStatus}
                  onCopySummary={copyAdvisorMeetingSummary}
                  summary={advisorMeetingSummary}
                  title="Current Progress Notes"
                />
                ) : null
              }
              result={currentDegreeWorksResult}
            />
          ) : null}

          {combinedDegreeWorksResult && activeStep === "planned_path" ? (
            <>
              <PlannedPathOverviewCard result={combinedDegreeWorksResult} />
              <PlannedPathCoverageCard result={combinedDegreeWorksResult} />
              <PlannedPathSemesterPlanCard result={combinedDegreeWorksResult} />
              <PlannedPathFixListCard result={combinedDegreeWorksResult} />
              <CombinedDegreeWorksParsedDetails
                result={combinedDegreeWorksResult}
              />
            </>
          ) : null}

          {combinedDegreeWorksResult && activeStep === "advisor_summary" && advisorMeetingSummary ? (
            <AdvisorMeetingSummary
              copyStatus={advisorSummaryCopyStatus}
              onCopySummary={copyAdvisorMeetingSummary}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {!combinedDegreeWorksResult && currentDegreeWorksResult && activeStep === "advisor_summary" && advisorMeetingSummary ? (
            <AdvisorMeetingSummary
              copyStatus={advisorSummaryCopyStatus}
              onCopySummary={copyAdvisorMeetingSummary}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {combinedDegreeWorksResult || currentDegreeWorksResult ? null : (
            <EmptyState>
              Upload a Degree Works Worksheet audit for Current Progress. Upload
              a Degree Works Plan PDF for Planned Path. Works from Degree
              Works-native requirements for any Auburn program with readable
              PDF text.
            </EmptyState>
          )}
        </section>
      </div>
    </main>
  );
}

function formatCurrentProgressCredits(
  applied?: number | null,
  required?: number | null,
  remaining?: number | null,
) {
  const appliedText = typeof applied === "number" ? applied : "unknown";
  const requiredText = typeof required === "number" ? required : "unknown";
  const remainingText = typeof remaining === "number" ? remaining : "unknown";

  return `${appliedText} applied / ${requiredText} required / ${remainingText} remaining`;
}

function formatSelectedPlanningTarget() {
  return "Degree Works-native";
}

function buildPlannedPathAdvisorSummary(result: CombinedDegreeWorksUploadResult) {
  const coverage = result.plannedPathCoverage;
  const mainResult = coverage
    ? `${coverage.coveredStillNeededItems.length} requirements appear covered, ${coverage.partiallyCoveredStillNeededItems.length + coverage.advisorReviewStillNeededItems.length} need review, ${coverage.uncoveredStillNeededItems.length} are not clearly covered.`
    : "Upload Current Progress too to compare this plan against your actual remaining Degree Works requirements.";
  const lines = [
    "Advisor Meeting Summary",
    "",
    "This is a preparation summary, not an official degree audit.",
    "",
    "Planned path review:",
    `- Current audit: ${coverage ? "uploaded" : "not uploaded"}`,
    `- Planned path: ${result.sourceFileName === "Manual planned courses" ? "manual planned courses" : "uploaded Degree Works PDF"}`,
    `- Main result: ${mainResult}`,
  ];

  lines.push(
    "",
    "Items to discuss:",
    "1. Confirm whether the uncovered Degree Works requirements are addressed.",
    "2. Review option-list and elective requirements.",
    "3. Confirm semester loads and course availability.",
    "4. Verify AP, transfer, Fall Through, or substitution effects.",
    "",
    "Questions for my advisor:",
    "- Does this planned path cover my remaining Degree Works requirements?",
    "- Which uncovered items should I add to the plan?",
    "- Are the semester loads reasonable?",
    "- Which planned courses count toward electives or option lists?",
    "- Do any AP/transfer credits change this plan?",
  );

  return lines.join("\n");
}

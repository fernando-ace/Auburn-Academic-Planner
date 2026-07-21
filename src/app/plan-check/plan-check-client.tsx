"use client";

import {
  ArrowLeft,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useEffect, useMemo, useState } from "react";

import { StakeholderMoreMenu } from "@/components/stakeholder-more-menu";
import { IndependentPilotNotice } from "@/components/independent-pilot-notice";
import { EmptyState } from "@/components/ui-primitives";
import { getPdfUploadSizeError } from "@/lib/api/pdf-upload-policy";
import type { GeneratedPathPreferences } from "@/lib/plan/generated-planned-path";
import {
  createPlanningHubDeviceDraft,
  formatPlanningHubDraftTruncation,
  formatPlanningHubManualDraft,
  PLANNING_HUB_DRAFT_STORAGE_KEY,
  readPlanningHubDeviceDraft,
  type PlanningHubDeviceDraft,
} from "@/lib/plan/planning-hub-device-draft";
import { AdvisorMeetingSummary } from "./components/advisor-meeting-summary";
import {
  CombinedDegreeWorksParsedDetails,
  PlannedPathCoverageCard,
  PlannedPathOverviewCard,
  PlannedPathSemesterPlanCard,
  PlannedPathFixListCard,
} from "./components/combined-analysis-details";
import { CurrentProgressResultDetails } from "./components/current-progress-details";
import { PlanningHubDraftControls } from "./components/planning-hub-draft-controls";
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

export function PlanCheckClient({
  generatedPathStartTermOptions,
  initialGeneratedPathPreferences,
}: {
  generatedPathStartTermOptions: string[];
  initialGeneratedPathPreferences: GeneratedPathPreferences;
}) {
  const [selectedCombinedDegreeWorksPdfFile, setSelectedCombinedDegreeWorksPdfFile] =
    useState<File | null>(null);
  const [activeStep, setActiveStep] =
    useState<PlanCheckStep>("current_progress");
  const [plannedPathInputMode, setPlannedPathInputMode] =
    useState<PlannedPathInputMode>("pdf");
  const [manualPlannedCoursesText, setManualPlannedCoursesText] =
    useState("");
  const [generatedPathPreferences, setGeneratedPathPreferences] =
    useState<GeneratedPathPreferences>(() => ({
      ...initialGeneratedPathPreferences,
    }));
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
  const [advisorSummaryActionStatus, setAdvisorSummaryActionStatus] = useState<
    string | null
  >(null);
  const [savedDeviceDraft, setSavedDeviceDraft] =
    useState<PlanningHubDeviceDraft | null>(null);
  const [deviceDraftStatus, setDeviceDraftStatus] = useState<string | null>(null);
  const [isCombinedDegreeWorksLoading, setIsCombinedDegreeWorksLoading] =
    useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const readResult = readPlanningHubDeviceDraft(
          window.localStorage.getItem(PLANNING_HUB_DRAFT_STORAGE_KEY),
        );

        if (readResult.status === "valid") {
          setSavedDeviceDraft(readResult.draft);
          return;
        }

        if (readResult.status === "expired" || readResult.status === "invalid") {
          window.localStorage.removeItem(PLANNING_HUB_DRAFT_STORAGE_KEY);
          setDeviceDraftStatus(
            readResult.status === "expired"
              ? "An expired device draft was deleted."
              : "An unreadable device draft was deleted.",
          );
        }
      } catch {
        setDeviceDraftStatus("Device draft storage is unavailable in this browser.");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!combinedDegreeWorksError) {
      return;
    }

    const errorElement = document.getElementById("planning-workflow-error");
    errorElement?.focus({ preventScroll: true });
    errorElement?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  }, [combinedDegreeWorksError]);

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
      setCombinedDegreeWorksResult(null);
    } catch (fetchError) {
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
      setCombinedDegreeWorksUploadValidationError(
        activeStep === "current_progress"
          ? "Choose a Degree Works Worksheet/Audit PDF before checking Current Progress."
          : "Choose a Degree Works Plan PDF before checking Planned Path.",
      );
      return;
    }

    if (!isPdfFile(selectedCombinedDegreeWorksPdfFile)) {
      setCombinedDegreeWorksUploadValidationError(
        "Choose a PDF file before running the Degree Works workflow.",
      );
      return;
    }

    const uploadSizeError = getPdfUploadSizeError(
      selectedCombinedDegreeWorksPdfFile.size,
    );
    if (uploadSizeError) {
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
    setAdvisorSummaryActionStatus(null);
    setManualPlannedCoursesText("");
    setPlannedPathInputMode("pdf");
    setGeneratedPathPreferences({ ...initialGeneratedPathPreferences });
    setActiveStep("current_progress");
  }

  function revisePlannedPath() {
    setSelectedCombinedDegreeWorksPdfFile(null);
    setCombinedDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setCombinedDegreeWorksUploadValidationError(null);
    setAdvisorSummaryActionStatus(null);
    setActiveStep("planned_path");
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
        setAdvisorSummaryActionStatus("Summary copied.");
      } else {
        selectVisibleSummary();
        setAdvisorSummaryActionStatus(
          "Summary selected. Press Ctrl+C to copy it.",
        );
      }
      return;
    }

    void navigator.clipboard
      .writeText(advisorMeetingSummary)
      .then(() => setAdvisorSummaryActionStatus("Summary copied."))
      .catch(() => {
        if (copyWithFallback()) {
          setAdvisorSummaryActionStatus("Summary copied.");
        } else {
          selectVisibleSummary();
          setAdvisorSummaryActionStatus(
            "Summary selected. Press Ctrl+C to copy it.",
          );
        }
      });
  }

  function downloadAdvisorMeetingSummary() {
    if (!advisorMeetingSummary) {
      return;
    }

    const blob = new Blob([advisorMeetingSummary], {
      type: "text/plain;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `auburn-advisor-notes-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
    setAdvisorSummaryActionStatus("Advisor notes downloaded.");
  }

  function saveDeviceDraft() {
    try {
      const draft = createPlanningHubDeviceDraft({
        activeStep,
        generatedPathPreferences,
        manualPlannedCoursesText,
        plannedPathInputMode,
      });
      window.localStorage.setItem(
        PLANNING_HUB_DRAFT_STORAGE_KEY,
        JSON.stringify(draft),
      );
      setSavedDeviceDraft(draft);
      const truncationMessage = formatPlanningHubDraftTruncation(
        draft.truncation,
      );
      setDeviceDraftStatus(
        truncationMessage
          ? `Draft saved with limits: ${truncationMessage}. Shorten the manual plan and save again to keep every recognized item.`
          : draft.manualPlan
          ? "Manual plan draft saved on this device. Only recognized course codes, term labels, planned credit totals, and planning settings were included."
          : plannedPathInputMode === "manual" && manualPlannedCoursesText.trim()
            ? "Path settings saved only. No recognized Auburn course codes were found, so pasted text was not included."
            : "Path settings saved only. Current Progress analysis and results were not included.",
      );
    } catch {
      setDeviceDraftStatus("The draft could not be saved in this browser.");
    }
  }

  function restoreDeviceDraft() {
    if (!savedDeviceDraft) {
      return;
    }

    let restoredDraft: PlanningHubDeviceDraft;
    try {
      const readResult = readPlanningHubDeviceDraft(
        window.localStorage.getItem(PLANNING_HUB_DRAFT_STORAGE_KEY),
      );
      if (readResult.status !== "valid") {
        if (readResult.status === "expired" || readResult.status === "invalid") {
          window.localStorage.removeItem(PLANNING_HUB_DRAFT_STORAGE_KEY);
        }
        setSavedDeviceDraft(null);
        setDeviceDraftStatus(
          readResult.status === "expired"
            ? "The saved device draft expired and was deleted."
            : readResult.status === "invalid"
              ? "The saved device draft was unreadable and was deleted."
              : "The saved device draft is no longer available.",
        );
        return;
      }
      restoredDraft = readResult.draft;
    } catch {
      setDeviceDraftStatus("Device draft storage is unavailable in this browser.");
      return;
    }

    setSelectedCombinedDegreeWorksPdfFile(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setCombinedDegreeWorksUploadValidationError(null);
    setAdvisorSummaryActionStatus(null);
    setSavedDeviceDraft(restoredDraft);
    setActiveStep(restoredDraft.resumeAt);
    setPlannedPathInputMode(restoredDraft.plannedPathInputMode);
    setGeneratedPathPreferences(restoredDraft.generatedPathPreferences);
    setManualPlannedCoursesText(
      formatPlanningHubManualDraft(restoredDraft.manualPlan),
    );
    setDeviceDraftStatus(
      restoredDraft.manualPlan
        ? "Manual plan draft restored. Re-upload Current Progress to rebuild a requirements comparison."
        : "Path settings restored. Re-upload Current Progress to rebuild an analysis.",
    );
  }

  function deleteDeviceDraft() {
    try {
      window.localStorage.removeItem(PLANNING_HUB_DRAFT_STORAGE_KEY);
      setSavedDeviceDraft(null);
      setDeviceDraftStatus("Saved draft deleted from this browser.");
    } catch {
      setDeviceDraftStatus("The saved draft could not be deleted in this browser.");
    }
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
    <main
      className="min-h-dvh bg-slate-100 text-slate-950"
      id="main-content"
      tabIndex={-1}
    >
      <header className="bg-[#03244d] px-4 py-4 text-white shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
              <ClipboardCheck aria-hidden="true" size={21} />
            </div>
            <div className="min-w-0">
              <h1 className="text-[17px] font-semibold leading-6 sm:text-[20px]">
                <span className="sm:hidden">Auburn Planner</span>
                <span className="hidden sm:inline">Auburn Academic Planner</span>
              </h1>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Planning Hub: Current Progress and Planned Path
              </p>
            </div>
          </div>
          <nav className="flex shrink-0 items-center gap-2" aria-label="Planning Hub navigation">
            <Link
              aria-label="Chat"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
              href="/chat"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              <span className="hidden sm:inline">Chat</span>
            </Link>
            <StakeholderMoreMenu />
          </nav>
        </div>
      </header>
      <IndependentPilotNotice />

      <DegreeWorksWorkflowUploadSection
        activeStep={activeStep}
        analyzedFileSummary={analyzedFileSummary}
        advisorSummaryAvailable={advisorSummaryAvailable}
        generatedPathPreferences={generatedPathPreferences}
        generatedPathStartTermOptions={generatedPathStartTermOptions}
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
        onRevisePlannedPath={revisePlannedPath}
        onStepChange={changeActiveStep}
        plannedPathInputMode={plannedPathInputMode}
        manualPlannedCoursesText={manualPlannedCoursesText}
        selectedFile={selectedCombinedDegreeWorksPdfFile}
        validationError={combinedDegreeWorksUploadValidationError}
        submissionError={combinedDegreeWorksError}
        hasCurrentProgressResult={Boolean(currentDegreeWorksResult)}
        hasPlannedPathComparison={hasPlannedPathComparison}
        hasPlannedPathResult={Boolean(combinedDegreeWorksResult)}
      />

      <PlanningHubDraftControls
        draft={savedDeviceDraft}
        onDelete={deleteDeviceDraft}
        onRestore={restoreDeviceDraft}
        onSave={saveDeviceDraft}
        saveIncludesManualPlan={
          activeStep === "planned_path" && plannedPathInputMode === "manual"
        }
        status={deviceDraftStatus}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <section className={`min-w-0 ${hasResultOrStatus ? "order-first" : "order-last"}`}>
          {advisorMeetingSummary && !combinedDegreeWorksResult && !currentDegreeWorksResult ? (
            <AdvisorMeetingSummary
              onCopySummary={copyAdvisorMeetingSummary}
              onDownloadSummary={downloadAdvisorMeetingSummary}
              status={advisorSummaryActionStatus}
              summary={advisorMeetingSummary}
            />
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
                  onCopySummary={copyAdvisorMeetingSummary}
                  onDownloadSummary={downloadAdvisorMeetingSummary}
                  status={advisorSummaryActionStatus}
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
              onCopySummary={copyAdvisorMeetingSummary}
              onDownloadSummary={downloadAdvisorMeetingSummary}
              status={advisorSummaryActionStatus}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {!combinedDegreeWorksResult && currentDegreeWorksResult && activeStep === "advisor_summary" && advisorMeetingSummary ? (
            <AdvisorMeetingSummary
              onCopySummary={copyAdvisorMeetingSummary}
              onDownloadSummary={downloadAdvisorMeetingSummary}
              status={advisorSummaryActionStatus}
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

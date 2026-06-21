"use client";

import {
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useMemo, useState } from "react";

import { buildAdvisorMeetingSummary } from "@/lib/plan/advisor-meeting-summary";
import type { PlanningTargetPathInput } from "@/lib/plan/target-path";
import { CollapsibleDetails, EmptyState } from "@/components/ui-primitives";
import { AdvisorMeetingSummary } from "./components/advisor-meeting-summary";
import { CombinedDegreeWorksParsedDetails, PlannedPathCoverageCard } from "./components/combined-analysis-details";
import { CurrentProgressResultDetails } from "./components/current-progress-details";
import {
  DegreeWorksWorkflowUploadSection,
  type PlanCheckWorkflowMode,
} from "./components/plan-check-input-sections";
import { DraftSemesterPlanCard, GapReportCard, NextSemesterSuggestionsCard } from "./components/planning-cards";
import { DegreeProgressResultCard, ResultCard } from "./components/result-cards";
import type {
  CombinedDegreeWorksUploadResult,
  ComputerSciencePlanCheckResult,
  CurrentDegreeWorksUploadResult,
  PlanCheckResult,
  SoftwareEngineeringPlanCheckResult,
} from "./types";

const combinedDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks/upload";
const currentDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks-current/upload";

export default function PlanCheckPage() {
  const [selectedCombinedDegreeWorksPdfFile, setSelectedCombinedDegreeWorksPdfFile] =
    useState<File | null>(null);
  const [selectedWorkflowMode, setSelectedWorkflowMode] =
    useState<PlanCheckWorkflowMode>("current_progress");
  const [selectedPlanningTargetPath, setSelectedPlanningTargetPath] =
    useState<PlanningTargetPathInput>("auto");
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [softwareEngineeringResult, setSoftwareEngineeringResult] =
    useState<SoftwareEngineeringPlanCheckResult | null>(null);
  const [computerScienceResult, setComputerScienceResult] =
    useState<ComputerSciencePlanCheckResult | null>(null);
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
      currentDegreeWorksResult?.advisorMeetingSummary ??
      buildAdvisorMeetingSummary({
        aiResult: result,
        softwareEngineeringResult,
        computerScienceResult,
        prerequisiteCheck: combinedDegreeWorksResult?.prerequisiteCheck ?? null,
        gapReport: combinedDegreeWorksResult?.gapReport ?? null,
        nextSemesterSuggestions:
          combinedDegreeWorksResult?.nextSemesterSuggestions ?? null,
        draftSemesterPlan: combinedDegreeWorksResult?.draftSemesterPlan ?? null,
        selectedTargetPath: combinedDegreeWorksResult?.selectedTargetPath,
      }),
    [
      combinedDegreeWorksResult?.draftSemesterPlan,
      combinedDegreeWorksResult?.gapReport,
      combinedDegreeWorksResult?.nextSemesterSuggestions,
      combinedDegreeWorksResult?.prerequisiteCheck,
      combinedDegreeWorksResult?.selectedTargetPath,
      computerScienceResult,
      currentDegreeWorksResult?.advisorMeetingSummary,
      result,
      softwareEngineeringResult,
    ],
  );

  async function runCombinedDegreeWorksUploadPlanCheck(
    file: File,
    targetPath: PlanningTargetPathInput,
    currentProgressAnalysis?: CurrentDegreeWorksUploadResult["currentProgressAnalysis"],
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);
    setCurrentDegreeWorksResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetPath", targetPath);
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
      const sharedPlanFields = {
        planDescription: "Combined Degree Works PDF analysis",
        sourceFileName: combinedPayload.sourceFileName,
        parsedCourseCodes: combinedPayload.parsedCourseCodes,
        parsedCourseCount: combinedPayload.parsedCourseCount,
        detectedSignals: combinedPayload.detectedSignals,
        courseStatusRecords: combinedPayload.courseStatusRecords,
        courseStatusCounts: combinedPayload.courseStatusCounts,
        parserWarnings: combinedPayload.parserWarnings,
        parserConfidence: combinedPayload.parserConfidence,
      };

      setCombinedDegreeWorksResult(combinedPayload);
      setCurrentDegreeWorksResult(null);
      setResult({
        ...combinedPayload.aiCertificateCheck,
        ...sharedPlanFields,
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
      setSoftwareEngineeringResult({
        ...combinedPayload.softwareEngineeringCheck,
        ...sharedPlanFields,
        program: "BSWE Software Engineering",
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
      setComputerScienceResult({
        ...combinedPayload.computerScienceCheck,
        ...sharedPlanFields,
        major: "Computer Science",
        program: "CSCI Computer Science",
        totalPlannedCredits: combinedPayload.totalPlannedCredits,
      });
    } catch (fetchError) {
      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setResult(null);
      setSoftwareEngineeringResult(null);
      setComputerScienceResult(null);
      setCombinedDegreeWorksError(
        fetchError instanceof Error
          ? fetchError.message
          : "The combined Degree Works PDF analysis could not run.",
      );
    } finally {
      setIsCombinedDegreeWorksLoading(false);
    }
  }

  async function runCurrentDegreeWorksUploadPlanCheck(
    file: File,
    targetPath: PlanningTargetPathInput,
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setResult(null);
    setSoftwareEngineeringResult(null);
    setComputerScienceResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetPath", targetPath);

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
    }
  }

  function checkCombinedDegreeWorksUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setCombinedDegreeWorksUploadValidationError(null);

    if (!selectedCombinedDegreeWorksPdfFile) {
      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setCombinedDegreeWorksUploadValidationError(
        selectedWorkflowMode === "current_progress"
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

    if (selectedWorkflowMode === "current_progress") {
      void runCurrentDegreeWorksUploadPlanCheck(
        selectedCombinedDegreeWorksPdfFile,
        selectedPlanningTargetPath,
      );
    } else {
      void runCombinedDegreeWorksUploadPlanCheck(
        selectedCombinedDegreeWorksPdfFile,
        selectedPlanningTargetPath,
        currentDegreeWorksResult?.currentProgressAnalysis,
      );
    }
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
              className="hidden h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
              href="/rule-audit"
            >
              <ShieldCheck aria-hidden="true" size={16} />
              Rule Audit
            </Link>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
              href="/chat"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Chat
            </Link>
          </nav>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 text-[13px]">
          <p className="hidden text-slate-600 sm:block">
            Review which local rules are source-backed, modeled, or advisor-review-only.
          </p>
          <Link
            className="inline-flex items-center gap-2 font-semibold text-[#b84300] hover:underline"
            href="/rule-audit"
          >
            <ShieldCheck aria-hidden="true" size={16} />
            View rule coverage audit
          </Link>
        </div>
      </div>

      <DegreeWorksWorkflowUploadSection
        mode={selectedWorkflowMode}
        isLoading={isCombinedDegreeWorksLoading}
        onAnalyze={checkCombinedDegreeWorksUploadedPdf}
        onFileChange={handleCombinedDegreeWorksPdfFileChange}
        onModeChange={(mode) => {
          setSelectedWorkflowMode(mode);
          setCombinedDegreeWorksUploadValidationError(null);
        }}
        onTargetPathChange={setSelectedPlanningTargetPath}
        selectedFile={selectedCombinedDegreeWorksPdfFile}
        selectedTargetPath={selectedPlanningTargetPath}
        validationError={combinedDegreeWorksUploadValidationError}
        hasCurrentProgressResult={Boolean(currentDegreeWorksResult)}
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
              Analyzing Degree Works PDF against deterministic checks...
            </div>
          ) : null}

          {currentDegreeWorksResult ? (
            <>
              <CurrentProgressResultDetails result={currentDegreeWorksResult} />
              {advisorMeetingSummary ? (
                <AdvisorMeetingSummary
                  copyStatus={advisorSummaryCopyStatus}
                  onCopySummary={copyAdvisorMeetingSummary}
                  summary={advisorMeetingSummary}
                />
              ) : null}
            </>
          ) : null}

          {combinedDegreeWorksResult ? (
            <>
              <PlannedPathCoverageCard result={combinedDegreeWorksResult} />
              <GapReportCard
                gapReport={combinedDegreeWorksResult.gapReport}
                selectedTargetPath={combinedDegreeWorksResult.selectedTargetPath}
              />
              <NextSemesterSuggestionsCard
                selectedTargetPath={combinedDegreeWorksResult.selectedTargetPath}
                suggestions={combinedDegreeWorksResult.nextSemesterSuggestions}
              />
              <DraftSemesterPlanCard
                plan={combinedDegreeWorksResult.draftSemesterPlan}
                selectedTargetPath={combinedDegreeWorksResult.selectedTargetPath}
              />
              {advisorMeetingSummary ? (
                <AdvisorMeetingSummary
                  copyStatus={advisorSummaryCopyStatus}
                  onCopySummary={copyAdvisorMeetingSummary}
                  summary={advisorMeetingSummary}
                />
              ) : null}
              <CombinedDegreeWorksParsedDetails
                result={combinedDegreeWorksResult}
              />
            </>
          ) : null}

          {combinedDegreeWorksResult && result ? (
            <>
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                AI Engineering certificate result
              </h2>
              <CollapsibleDetails
                description="Certificate requirements, course status, provenance, and advisor-review evidence."
                title="AI Engineering certificate details"
              >
                <ResultCard result={result} showUploadedPdfDetails={false} />
              </CollapsibleDetails>
            </>
          ) : !currentDegreeWorksResult ? (
            <EmptyState>
              Upload a Degree Works Worksheet audit for Current Progress, upload
              a Degree Works Plan PDF for Planned Path, or compare Planned Path
              against Current Progress to see deterministic advisor-safe results.
            </EmptyState>
          ) : null}

          <div className="mt-5">
            {combinedDegreeWorksResult && softwareEngineeringResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Software Engineering degree progress result
              </h2>
            ) : null}

            {combinedDegreeWorksResult && softwareEngineeringResult ? (
              <CollapsibleDetails
                description="Degree requirements, requirement blocks, prerequisites, provenance, and advisor-review evidence."
                title="Software Engineering degree details"
              >
                <DegreeProgressResultCard
                  degreeName="Software Engineering"
                  result={softwareEngineeringResult}
                  showUploadedPdfDetails={false}
                />
              </CollapsibleDetails>
            ) : null}
          </div>

          <div className="mt-5">
            {combinedDegreeWorksResult && computerScienceResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Computer Science degree progress result
              </h2>
            ) : null}

            {combinedDegreeWorksResult && computerScienceResult ? (
              <CollapsibleDetails
                description="Degree requirements, requirement blocks, prerequisites, provenance, and advisor-review evidence."
                title="Computer Science degree details"
              >
                <DegreeProgressResultCard
                  degreeName="Computer Science"
                  result={computerScienceResult}
                  showUploadedPdfDetails={false}
                />
              </CollapsibleDetails>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

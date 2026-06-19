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

import { parseCourseCodes } from "@/lib/courses/course-code-parser";
import { buildAdvisorMeetingSummary } from "@/lib/plan/advisor-meeting-summary";
import type { DraftSemesterPlan } from "@/lib/plan/draft-semester-plan";
import type { PlanningTargetPathInput } from "@/lib/plan/target-path";
import { CollapsibleDetails, EmptyState } from "@/components/ui-primitives";
import { AdvisorMeetingSummary } from "./components/advisor-meeting-summary";
import { CombinedDegreeWorksParsedDetails } from "./components/combined-analysis-details";
import { CurrentProgressResultDetails } from "./components/current-progress-details";
import { DegreeProgressCheckSection } from "./components/degree-progress-check-section";
import {
  AiCertificateCheckSection,
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

const planCheckEndpoint = "/api/plan/check-ai-certificate";
const planCheckUploadEndpoint = "/api/plan/check-ai-certificate/upload";
const combinedDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks/upload";
const currentDegreeWorksUploadEndpoint =
  "/api/plan/analyze-degreeworks-current/upload";
const draftSemesterPlanEndpoint = "/api/plan/draft-semester-plan";
const softwareEngineeringPlanCheckEndpoint =
  "/api/plan/check-software-engineering";
const softwareEngineeringPlanCheckUploadEndpoint =
  "/api/plan/check-software-engineering/upload";
const computerSciencePlanCheckEndpoint =
  "/api/plan/check-computer-science";
const computerSciencePlanCheckUploadEndpoint =
  "/api/plan/check-computer-science/upload";
export default function PlanCheckPage() {
  const [enteredCourses, setEnteredCourses] = useState("");
  const [
    enteredSoftwareEngineeringCourses,
    setEnteredSoftwareEngineeringCourses,
  ] = useState("");
  const [
    enteredSoftwareEngineeringTotalCredits,
    setEnteredSoftwareEngineeringTotalCredits,
  ] = useState("");
  const [
    enteredComputerScienceCourses,
    setEnteredComputerScienceCourses,
  ] = useState("");
  const [
    enteredComputerScienceTotalCredits,
    setEnteredComputerScienceTotalCredits,
  ] = useState("");
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedCombinedDegreeWorksPdfFile, setSelectedCombinedDegreeWorksPdfFile] =
    useState<File | null>(null);
  const [selectedWorkflowMode, setSelectedWorkflowMode] =
    useState<PlanCheckWorkflowMode>("current_progress");
  const [selectedPlanningTargetPath, setSelectedPlanningTargetPath] =
    useState<PlanningTargetPathInput>("auto");
  const [
    selectedSoftwareEngineeringPdfFile,
    setSelectedSoftwareEngineeringPdfFile,
  ] = useState<File | null>(null);
  const [
    selectedComputerSciencePdfFile,
    setSelectedComputerSciencePdfFile,
  ] = useState<File | null>(null);
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [softwareEngineeringResult, setSoftwareEngineeringResult] =
    useState<SoftwareEngineeringPlanCheckResult | null>(null);
  const [computerScienceResult, setComputerScienceResult] =
    useState<ComputerSciencePlanCheckResult | null>(null);
  const [combinedDegreeWorksResult, setCombinedDegreeWorksResult] =
    useState<CombinedDegreeWorksUploadResult | null>(null);
  const [currentDegreeWorksResult, setCurrentDegreeWorksResult] =
    useState<CurrentDegreeWorksUploadResult | null>(null);
  const [manualDraftSemesterPlan, setManualDraftSemesterPlan] =
    useState<DraftSemesterPlan | null>(null);
  const [draftSemesterPlanError, setDraftSemesterPlanError] = useState<
    string | null
  >(null);
  const [isDraftSemesterPlanLoading, setIsDraftSemesterPlanLoading] =
    useState(false);
  const [error, setError] = useState<string | null>(null);
  const [combinedDegreeWorksError, setCombinedDegreeWorksError] = useState<
    string | null
  >(null);
  const [softwareEngineeringError, setSoftwareEngineeringError] = useState<
    string | null
  >(null);
  const [computerScienceError, setComputerScienceError] = useState<
    string | null
  >(null);
  const [uploadValidationError, setUploadValidationError] = useState<
    string | null
  >(null);
  const [
    combinedDegreeWorksUploadValidationError,
    setCombinedDegreeWorksUploadValidationError,
  ] = useState<string | null>(null);
  const [
    softwareEngineeringUploadValidationError,
    setSoftwareEngineeringUploadValidationError,
  ] = useState<string | null>(null);
  const [
    computerScienceUploadValidationError,
    setComputerScienceUploadValidationError,
  ] = useState<string | null>(null);
  const [
    softwareEngineeringManualValidationError,
    setSoftwareEngineeringManualValidationError,
  ] = useState<string | null>(null);
  const [
    computerScienceManualValidationError,
    setComputerScienceManualValidationError,
  ] = useState<string | null>(null);
  const [advisorSummaryCopyStatus, setAdvisorSummaryCopyStatus] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCombinedDegreeWorksLoading, setIsCombinedDegreeWorksLoading] =
    useState(false);
  const [isSoftwareEngineeringLoading, setIsSoftwareEngineeringLoading] =
    useState(false);
  const [isComputerScienceLoading, setIsComputerScienceLoading] =
    useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Checking entered courses against Auburn certificate rules...",
  );
  const [softwareEngineeringLoadingMessage, setSoftwareEngineeringLoadingMessage] =
    useState("Checking the sample Degree Works plan against Software Engineering degree rules...");
  const [computerScienceLoadingMessage, setComputerScienceLoadingMessage] =
    useState("Checking the sample Degree Works plan against Computer Science degree rules...");

  const parsedCourseCodes = useMemo(
    () => parseCourseCodes(enteredCourses),
    [enteredCourses],
  );
  const parsedSoftwareEngineeringCourseCodes = useMemo(
    () => parseCourseCodes(enteredSoftwareEngineeringCourses),
    [enteredSoftwareEngineeringCourses],
  );
  const parsedComputerScienceCourseCodes = useMemo(
    () => parseCourseCodes(enteredComputerScienceCourses),
    [enteredComputerScienceCourses],
  );
  const activeDraftSemesterPlan =
    combinedDegreeWorksResult?.draftSemesterPlan ?? manualDraftSemesterPlan;
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
        draftSemesterPlan: activeDraftSemesterPlan,
        selectedTargetPath: combinedDegreeWorksResult?.selectedTargetPath,
      }),
    [
      activeDraftSemesterPlan,
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

  async function runPlanCheck({
    endpoint = planCheckEndpoint,
    request = {},
    message = "Checking entered courses against Auburn certificate rules...",
  }: {
    endpoint?: string;
    request?: RequestInit;
    message?: string;
  } = {}) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setLoadingMessage(message);

    try {
      const response = await fetch(endpoint, request);
      const payload = (await response.json()) as Partial<PlanCheckResult> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The plan check could not run.");
      }

      setResult(payload as PlanCheckResult);
    } catch (fetchError) {
      setResult(null);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "The plan check could not run.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function runCombinedDegreeWorksUploadPlanCheck(
    file: File,
    targetPath: PlanningTargetPathInput,
  ) {
    if (isCombinedDegreeWorksLoading) {
      return;
    }

    setIsCombinedDegreeWorksLoading(true);
    setCombinedDegreeWorksError(null);
    setCurrentDegreeWorksResult(null);
    setError(null);
    setSoftwareEngineeringError(null);
    setComputerScienceError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("targetPath", targetPath);

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
      setManualDraftSemesterPlan(null);
      setDraftSemesterPlanError(null);
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
    setError(null);
    setSoftwareEngineeringError(null);
    setComputerScienceError(null);
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
      setManualDraftSemesterPlan(null);
      setDraftSemesterPlanError(null);
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

  async function runManualDraftSemesterPlan({
    courseCodes,
    targetPath,
    totalPlannedCreditsText = "",
  }: {
    courseCodes: string[];
    targetPath:
      | "software_engineering"
      | "computer_science"
      | "ai_certificate";
    totalPlannedCreditsText?: string;
  }) {
    if (isDraftSemesterPlanLoading) {
      return;
    }

    if (courseCodes.length === 0) {
      setManualDraftSemesterPlan(null);
      setDraftSemesterPlanError(
        "Enter at least one planned course code before generating a draft plan.",
      );
      return;
    }

    const normalizedCredits = totalPlannedCreditsText.trim();
    const totalPlannedCredits =
      normalizedCredits.length > 0 ? Number(normalizedCredits) : null;

    if (
      totalPlannedCredits !== null &&
      (!Number.isFinite(totalPlannedCredits) || totalPlannedCredits < 0)
    ) {
      setManualDraftSemesterPlan(null);
      setDraftSemesterPlanError(
        "Enter total planned credits as a non-negative number, or leave it blank.",
      );
      return;
    }

    setIsDraftSemesterPlanLoading(true);
    setDraftSemesterPlanError(null);

    try {
      const response = await fetch(draftSemesterPlanEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseCodes, targetPath, totalPlannedCredits }),
      });
      const payload = (await response.json()) as
        | DraftSemesterPlan
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The draft semester plan could not be generated.",
        );
      }

      setCombinedDegreeWorksResult(null);
      setCurrentDegreeWorksResult(null);
      setManualDraftSemesterPlan(payload as DraftSemesterPlan);
    } catch (fetchError) {
      setManualDraftSemesterPlan(null);
      setDraftSemesterPlanError(
        fetchError instanceof Error
          ? fetchError.message
          : "The draft semester plan could not be generated.",
      );
    } finally {
      setIsDraftSemesterPlanLoading(false);
    }
  }

  async function runSoftwareEngineeringPlanCheck() {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking the sample Degree Works plan against Software Engineering degree rules...",
    );

    try {
      const response = await fetch(softwareEngineeringPlanCheckEndpoint);
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering degree check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering degree check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runSoftwareEngineeringManualPlanCheck({
    courseCodes,
    totalPlannedCredits,
  }: {
    courseCodes: string[];
    totalPlannedCredits: number | null;
  }) {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking pasted plan against Software Engineering degree rules...",
    );

    try {
      const response = await fetch(softwareEngineeringPlanCheckEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes,
          planDescription: "Pasted Software Engineering plan",
          major: "Software Engineering",
          totalPlannedCredits,
        }),
      });
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering pasted plan check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering pasted plan check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runSoftwareEngineeringUploadPlanCheck(file: File) {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setSoftwareEngineeringLoadingMessage(
      "Checking uploaded Degree Works PDF against Software Engineering degree rules...",
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(softwareEngineeringPlanCheckUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | SoftwareEngineeringPlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Software Engineering PDF check could not run.",
        );
      }

      setSoftwareEngineeringResult(payload as SoftwareEngineeringPlanCheckResult);
    } catch (fetchError) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Software Engineering PDF check could not run.",
      );
    } finally {
      setIsSoftwareEngineeringLoading(false);
    }
  }

  async function runComputerSciencePlanCheck() {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking the sample Degree Works plan against Computer Science degree rules...",
    );

    try {
      const response = await fetch(computerSciencePlanCheckEndpoint);
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science degree check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science degree check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  async function runComputerScienceManualPlanCheck({
    courseCodes,
    totalPlannedCredits,
  }: {
    courseCodes: string[];
    totalPlannedCredits: number | null;
  }) {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking pasted plan against Computer Science degree rules...",
    );

    try {
      const response = await fetch(computerSciencePlanCheckEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes,
          planDescription: "Pasted Computer Science plan",
          major: "Computer Science",
          totalPlannedCredits,
        }),
      });
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science pasted plan check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science pasted plan check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  async function runComputerScienceUploadPlanCheck(file: File) {
    if (isComputerScienceLoading) {
      return;
    }

    setIsComputerScienceLoading(true);
    setComputerScienceError(null);
    setCombinedDegreeWorksResult(null);
    setCurrentDegreeWorksResult(null);
    setCombinedDegreeWorksError(null);
    setComputerScienceLoadingMessage(
      "Checking uploaded Degree Works PDF against Computer Science degree rules...",
    );

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(computerSciencePlanCheckUploadEndpoint, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as
        | ComputerSciencePlanCheckResult
        | { error?: string };

      if (!response.ok) {
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "The Computer Science PDF check could not run.",
        );
      }

      setComputerScienceResult(payload as ComputerSciencePlanCheckResult);
    } catch (fetchError) {
      setComputerScienceResult(null);
      setComputerScienceError(
        fetchError instanceof Error
          ? fetchError.message
          : "The Computer Science PDF check could not run.",
      );
    } finally {
      setIsComputerScienceLoading(false);
    }
  }

  function checkEnteredCourses(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (parsedCourseCodes.length === 0) {
      setResult(null);
      setError("Paste at least one planned course code before checking.");
      return;
    }

    void runPlanCheck({
      request: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCodes: parsedCourseCodes,
          planDescription: "Custom entered plan",
          major: "Software Engineering",
          totalPlannedCredits: null,
        }),
      },
      message: "Checking entered courses against Auburn certificate rules...",
    });
  }

  function checkSamplePlan(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    void runPlanCheck({
      message: "Checking the sample Degree Works plan...",
    });
  }

  function checkSoftwareEngineeringSamplePlan(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    void runSoftwareEngineeringPlanCheck();
  }

  function checkSoftwareEngineeringEnteredCourses(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setSoftwareEngineeringManualValidationError(null);

    if (parsedSoftwareEngineeringCourseCodes.length === 0) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringManualValidationError(
        "Paste at least one Software Engineering course code before checking.",
      );
      return;
    }

    const totalCredits = enteredSoftwareEngineeringTotalCredits.trim();
    let totalPlannedCredits: number | null = null;

    if (totalCredits.length > 0) {
      const parsedTotalPlannedCredits = Number(totalCredits);

      if (
        !Number.isFinite(parsedTotalPlannedCredits) ||
        parsedTotalPlannedCredits < 0
      ) {
        setSoftwareEngineeringResult(null);
        setSoftwareEngineeringManualValidationError(
          "Enter total planned credits as a non-negative number, or leave it blank.",
        );
        return;
      }

      totalPlannedCredits = parsedTotalPlannedCredits;
    }

    void runSoftwareEngineeringManualPlanCheck({
      courseCodes: parsedSoftwareEngineeringCourseCodes,
      totalPlannedCredits,
    });
  }

  function checkComputerScienceSamplePlan(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    void runComputerSciencePlanCheck();
  }

  function checkComputerScienceEnteredCourses(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setComputerScienceManualValidationError(null);

    if (parsedComputerScienceCourseCodes.length === 0) {
      setComputerScienceResult(null);
      setComputerScienceManualValidationError(
        "Paste at least one Computer Science course code before checking.",
      );
      return;
    }

    const totalCredits = enteredComputerScienceTotalCredits.trim();
    let totalPlannedCredits: number | null = null;

    if (totalCredits.length > 0) {
      const parsedTotalPlannedCredits = Number(totalCredits);

      if (
        !Number.isFinite(parsedTotalPlannedCredits) ||
        parsedTotalPlannedCredits < 0
      ) {
        setComputerScienceResult(null);
        setComputerScienceManualValidationError(
          "Enter total planned credits as a non-negative number, or leave it blank.",
        );
        return;
      }

      totalPlannedCredits = parsedTotalPlannedCredits;
    }

    void runComputerScienceManualPlanCheck({
      courseCodes: parsedComputerScienceCourseCodes,
      totalPlannedCredits,
    });
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

  function handlePdfFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedPdfFile(file);
    setUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedPdfFile(null);
      setUploadValidationError("Choose a PDF file before running the check.");
      event.target.value = "";
    }
  }

  function handleSoftwareEngineeringPdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedSoftwareEngineeringPdfFile(file);
    setSoftwareEngineeringUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedSoftwareEngineeringPdfFile(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a PDF file before running the Software Engineering check.",
      );
      event.target.value = "";
    }
  }

  function handleComputerSciencePdfFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0] ?? null;
    setSelectedComputerSciencePdfFile(file);
    setComputerScienceUploadValidationError(null);

    if (!file) {
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedComputerSciencePdfFile(null);
      setComputerScienceUploadValidationError(
        "Choose a PDF file before running the Computer Science check.",
      );
      event.target.value = "";
    }
  }

  function checkUploadedPdf(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setUploadValidationError(null);

    if (!selectedPdfFile) {
      setResult(null);
      setUploadValidationError("Choose a Degree Works PDF before checking.");
      return;
    }

    if (!isPdfFile(selectedPdfFile)) {
      setResult(null);
      setUploadValidationError("Choose a PDF file before running the check.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedPdfFile);

    void runPlanCheck({
      endpoint: planCheckUploadEndpoint,
      request: {
        method: "POST",
        body: formData,
      },
      message: "Checking uploaded Degree Works PDF...",
    });
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
      );
    }
  }

  function checkSoftwareEngineeringUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setSoftwareEngineeringUploadValidationError(null);

    if (!selectedSoftwareEngineeringPdfFile) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a Degree Works PDF before checking Software Engineering progress.",
      );
      return;
    }

    if (!isPdfFile(selectedSoftwareEngineeringPdfFile)) {
      setSoftwareEngineeringResult(null);
      setSoftwareEngineeringUploadValidationError(
        "Choose a PDF file before running the Software Engineering check.",
      );
      return;
    }

    void runSoftwareEngineeringUploadPlanCheck(
      selectedSoftwareEngineeringPdfFile,
    );
  }

  function checkComputerScienceUploadedPdf(
    event: MouseEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    setComputerScienceUploadValidationError(null);

    if (!selectedComputerSciencePdfFile) {
      setComputerScienceResult(null);
      setComputerScienceUploadValidationError(
        "Choose a Degree Works PDF before checking Computer Science progress.",
      );
      return;
    }

    if (!isPdfFile(selectedComputerSciencePdfFile)) {
      setComputerScienceResult(null);
      setComputerScienceUploadValidationError(
        "Choose a PDF file before running the Computer Science check.",
      );
      return;
    }

    void runComputerScienceUploadPlanCheck(selectedComputerSciencePdfFile);
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
      result ||
      softwareEngineeringResult ||
      computerScienceResult ||
      combinedDegreeWorksError ||
      error ||
      softwareEngineeringError ||
      computerScienceError ||
      isCombinedDegreeWorksLoading ||
      isLoading ||
      isSoftwareEngineeringLoading ||
      isComputerScienceLoading,
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
      />

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:py-7">
        <CollapsibleDetails
          description="Paste courses, run samples, or use the separate program-specific PDF checks. The Current Progress and Planned Path workflows above remain the primary flows."
          key={combinedDegreeWorksResult || currentDegreeWorksResult ? "workflow-result" : "manual-inputs"}
          open={!combinedDegreeWorksResult && !currentDegreeWorksResult}
          title="Advanced and manual checks"
        >
          <div className="grid gap-5 lg:grid-cols-3">
          <AiCertificateCheckSection
            enteredCourses={enteredCourses}
            isDraftLoading={isDraftSemesterPlanLoading}
            isLoading={isLoading}
            onCheckEntered={checkEnteredCourses}
            onCheckSample={checkSamplePlan}
            onCheckUploaded={checkUploadedPdf}
            onCoursesChange={setEnteredCourses}
            onGenerateDraft={() =>
              void runManualDraftSemesterPlan({
                courseCodes: parsedCourseCodes,
                targetPath: "ai_certificate",
              })
            }
            onPdfFileChange={handlePdfFileChange}
            parsedCourseCodes={parsedCourseCodes}
            selectedPdfFile={selectedPdfFile}
            uploadValidationError={uploadValidationError}
          />

          <DegreeProgressCheckSection
            degreeKind="software_engineering"
            enteredCourses={enteredSoftwareEngineeringCourses}
            enteredTotalCredits={enteredSoftwareEngineeringTotalCredits}
            isDraftSemesterPlanLoading={isDraftSemesterPlanLoading}
            isLoading={isSoftwareEngineeringLoading}
            manualValidationError={softwareEngineeringManualValidationError}
            onCheckEnteredCourses={checkSoftwareEngineeringEnteredCourses}
            onCheckSamplePlan={checkSoftwareEngineeringSamplePlan}
            onCheckUploadedPdf={checkSoftwareEngineeringUploadedPdf}
            onCoursesChange={setEnteredSoftwareEngineeringCourses}
            onGenerateDraftPlan={() =>
              void runManualDraftSemesterPlan({
                courseCodes: parsedSoftwareEngineeringCourseCodes,
                targetPath: "software_engineering",
                totalPlannedCreditsText: enteredSoftwareEngineeringTotalCredits,
              })
            }
            onPdfFileChange={handleSoftwareEngineeringPdfFileChange}
            onTotalCreditsChange={setEnteredSoftwareEngineeringTotalCredits}
            parsedCourseCodes={parsedSoftwareEngineeringCourseCodes}
            selectedPdfFile={selectedSoftwareEngineeringPdfFile}
            uploadValidationError={softwareEngineeringUploadValidationError}
          />

          <DegreeProgressCheckSection
            degreeKind="computer_science"
            enteredCourses={enteredComputerScienceCourses}
            enteredTotalCredits={enteredComputerScienceTotalCredits}
            isDraftSemesterPlanLoading={isDraftSemesterPlanLoading}
            isLoading={isComputerScienceLoading}
            manualValidationError={computerScienceManualValidationError}
            onCheckEnteredCourses={checkComputerScienceEnteredCourses}
            onCheckSamplePlan={checkComputerScienceSamplePlan}
            onCheckUploadedPdf={checkComputerScienceUploadedPdf}
            onCoursesChange={setEnteredComputerScienceCourses}
            onGenerateDraftPlan={() =>
              void runManualDraftSemesterPlan({
                courseCodes: parsedComputerScienceCourseCodes,
                targetPath: "computer_science",
                totalPlannedCreditsText: enteredComputerScienceTotalCredits,
              })
            }
            onPdfFileChange={handleComputerSciencePdfFileChange}
            onTotalCreditsChange={setEnteredComputerScienceTotalCredits}
            parsedCourseCodes={parsedComputerScienceCourseCodes}
            selectedPdfFile={selectedComputerSciencePdfFile}
            uploadValidationError={computerScienceUploadValidationError}
          />
          </div>
        </CollapsibleDetails>

        <section className={`min-w-0 ${hasResultOrStatus ? "order-first" : "order-last"}`}>
          {advisorMeetingSummary && !combinedDegreeWorksResult && !currentDegreeWorksResult ? (
            <AdvisorMeetingSummary
              copyStatus={advisorSummaryCopyStatus}
              onCopySummary={copyAdvisorMeetingSummary}
              summary={advisorMeetingSummary}
            />
          ) : null}

          {draftSemesterPlanError ? (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-orange-700"
                  size={18}
                />
                <p className="text-[14px] leading-6 text-orange-800">
                  {draftSemesterPlanError}
                </p>
              </div>
            </div>
          ) : null}

          {isDraftSemesterPlanLoading ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#dd550c]"
                size={19}
              />
              Generating a deterministic draft semester plan...
            </div>
          ) : null}

          {manualDraftSemesterPlan && !combinedDegreeWorksResult ? (
            <DraftSemesterPlanCard plan={manualDraftSemesterPlan} />
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

          {error ? (
            <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-orange-700"
                  size={18}
                />
                <p className="text-[14px] leading-6 text-orange-800">
                  {error}
                </p>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#dd550c]"
                size={19}
              />
              {loadingMessage}
            </div>
          ) : null}

          {combinedDegreeWorksResult && result ? (
            <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
              AI Engineering certificate result
            </h2>
          ) : null}

          {result ? (
            combinedDegreeWorksResult ? (
              <CollapsibleDetails
                description="Certificate requirements, course status, provenance, and advisor-review evidence."
                title="AI Engineering certificate details"
              >
                <ResultCard result={result} showUploadedPdfDetails={false} />
              </CollapsibleDetails>
            ) : (
              <ResultCard result={result} showUploadedPdfDetails />
            )
          ) : !currentDegreeWorksResult ? (
            <EmptyState>
              Upload a Degree Works Worksheet audit for Current Progress, upload
              a Degree Works Plan PDF for Planned Path, paste planned courses,
              or run the sample plan to see deterministic advisor-safe results.
            </EmptyState>
          ) : null}

          <div className="mt-5">
            {softwareEngineeringError ? (
              <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-orange-700"
                    size={18}
                  />
                  <p className="text-[14px] leading-6 text-orange-800">
                    {softwareEngineeringError}
                  </p>
                </div>
              </div>
            ) : null}

            {isSoftwareEngineeringLoading ? (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
                <Loader2
                  aria-hidden="true"
                  className="animate-spin text-[#dd550c]"
                  size={19}
                />
                {softwareEngineeringLoadingMessage}
              </div>
            ) : null}

            {combinedDegreeWorksResult && softwareEngineeringResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Software Engineering degree progress result
              </h2>
            ) : null}

            {softwareEngineeringResult ? (
              combinedDegreeWorksResult ? (
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
              ) : (
                <DegreeProgressResultCard
                  degreeName="Software Engineering"
                  result={softwareEngineeringResult}
                  showUploadedPdfDetails
                />
              )
            ) : null}
          </div>

          <div className="mt-5">
            {computerScienceError ? (
              <div className="mb-4 rounded-md border border-orange-200 bg-orange-50 p-4">
                <div className="flex gap-3">
                  <AlertCircle
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-orange-700"
                    size={18}
                  />
                  <p className="text-[14px] leading-6 text-orange-800">
                    {computerScienceError}
                  </p>
                </div>
              </div>
            ) : null}

            {isComputerScienceLoading ? (
              <div className="mb-4 flex items-center gap-3 rounded-md border border-slate-200 bg-white p-4 text-[14px] text-slate-600 shadow-sm">
                <Loader2
                  aria-hidden="true"
                  className="animate-spin text-[#dd550c]"
                  size={19}
                />
                {computerScienceLoadingMessage}
              </div>
            ) : null}

            {combinedDegreeWorksResult && computerScienceResult ? (
              <h2 className="mb-3 text-[18px] font-semibold leading-7 text-slate-950">
                Computer Science degree progress result
              </h2>
            ) : null}

            {computerScienceResult ? (
              combinedDegreeWorksResult ? (
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
              ) : (
                <DegreeProgressResultCard
                  degreeName="Computer Science"
                  result={computerScienceResult}
                  showUploadedPdfDetails
                />
              )
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

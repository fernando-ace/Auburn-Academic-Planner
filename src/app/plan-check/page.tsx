"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { ChangeEvent, MouseEvent, useMemo, useState } from "react";

import { parseCourseCodes } from "@/lib/courses/course-code-parser";

type PlanCheckCourse = {
  code: string;
  title: string;
  creditHours: number;
  approvalStatus?: string;
};

type PlanCheckResult = {
  planDescription?: string;
  major?: string;
  totalPlannedCredits?: number | null;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  requiredCoursesSatisfied: PlanCheckCourse[];
  requiredCoursesMissing: PlanCheckCourse[];
  electiveCandidatesFound: PlanCheckCourse[];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

type SoftwareEngineeringAlternativeCourseGroup = {
  name: string;
  minimumCoursesRequired: number;
  courses: PlanCheckCourse[];
  satisfiedCourses: PlanCheckCourse[];
  missingCourseOptions: PlanCheckCourse[];
  isSatisfied: boolean;
};

type AdvisorVerifiedRequirement = {
  name: string;
  creditHoursRequired: number;
};

type SoftwareEngineeringPlanCheckResult = {
  planDescription?: string;
  major?: string;
  program?: string;
  sourceFileName?: string;
  parsedCourseCodes?: string[];
  parsedCourseCount?: number;
  totalPlannedCredits: number | null;
  exactRequiredCoursesSatisfied: PlanCheckCourse[];
  exactRequiredCoursesMissing: PlanCheckCourse[];
  alternativeCourseGroups: SoftwareEngineeringAlternativeCourseGroup[];
  advisorVerifiedRequirements: AdvisorVerifiedRequirement[];
  totalHoursRequired: number;
  hasEnoughTotalCredits: boolean | null;
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

const planCheckEndpoint = "/api/plan/check-ai-certificate";
const planCheckUploadEndpoint = "/api/plan/check-ai-certificate/upload";
const softwareEngineeringPlanCheckEndpoint =
  "/api/plan/check-software-engineering";
const softwareEngineeringPlanCheckUploadEndpoint =
  "/api/plan/check-software-engineering/upload";
const samplePasteText = `COMP 5130
COMP 5600
COMP 5630
COMP 5610`;

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={`rounded-sm border px-2.5 py-1 text-[13px] font-semibold ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-orange-200 bg-orange-50 text-orange-800"
      }`}
    >
      {value ? "Yes" : "No"}
    </span>
  );
}

function NullableBooleanPill({ value }: { value: boolean | null }) {
  if (value === null) {
    return (
      <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[13px] font-semibold text-slate-600">
        Not provided
      </span>
    );
  }

  return <BooleanPill value={value} />;
}

function CourseList({
  courses,
  emptyText,
}: {
  courses: PlanCheckCourse[];
  emptyText: string;
}) {
  if (courses.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        {emptyText}
      </p>
    );
  }

  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {courses.map((course) => (
        <li
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700"
          key={course.code}
        >
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-950">{course.code}</span>
            <span className="text-slate-500">
              {course.creditHours} credits
            </span>
          </div>
          <p className="mt-1 text-slate-600">{course.title}</p>
          {course.approvalStatus ? (
            <p className="mt-1 text-[12px] font-medium text-[#9b3900]">
              Advisor verification candidate
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function AdvisorRequirementList({
  requirements,
}: {
  requirements: AdvisorVerifiedRequirement[];
}) {
  return (
    <ul className="grid gap-2 md:grid-cols-2">
      {requirements.map((requirement) => (
        <li
          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700"
          key={requirement.name}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-950">
              {requirement.name}
            </span>
            <span className="rounded-sm bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600">
              {requirement.creditHoursRequired} credits
            </span>
          </div>
          <p className="mt-1 text-slate-600">
            Requires advisor, Degree Works, transfer, substitution, or elective
            verification.
          </p>
        </li>
      ))}
    </ul>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ResultCard({ result }: { result: PlanCheckResult }) {
  const hasUploadedPdfResult =
    typeof result.sourceFileName === "string" ||
    typeof result.parsedCourseCount === "number";

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            {hasUploadedPdfResult ? "Plan source" : "Plan description"}
          </p>
          <h2 className="mt-2 text-[21px] font-semibold leading-7 text-slate-950">
            {result.planDescription ?? "Uploaded Degree Works PDF"}
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Source file" : "Major"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {result.sourceFileName ?? result.major ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult
                ? "Parsed course count"
                : "Total planned credits"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.parsedCourseCount ?? 0)
                : (result.totalPlannedCredits ?? "Not provided")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        {hasUploadedPdfResult ? (
          <ResultSection title="Parsed course codes">
            <ParsedCourseCodes
              courseCodes={result.parsedCourseCodes ?? []}
              parsedCourseCount={result.parsedCourseCount ?? 0}
            />
          </ResultSection>
        ) : null}

        <ResultSection title="Required courses satisfied">
          <CourseList
            courses={result.requiredCoursesSatisfied}
            emptyText="No required courses were found in this plan."
          />
        </ResultSection>

        <ResultSection title="Required courses missing">
          <CourseList
            courses={result.requiredCoursesMissing}
            emptyText="No required courses are missing."
          />
        </ResultSection>

        <ResultSection title="Elective candidates found">
          <CourseList
            courses={result.electiveCandidatesFound}
            emptyText="No elective candidates were found."
          />
        </ResultSection>

        <ResultSection title="Completion review">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Likely complete
              </p>
              <BooleanPill value={result.isLikelyComplete} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Advisor verification required
              </p>
              <BooleanPill value={result.advisorVerificationRequired} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Notes">
          <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
            {result.notes.map((note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultSection>
      </div>
    </article>
  );
}

function SoftwareEngineeringResultCard({
  result,
}: {
  result: SoftwareEngineeringPlanCheckResult;
}) {
  const hasUploadedPdfResult =
    typeof result.sourceFileName === "string" ||
    typeof result.parsedCourseCount === "number";
  const notes = Array.from(
    new Set([
      hasUploadedPdfResult
        ? "This extracted PDF does not prove final degree completion."
        : "This extracted plan does not prove completion of every Software Engineering requirement.",
      ...result.notes,
    ]),
  );

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            {hasUploadedPdfResult ? "Plan source" : "Plan source description"}
          </p>
          <h2 className="mt-2 text-[21px] font-semibold leading-7 text-slate-950">
            {result.planDescription ??
              result.sourceFileName ??
              "Uploaded Degree Works PDF"}
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
            {hasUploadedPdfResult
              ? "This extracted PDF does not prove final degree completion. Some credits, AP/transfer work, substitutions, hidden Degree Works sections, and advisor-approved electives may not be captured by the parser yet."
              : "This extracted plan does not prove completion of every Software Engineering requirement. Some credits, AP/transfer work, substitutions, hidden Degree Works sections, and advisor-approved electives may not be captured by the parser yet."}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[28rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Source file" : "Major"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {result.sourceFileName ?? result.major ?? "Not provided"}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              {hasUploadedPdfResult ? "Parsed course count" : "Program"}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {hasUploadedPdfResult
                ? (result.parsedCourseCount ?? 0)
                : (result.program ?? "Not provided")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        {hasUploadedPdfResult ? (
          <ResultSection title="Parsed course codes">
            <ParsedCourseCodes
              courseCodes={result.parsedCourseCodes ?? []}
              parsedCourseCount={result.parsedCourseCount ?? 0}
            />
          </ResultSection>
        ) : null}

        <ResultSection title="Credit totals">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Planned credits
              </p>
              <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
                {result.totalPlannedCredits ??
                  (hasUploadedPdfResult
                    ? "Not available from PDF extraction"
                    : "Not provided")}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Required credits
              </p>
              <p className="mt-1 text-[18px] font-semibold leading-6 text-slate-950">
                {result.totalHoursRequired}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Total credits pass
              </p>
              <NullableBooleanPill value={result.hasEnoughTotalCredits} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Exact required courses satisfied">
          <CourseList
            courses={result.exactRequiredCoursesSatisfied}
            emptyText="No exact required Software Engineering courses were found in this plan."
          />
        </ResultSection>

        <ResultSection title="Exact required courses missing">
          <CourseList
            courses={result.exactRequiredCoursesMissing}
            emptyText="No exact required Software Engineering courses are missing from the extracted plan."
          />
        </ResultSection>

        <ResultSection title="Alternative course groups">
          <div className="grid gap-3">
            {result.alternativeCourseGroups.map((group) => (
              <section
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={group.name}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-semibold text-slate-950">
                      {group.name}
                    </h3>
                    <p className="mt-1 text-[13px] leading-5 text-slate-600">
                      Requires {group.minimumCoursesRequired} course
                      {group.minimumCoursesRequired === 1 ? "" : "s"} from this
                      group.
                    </p>
                  </div>
                  <BooleanPill value={group.isSatisfied} />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Satisfied options
                    </p>
                    <CourseList
                      courses={group.satisfiedCourses}
                      emptyText="No options from this group were found."
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Other options
                    </p>
                    <CourseList
                      courses={group.missingCourseOptions}
                      emptyText="No additional options remain."
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        </ResultSection>

        <ResultSection title="Advisor-verified requirement blocks">
          <AdvisorRequirementList
            requirements={result.advisorVerifiedRequirements}
          />
        </ResultSection>

        <ResultSection title="Completion review">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Extracted plan likely proves completion
              </p>
              <BooleanPill value={result.isLikelyComplete} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[14px] font-semibold text-slate-700">
                Advisor verification required
              </p>
              <BooleanPill value={result.advisorVerificationRequired} />
            </div>
          </div>
        </ResultSection>

        <ResultSection title="Notes">
          <ul className="space-y-2 rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
            {notes.map((note) => (
              <li
                className="flex gap-2 text-[13px] leading-5 text-slate-700"
                key={note}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </ResultSection>
      </div>
    </article>
  );
}

function ParsedCourseCodes({
  courseCodes,
  parsedCourseCount,
}: {
  courseCodes: string[];
  parsedCourseCount: number;
}) {
  if (courseCodes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-[13px] leading-5 text-slate-500">
        No course codes were parsed from this PDF.
      </p>
    );
  }

  const previewCodes = courseCodes.slice(0, 12);
  const hiddenCount = Math.max(0, parsedCourseCount - previewCodes.length);

  return (
    <details className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[13px] leading-5 text-slate-700">
      <summary className="cursor-pointer font-semibold text-slate-800">
        {parsedCourseCount} parsed courses
        {hiddenCount > 0 ? `, showing first ${previewCodes.length}` : ""}
      </summary>
      <div className="mt-3 flex flex-wrap gap-2">
        {courseCodes.map((courseCode) => (
          <span
            className="rounded-sm border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700"
            key={courseCode}
          >
            {courseCode}
          </span>
        ))}
      </div>
    </details>
  );
}

export default function PlanCheckPage() {
  const [enteredCourses, setEnteredCourses] = useState("");
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [
    selectedSoftwareEngineeringPdfFile,
    setSelectedSoftwareEngineeringPdfFile,
  ] = useState<File | null>(null);
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [softwareEngineeringResult, setSoftwareEngineeringResult] =
    useState<SoftwareEngineeringPlanCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [softwareEngineeringError, setSoftwareEngineeringError] = useState<
    string | null
  >(null);
  const [uploadValidationError, setUploadValidationError] = useState<
    string | null
  >(null);
  const [
    softwareEngineeringUploadValidationError,
    setSoftwareEngineeringUploadValidationError,
  ] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSoftwareEngineeringLoading, setIsSoftwareEngineeringLoading] =
    useState(false);
  const [loadingMessage, setLoadingMessage] = useState(
    "Checking entered courses against Auburn certificate rules...",
  );
  const [softwareEngineeringLoadingMessage, setSoftwareEngineeringLoadingMessage] =
    useState("Checking the sample Degree Works plan against Software Engineering degree rules...");

  const parsedCourseCodes = useMemo(
    () => parseCourseCodes(enteredCourses),
    [enteredCourses],
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

  async function runSoftwareEngineeringPlanCheck() {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
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

  async function runSoftwareEngineeringUploadPlanCheck(file: File) {
    if (isSoftwareEngineeringLoading) {
      return;
    }

    setIsSoftwareEngineeringLoading(true);
    setSoftwareEngineeringError(null);
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

  function isPdfFile(file: File) {
    return (
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    );
  }

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
                AI Certificate Plan Check
              </h1>
              <p className="hidden text-[13px] text-white/75 sm:block">
                Deterministic Auburn requirement review
              </p>
            </div>
          </div>
          <Link
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10"
            href="/chat"
          >
            <ArrowLeft aria-hidden="true" size={16} />
            Back to Chat
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-7">
        <div className="grid gap-5">
          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
            AI Certificate Plan Check
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-slate-600">
            Checks entered courses against Auburn&apos;s AI Engineering
            certificate requirements using the local deterministic requirement
            rules.
          </p>

          <div className="mt-5">
            <label
              className="text-[13px] font-semibold leading-5 text-slate-700"
              htmlFor="planned-courses"
            >
              Paste planned courses
            </label>
            <textarea
              className="mt-2 min-h-56 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
              disabled={isLoading}
              id="planned-courses"
              onChange={(event) => setEnteredCourses(event.target.value)}
              placeholder={samplePasteText}
              value={enteredCourses}
            />
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              Users can paste comma-separated courses, newline courses, or
              Degree Works-style text.
            </p>
            <p className="mt-1 text-[12px] leading-5 text-slate-500">
              Parsed courses:{" "}
              {parsedCourseCodes.length > 0
                ? parsedCourseCodes.join(", ")
                : "none yet"}
            </p>
          </div>

          <div className="mt-5 grid gap-2">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading}
              onClick={checkEnteredCourses}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check entered courses
            </button>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-[14px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              disabled={isLoading}
              onClick={checkSamplePlan}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check sample Degree Works plan
            </button>
          </div>

          <section className="mt-6 border-t border-slate-200 pt-5">
            <div className="flex items-center gap-2">
              <FileUp aria-hidden="true" className="text-[#dd550c]" size={18} />
              <h2 className="text-[16px] font-semibold leading-6 text-slate-950">
                Upload Degree Works PDF
              </h2>
            </div>
            <div className="mt-3">
              <label
                className="text-[13px] font-semibold leading-5 text-slate-700"
                htmlFor="degreeworks-pdf"
              >
                Degree Works PDF
              </label>
              <input
                accept="application/pdf"
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                disabled={isLoading}
                id="degreeworks-pdf"
                onChange={handlePdfFileChange}
                type="file"
              />
              {selectedPdfFile ? (
                <p className="mt-2 text-[12px] leading-5 text-slate-500">
                  Selected: {selectedPdfFile.name}
                </p>
              ) : null}
              {uploadValidationError ? (
                <p className="mt-2 text-[13px] leading-5 text-orange-700">
                  {uploadValidationError}
                </p>
              ) : null}
            </div>
            <button
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isLoading}
              onClick={checkUploadedPdf}
              type="button"
            >
              {isLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check uploaded PDF
            </button>
          </section>
          </section>

          <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-[22px] font-semibold leading-8 text-slate-950">
              Software Engineering Degree Progress
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-slate-600">
              Checks the sample Degree Works plan against local Software
              Engineering degree rules. This extracted plan does not prove
              completion of every Software Engineering requirement.
            </p>
            <p className="mt-2 text-[13px] leading-5 text-slate-500">
              AP, transfer, substitutions, Degree Works hidden sections, and
              advisor-approved electives may not be captured by the simple
              parser yet.
            </p>
            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={isSoftwareEngineeringLoading}
              onClick={checkSoftwareEngineeringSamplePlan}
              type="button"
            >
              {isSoftwareEngineeringLoading ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : null}
              Check sample Degree Works plan
            </button>

            <section className="mt-6 border-t border-slate-200 pt-5">
              <div className="flex items-center gap-2">
                <FileUp
                  aria-hidden="true"
                  className="text-[#dd550c]"
                  size={18}
                />
                <h2 className="text-[16px] font-semibold leading-6 text-slate-950">
                  Upload Degree Works PDF
                </h2>
              </div>
              <div className="mt-3">
                <label
                  className="text-[13px] font-semibold leading-5 text-slate-700"
                  htmlFor="software-engineering-degreeworks-pdf"
                >
                  Software Engineering Degree Works PDF
                </label>
                <input
                  accept="application/pdf"
                  className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-700 file:mr-3 file:rounded-sm file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-slate-700 hover:file:bg-slate-200 focus:border-[#dd550c] focus:outline-none focus:ring-4 focus:ring-[#dd550c]/15"
                  disabled={isSoftwareEngineeringLoading}
                  id="software-engineering-degreeworks-pdf"
                  onChange={handleSoftwareEngineeringPdfFileChange}
                  type="file"
                />
                {selectedSoftwareEngineeringPdfFile ? (
                  <p className="mt-2 text-[12px] leading-5 text-slate-500">
                    Selected: {selectedSoftwareEngineeringPdfFile.name}
                  </p>
                ) : null}
                {softwareEngineeringUploadValidationError ? (
                  <p className="mt-2 text-[13px] leading-5 text-orange-700">
                    {softwareEngineeringUploadValidationError}
                  </p>
                ) : null}
              </div>
              <button
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#dd550c] px-4 py-2 text-center text-[14px] font-semibold leading-5 text-white transition hover:bg-[#b84300] disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={isSoftwareEngineeringLoading}
                onClick={checkSoftwareEngineeringUploadedPdf}
                type="button"
              >
                {isSoftwareEngineeringLoading ? (
                  <Loader2
                    aria-hidden="true"
                    className="animate-spin"
                    size={17}
                  />
                ) : null}
                Check uploaded PDF
              </button>
            </section>
          </section>
        </div>

        <section className="min-w-0">
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

          {result ? (
            <ResultCard result={result} />
          ) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-[14px] leading-6 text-slate-500 shadow-sm">
              Paste planned courses or run the sample Degree Works plan to see
              required courses satisfied, missing requirements, elective
              candidates, completion status, advisor verification, and notes.
            </div>
          )}

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

            {softwareEngineeringResult ? (
              <SoftwareEngineeringResultCard
                result={softwareEngineeringResult}
              />
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-[14px] leading-6 text-slate-500 shadow-sm">
                Run the Software Engineering sample check to review credit
                totals, exact required courses, alternative course groups,
                advisor-verified blocks, notes, and whether the extracted plan
                proves likely completion.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

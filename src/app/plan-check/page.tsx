"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { MouseEvent, useMemo, useState } from "react";

import { parseCourseCodes } from "@/lib/courses/course-code-parser";

type PlanCheckCourse = {
  code: string;
  title: string;
  creditHours: number;
  approvalStatus?: string;
};

type PlanCheckResult = {
  planDescription: string;
  major: string;
  totalPlannedCredits: number | null;
  requiredCoursesSatisfied: PlanCheckCourse[];
  requiredCoursesMissing: PlanCheckCourse[];
  electiveCandidatesFound: PlanCheckCourse[];
  isLikelyComplete: boolean;
  advisorVerificationRequired: boolean;
  notes: string[];
};

const planCheckEndpoint = "/api/plan/check-ai-certificate";
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
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#9b3900]">
            Plan description
          </p>
          <h2 className="mt-2 text-[21px] font-semibold leading-7 text-slate-950">
            {result.planDescription}
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[24rem]">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Major
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {result.major}
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              Total planned credits
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-5 text-slate-800">
              {result.totalPlannedCredits ?? "Not provided"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
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

export default function PlanCheckPage() {
  const [enteredCourses, setEnteredCourses] = useState("");
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parsedCourseCodes = useMemo(
    () => parseCourseCodes(enteredCourses),
    [enteredCourses],
  );

  async function runPlanCheck(request: RequestInit = {}) {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(planCheckEndpoint, request);
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

  function checkEnteredCourses(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (parsedCourseCodes.length === 0) {
      setResult(null);
      setError("Paste at least one planned course code before checking.");
      return;
    }

    void runPlanCheck({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCodes: parsedCourseCodes,
        planDescription: "Custom entered plan",
        major: "Software Engineering",
        totalPlannedCredits: null,
      }),
    });
  }

  function checkSamplePlan(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    void runPlanCheck();
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
            Back to chat
          </Link>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:py-7">
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
        </section>

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
              Checking entered courses against Auburn certificate rules...
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
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  GraduationCap,
  List,
  Loader2,
  Menu,
  MessageSquareText,
  PanelRightOpen,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { FormEvent, MouseEvent, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

import {
  cleanSourcePreview,
  formatProgramLabel,
  formatSourceTypeLabel,
  sanitizeAssistantMarkdown,
} from "@/lib/chat-presentation";
import { parseCourseCodes } from "@/lib/courses/course-code-parser";

type Role = "user" | "assistant";

type Source = {
  title: string;
  sourceType?: string;
  catalogYear?: string;
  program?: string;
  url?: string;
  lastCheckedDate?: string;
  fileName?: string;
  score?: number;
  snippet?: string;
  relevanceNote?: string;
};

type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  confidence?: "High" | "Medium" | "Low";
  advisorVerificationNote?: string;
  error?: boolean;
};

type ChatResponse = {
  answer: string;
  sources: Source[];
  confidence: "High" | "Medium" | "Low";
  advisorVerificationNote: string;
};

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

const exampleQuestions = [
  "What are the Software Engineering degree requirements?",
  "How does Computer Science differ from Software Engineering?",
  "What courses count toward the AI Engineering certificate?",
  "Which prerequisites should I verify before planning senior-year CSSE courses?",
];

const programs = [
  "Software Engineering",
  "Computer Science",
  "Artificial Intelligence Engineering certificate",
];

const advisorNote =
  "Advisor verification required: use this as preparation and verify your plan with an Auburn academic advisor.";
const planCheckEndpoint = "/api/plan/check-ai-certificate";

function confidenceClass(confidence?: ChatMessage["confidence"]) {
  if (confidence === "High") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (confidence === "Medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-orange-200 bg-orange-50 text-orange-800";
}

function sourceLabel(source: Source) {
  return [formatProgramLabel(source.program), source.catalogYear]
    .filter(Boolean)
    .join(" / ");
}

const assistantMarkdownElements = [
  "p",
  "strong",
  "ul",
  "ol",
  "li",
  "br",
  "code",
  "h2",
  "h3",
  "h4",
];

function AssistantMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      allowedElements={assistantMarkdownElements}
      components={{
        h2: ({ children: heading }) => (
          <h2 className="mt-4 text-[16px] font-semibold leading-6 text-slate-950 first:mt-0">
            {heading}
          </h2>
        ),
        h3: ({ children: heading }) => (
          <h3 className="mt-4 text-[15px] font-semibold leading-6 text-slate-950 first:mt-0">
            {heading}
          </h3>
        ),
        h4: ({ children: heading }) => (
          <h4 className="mt-3 text-[14px] font-semibold leading-6 text-slate-950 first:mt-0">
            {heading}
          </h4>
        ),
        p: ({ children: paragraph }) => (
          <p className="mt-3 whitespace-pre-wrap first:mt-0">{paragraph}</p>
        ),
        ul: ({ children: items }) => (
          <ul className="mt-3 list-disc space-y-1 pl-5 first:mt-0">{items}</ul>
        ),
        ol: ({ children: items }) => (
          <ol className="mt-3 list-decimal space-y-1 pl-5 first:mt-0">{items}</ol>
        ),
        code: ({ children: code }) => (
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.92em] text-slate-900">
            {code}
          </code>
        ),
      }}
      skipHtml
      unwrapDisallowed
    >
      {sanitizeAssistantMarkdown(children)}
    </ReactMarkdown>
  );
}

function BooleanPill({ value }: { value: boolean }) {
  return (
    <span
      className={`rounded-sm border px-2 py-0.5 text-[12px] font-semibold ${
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
    return <p className="text-[12px] leading-5 text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-1">
      {courses.map((course) => (
        <li
          className="rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-[12px] leading-5 text-slate-700"
          key={course.code}
        >
          <span className="font-semibold text-slate-950">{course.code}</span>
          <span className="text-slate-500"> - {course.title}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanCheckCard() {
  const [enteredCourses, setEnteredCourses] = useState("");
  const [result, setResult] = useState<PlanCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "The plan check could not run.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function checkSamplePlan(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    void runPlanCheck();
  }

  function checkEnteredCourses(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const courseCodes = parseCourseCodes(enteredCourses);

    if (courseCodes.length === 0) {
      setResult(null);
      setError("Enter at least one planned course code before checking.");
      return;
    }

    void runPlanCheck({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseCodes,
        planDescription: "Custom entered plan",
        major: "Software Engineering",
        totalPlannedCredits: null,
      }),
    });
  }

  return (
    <section className="rounded-xl border border-[#dd550c]/30 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_8px_22px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-[#dd550c]/25 bg-[#fff7f1] text-[#b84300]">
          <ClipboardCheck aria-hidden="true" size={17} />
        </div>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold leading-5 text-slate-950">
            Planning Hub
          </h2>
          <p className="mt-0.5 text-[12px] leading-5 text-slate-500">
            Current audits and future plans
          </p>
        </div>
      </div>

      <div className="mt-3">
        <label
          className="text-[12px] font-semibold leading-5 text-slate-700"
          htmlFor="plan-check-courses"
        >
          Enter planned courses
        </label>
        <textarea
          className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] leading-5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15"
          disabled={isLoading}
          id="plan-check-courses"
          onChange={(event) => setEnteredCourses(event.target.value)}
          placeholder="COMP 5600, COMP 5630, COMP 5130, COMP 5610"
          value={enteredCourses}
        />
      </div>

      <div className="mt-3 grid gap-2">
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-[#dd550c] px-3 py-2 text-center text-[13px] font-semibold leading-5 text-white shadow-sm transition hover:bg-[#b84300]"
          href="/plan-check"
        >
          Open Planning Hub
        </Link>
        <button
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-[13px] font-semibold leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          disabled={isLoading}
          onClick={checkSamplePlan}
          type="button"
        >
          {isLoading ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          Check sample plan
        </button>
        <button
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-[#03244d] px-3 py-2 text-center text-[13px] font-semibold leading-5 text-white transition hover:bg-[#021b3a] disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isLoading}
          onClick={checkEnteredCourses}
          type="button"
        >
          {isLoading ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : null}
          Check entered courses
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3">
          <div className="flex gap-2">
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-orange-700"
              size={16}
            />
            <p className="text-[12px] leading-5 text-orange-800">{error}</p>
          </div>
        </div>
      ) : null}

      {result ? (
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
          <div>
            <p className="text-[12px] font-semibold text-slate-500">
              Plan description
            </p>
            <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-950">
              {result.planDescription}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Major
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-800">
                {result.major}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-semibold uppercase text-slate-500">
                Credits
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-800">
                {result.totalPlannedCredits ?? "Not provided"}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-600">
              Required courses satisfied
            </p>
            <CourseList
              courses={result.requiredCoursesSatisfied}
              emptyText="No required courses found."
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-600">
              Required courses missing
            </p>
            <CourseList
              courses={result.requiredCoursesMissing}
              emptyText="No required courses missing."
            />
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-600">
              Elective candidates found
            </p>
            <CourseList
              courses={result.electiveCandidatesFound}
              emptyText="No elective candidates found."
            />
          </div>

          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-slate-700">
                Likely complete
              </p>
              <BooleanPill value={result.isLikelyComplete} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] font-semibold text-slate-700">
                Advisor verification required
              </p>
              <BooleanPill value={result.advisorVerificationRequired} />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-slate-600">
              Notes
            </p>
            <ul className="space-y-1.5">
              {result.notes.map((note) => (
                <li
                  className="text-[12px] leading-5 text-slate-600"
                  key={note}
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ProgramPanel({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[#03244d]">
            <List aria-hidden="true" size={19} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold leading-5 text-slate-950">
              Explore topics
            </p>
            <p className="text-[12px] font-medium text-slate-500">
              Programs and example questions
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <section>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Programs
          </h2>
          <div className="mt-3 space-y-2">
            {programs.map((program) => (
              <div
                className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium leading-5 text-slate-700"
                key={program}
              >
                {program}
              </div>
            ))}
          </div>
        </section>

        <PlanCheckCard />

        <section>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Ask about CSSE requirements
          </h2>
          <div className="mt-3 space-y-2">
            {exampleQuestions.map((question) => (
              <button
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-left text-[13px] leading-5 text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] focus:outline-none focus:ring-2 focus:ring-[#dd550c]/35"
                key={question}
                onClick={() => onSelect(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
          <div className="flex gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[#b84300]"
              size={18}
            />
            <p className="text-[13px] leading-5 text-slate-700">
              Verify Auburn degree plans and policy interpretations with your
              assigned academic advisor before making registration decisions.
            </p>
          </div>
        </section>
      </div>
    </aside>
  );
}

function SourcesPanel({ message }: { message?: ChatMessage }) {
  const sources = message?.sources ?? [];

  return (
    <aside className="flex h-full flex-col border-l border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-[#03244d]">
            <FileSearch aria-hidden="true" size={19} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-950">
              Sources
            </h2>
            <p className="text-[12px] font-medium text-slate-500">
              Retrieved Auburn material
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!message ? (
          <div className="rounded-md border border-dashed border-slate-300 p-4 text-[13px] leading-5 text-slate-500">
            Sources will appear after an assistant answer uses retrieved Auburn
            material.
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-md border border-orange-200 bg-orange-50 p-4">
            <div className="flex gap-3">
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-orange-700"
                size={18}
              />
              <div>
                <p className="text-[13px] font-semibold text-orange-900">
                  No retrieved Auburn source found
                </p>
                <p className="mt-1 text-[13px] leading-5 text-orange-800">
                  The answer should be treated as low confidence until Auburn
                  source materials are uploaded and retrieved.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <article
                className="rounded-md border border-slate-200 bg-slate-50 p-3"
                key={`${source.fileName ?? source.title}-${index}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[13px] font-semibold leading-5 text-slate-950">
                    {source.url ? (
                      <a
                        className="hover:text-[#dd550c]"
                        href={source.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                  </h3>
                  {typeof source.score === "number" ? (
                    <span className="shrink-0 rounded-sm bg-white px-2 py-1 text-[11px] font-semibold text-slate-500">
                      {Math.round(source.score * 100)}%
                    </span>
                  ) : null}
                </div>
                {source.sourceType ? (
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#03244d]">
                    {formatSourceTypeLabel(source.sourceType)}
                  </p>
                ) : null}
                {sourceLabel(source) ? (
                  <p className="mt-1 text-[12px] font-medium text-slate-500">
                    {sourceLabel(source)}
                  </p>
                ) : null}
                {source.fileName ? (
                  <p className="mt-2 break-all text-[12px] text-slate-500">
                    Local source: {source.fileName}
                  </p>
                ) : null}
                {source.url ? (
                  <a
                    className="mt-2 inline-flex text-[12px] font-semibold text-[#03244d] hover:text-[#dd550c]"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open public source
                  </a>
                ) : null}
                <p className="mt-3 line-clamp-5 text-[12px] leading-5 text-slate-600">
                  {cleanSourcePreview(source.snippet)}
                </p>
                {source.relevanceNote ? (
                  <p className="mt-3 rounded-sm border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-800">
                    {source.relevanceNote}
                  </p>
                ) : null}
                {source.lastCheckedDate ? (
                  <p className="mt-3 text-[11px] font-medium text-slate-500">
                    Last checked {source.lastCheckedDate}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[min(82%,42rem)] rounded-md bg-[#03244d] px-3.5 py-3 text-[14px] leading-6 text-white shadow-sm sm:px-4"
            : "max-w-[min(92%,46rem)] rounded-md border border-slate-200 bg-white px-3.5 py-3 text-[14px] leading-6 text-slate-800 shadow-sm sm:px-4"
        }
      >
        {!isUser ? (
          <div className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#03244d]">
            <BookOpen aria-hidden="true" size={15} />
            Auburn Academic Planner
          </div>
        ) : null}
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <AssistantMarkdown>{message.content}</AssistantMarkdown>
        )}

        {!isUser ? (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-sm border px-2.5 py-1 text-[12px] font-semibold ${confidenceClass(
                  message.confidence,
                )}`}
              >
                Confidence: {message.confidence ?? "Low"}
              </span>
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-600">
                Sources used: {message.sources?.length ?? 0}
              </span>
            </div>
            <div className="rounded-md border border-[#dd550c]/25 bg-[#fff7f1] p-3">
              <div className="flex gap-2">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#b84300]"
                  size={16}
                />
                <p className="text-[12px] leading-5 text-slate-700">
                  {message.advisorVerificationNote ?? advisorNote}
                </p>
              </div>
            </div>
            {message.sources && message.sources.length > 0 ? (
              <div className="space-y-1">
                {message.sources.map((source, index) => (
                  <p
                    className="text-[12px] leading-5 text-slate-600"
                    key={`${source.fileName ?? source.title}-${index}`}
                  >
                    {index + 1}. {source.title}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[12px] font-medium text-orange-800">
                No retrieved Auburn source found.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MobileDrawer({
  children,
  side = "left",
  title,
  onClose,
}: {
  children: React.ReactNode;
  side?: "left" | "right";
  title: string;
  onClose: () => void;
}) {
  const visibilityClass = side === "right" ? "xl:hidden" : "lg:hidden";

  return (
    <div className={`fixed inset-0 z-50 bg-slate-950/35 ${visibilityClass}`}>
      <div
        className={`absolute inset-y-0 flex w-[min(88vw,360px)] flex-col bg-white shadow-xl ${
          side === "right" ? "right-0" : "left-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <p className="text-[14px] font-semibold text-slate-950">{title}</p>
          <button
            aria-label="Close drawer"
            className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function ChatWorkspace() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const latestAssistantMessage = useMemo(
    () => messages.findLast((message) => message.role === "assistant"),
    [messages],
  );

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const payload = (await response.json()) as Partial<ChatResponse> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The assistant could not respond.");
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            payload.answer ??
            "The retrieved Auburn sources did not provide enough information to answer confidently.",
          sources: payload.sources ?? [],
          confidence: payload.confidence ?? "Low",
          advisorVerificationNote:
            payload.advisorVerificationNote ?? advisorNote,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "The assistant could not respond.",
          sources: [],
          confidence: "Low",
          advisorVerificationNote: advisorNote,
          error: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(draft);
  }

  return (
    <main className="flex h-dvh max-h-dvh w-full max-w-full flex-col overflow-hidden bg-slate-100 text-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between bg-[#03244d] px-3 text-white shadow-sm sm:px-4 lg:h-16 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-label="Open program menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/20 text-white lg:hidden"
            onClick={() => setLeftOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" size={19} />
          </button>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-white text-[#03244d]">
            <GraduationCap aria-hidden="true" size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-5 sm:text-[16px]">
              Auburn Academic Planner
            </h1>
            <p className="truncate text-[12px] text-white/70 lg:hidden">
              Ask about CSSE requirements
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            className="hidden h-9 items-center rounded-md border border-white/20 px-3 text-[13px] font-semibold text-white transition hover:bg-white/10 sm:inline-flex"
            href="/rule-audit"
          >
            Rule Audit
          </Link>
          <Link
            className="inline-flex h-9 items-center rounded-lg bg-[#dd550c] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#b84300]"
            href="/plan-check"
          >
            Planning Hub
          </Link>
          <div className="hidden items-center gap-2 text-[13px] font-medium text-white/90 xl:flex">
            <MessageSquareText aria-hidden="true" size={18} />
            CSSE Academic Planning Assistant
          </div>
          <button
            aria-label="Open sources"
            className="grid h-9 w-9 place-items-center rounded-md border border-white/20 text-white xl:hidden"
            onClick={() => setSourcesOpen(true)}
            type="button"
          >
            <PanelRightOpen aria-hidden="true" size={19} />
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[256px_minmax(0,1fr)] xl:grid-cols-[256px_minmax(0,1fr)_320px]">
        <div className="hidden min-h-0 lg:block">
          <ProgramPanel
            onSelect={(question) => void submitQuestion(question)}
          />
        </div>

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div className="hidden h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:flex">
            <p className="text-[13px] font-medium text-slate-500">
              Ask about CSSE requirements
            </p>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 px-3 text-[13px] font-semibold text-slate-700 transition hover:border-[#dd550c] hover:text-[#03244d] xl:hidden"
              onClick={() => setSourcesOpen(true)}
              type="button"
            >
              <PanelRightOpen aria-hidden="true" size={16} />
              Sources
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4 lg:px-5">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
              {messages.length === 0 ? (
                <section className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_rgba(15,23,42,0.04)] sm:p-8">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#03244d] text-white">
                    <MessageSquareText aria-hidden="true" size={23} />
                  </div>
                  <h2 className="mt-4 text-[20px] font-semibold leading-7 text-slate-950 sm:text-[22px]">
                    Source-grounded advising conversations
                  </h2>
                  <p className="mx-auto mt-2 max-w-2xl text-[14px] leading-6 text-slate-600">
                    Ask about Auburn Software Engineering, Computer Science, or
                    the Artificial Intelligence Engineering certificate.
                    Answers include retrieved sources, confidence, and advisor
                    verification guidance.
                  </p>
                  <div className="mx-auto mt-5 flex max-w-xl gap-3 rounded-lg border border-[#03244d]/15 bg-[#eef4fa] p-3 text-left text-[13px] leading-5 text-[#03244d]">
                    <ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
                    <p>
                      Chat provides source-grounded explanations. Use{" "}
                      <Link className="font-semibold text-[#b84300] underline underline-offset-2" href="/plan-check">
                        Planning Hub
                      </Link>{" "}
                      for Current Progress audits, Planned Path validation, and deterministic requirement reports.
                    </p>
                  </div>
                </section>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="flex max-w-[92%] items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-[14px] text-slate-600 shadow-sm">
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin text-[#dd550c]"
                      size={18}
                    />
                    Searching uploaded Auburn sources...
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-4 lg:px-5">
            <form className="mx-auto flex w-full max-w-3xl gap-2 sm:gap-3" onSubmit={handleSubmit}>
              <label className="sr-only" htmlFor="chat-input">
                Ask about CSSE requirements
              </label>
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#dd550c] focus:ring-4 focus:ring-[#dd550c]/15 sm:h-12 sm:px-4"
                disabled={isLoading}
                id="chat-input"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask about CSSE requirements..."
                type="text"
                value={draft}
              />
              <button
                className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#dd550c] text-white transition hover:bg-[#c54908] disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-12 sm:w-12"
                disabled={isLoading || !draft.trim()}
                type="submit"
              >
                <span className="sr-only">Send question</span>
                <Send aria-hidden="true" size={18} />
              </button>
            </form>
          </div>
        </section>

        <div className="hidden min-h-0 xl:block">
          <SourcesPanel message={latestAssistantMessage} />
        </div>
      </div>

      {leftOpen ? (
        <MobileDrawer title="Programs" onClose={() => setLeftOpen(false)}>
          <ProgramPanel
            onSelect={(question) => {
              setLeftOpen(false);
              void submitQuestion(question);
            }}
          />
        </MobileDrawer>
      ) : null}

      {sourcesOpen ? (
        <MobileDrawer
          side="right"
          title="Sources"
          onClose={() => setSourcesOpen(false)}
        >
          <SourcesPanel message={latestAssistantMessage} />
        </MobileDrawer>
      ) : null}
    </main>
  );
}

export const SOURCE_PREVIEW_FALLBACK =
  "Source metadata available. Open the source file for full context.";

export const SOURCE_RELEVANCE_FALLBACK_NOTE =
  "This was the closest retrieved source, but it may not directly match the question.";

export type PresentableChatSource = {
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

const DEGREE_WORKS_INTENT =
  /\bdegree\s*works\b|\bmy\s+(?:degree\s+)?plan\b|\bsample\s+plan\b|\buploaded\s+(?:pdf|document|file)\b|\bdashboard\b|\bparsed\s+courses?\b|\bcertificate\s+courses?\s+in\s+my\s+plan\b/i;

const PROGRAM_LABELS: Record<string, string> = {
  software_engineering: "Software Engineering",
  computer_science: "Computer Science",
  ai_engineering_certificate: "AI Engineering Certificate",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  bulletin: "Bulletin",
  flowchart: "Flowchart",
  degreeworks_sample: "Degree Works Sample",
  certificate: "Certificate page",
};

function decodeCommonHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&quot;": '"',
    "&#39;": "'",
  };

  return value.replace(
    /&(amp|gt|lt|nbsp|quot|#39);/gi,
    (entity) => entities[entity.toLowerCase()] ?? " ",
  );
}

export function sanitizeAssistantMarkdown(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .trim();
}

export function cleanSourcePreview(value?: string, maxLength = 240) {
  if (!value) {
    return SOURCE_PREVIEW_FALLBACK;
  }

  const cleaned = decodeCommonHtmlEntities(value)
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/==+\s*(?:start|end)\s+of\s+(?:pdf|ocr|page[^=]*)==+/gi, " ")
    .replace(/(?:^|\s)(?:[-=]{2,}\s*)?page\s+\d+(?:\s+of\s+\d+)?(?:\s*[-=]{2,})?(?=\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? [];
  const looksLikeMarkup = /<\/?\w|\{\s*[\w-]+\s*:|\b(?:function|DOCTYPE)\b/i.test(
    cleaned,
  );

  if (cleaned.length < 40 || words.length < 7 || looksLikeMarkup) {
    return SOURCE_PREVIEW_FALLBACK;
  }

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const shortened = cleaned.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened}\u2026`;
}

export function formatProgramLabel(program?: string) {
  if (!program) {
    return undefined;
  }

  return PROGRAM_LABELS[program] ?? program.replaceAll("_", " ");
}

export function formatSourceTypeLabel(sourceType?: string) {
  if (!sourceType) {
    return undefined;
  }

  return SOURCE_TYPE_LABELS[sourceType] ?? sourceType.replaceAll("_", " ");
}

function isDegreeWorksSource(source: PresentableChatSource) {
  return (
    source.sourceType === "degreeworks_sample" ||
    /degree\s*works|degreeworks/i.test(`${source.title} ${source.fileName ?? ""}`)
  );
}

function programsMentionedInQuestion(question: string) {
  const programs: string[] = [];
  const signals: Array<[RegExp, string]> = [
    [/\bsoftware\s+engineering\b|\bse\s+degree\b/i, "software_engineering"],
    [/\bcomputer\s+science\b|\bcs\s+degree\b/i, "computer_science"],
    [
      /\bai\s+(?:engineering\s+)?certificate\b|\bartificial\s+intelligence\s+engineering\s+certificate\b/i,
      "ai_engineering_certificate",
    ],
  ];

  for (const [pattern, program] of signals) {
    if (pattern.test(question)) {
      programs.push(program);
    }
  }

  return programs;
}

function relevanceScore(question: string, source: PresentableChatSource) {
  const normalizedQuestion = question.toLowerCase();
  const normalizedSource = `${source.title} ${source.program ?? ""} ${source.sourceType ?? ""}`.toLowerCase();
  let score = typeof source.score === "number" ? source.score : 0;

  const programSignals: Array<[RegExp, string]> = [
    [/\bsoftware\s+engineering\b|\bse\s+degree\b/, "software_engineering"],
    [/\bcomputer\s+science\b|\bcs\s+degree\b/, "computer_science"],
    [/\bai\s+(?:engineering\s+)?certificate\b|\bartificial\s+intelligence\s+engineering\s+certificate\b/, "ai_engineering_certificate"],
  ];

  for (const [pattern, program] of programSignals) {
    if (pattern.test(normalizedQuestion) && source.program === program) {
      score += 100;
    }
  }

  if (source.sourceType === "bulletin") score += 35;
  if (source.sourceType === "certificate") score += 30;
  if (source.sourceType === "flowchart") score += 20;

  if (DEGREE_WORKS_INTENT.test(question) && isDegreeWorksSource(source)) {
    score += 45;
  }
  if (/\bdashboard\b/i.test(question) && /dashboard/.test(normalizedSource)) {
    score += 60;
  }
  if (/\b(?:sample\s+)?plan\b/i.test(question) && /plan/.test(normalizedSource)) {
    score += 50;
  }

  return score;
}

export function selectDisplaySources(
  question: string,
  sources: PresentableChatSource[],
  limit = 4,
) {
  if (sources.length === 0) {
    return [];
  }

  const allowsDegreeWorks = DEGREE_WORKS_INTENT.test(question);
  const sourceTypeEligible = allowsDegreeWorks
    ? sources
    : sources.filter((source) => !isDegreeWorksSource(source));
  const mentionedPrograms = programsMentionedInQuestion(question);
  const eligible =
    mentionedPrograms.length === 1
      ? sourceTypeEligible.filter(
          (source) =>
            !source.program || source.program === mentionedPrograms[0],
        )
      : sourceTypeEligible;

  if (eligible.length === 0) {
    const fallback = sources
      .map((source, index) => ({ source, index, score: relevanceScore(question, source) }))
      .sort((left, right) => right.score - left.score || left.index - right.index)[0]
      .source;

    return [
      {
        ...fallback,
        snippet: cleanSourcePreview(fallback.snippet),
        relevanceNote: SOURCE_RELEVANCE_FALLBACK_NOTE,
      },
    ];
  }

  return eligible
    .map((source, index) => ({ source, index, score: relevanceScore(question, source) }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ source }) => ({
      ...source,
      snippet: cleanSourcePreview(source.snippet),
    }));
}

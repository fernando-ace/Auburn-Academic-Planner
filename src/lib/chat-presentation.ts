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
  bulletin_major: "Bulletin major page",
  flowchart: "Flowchart",
  degreeworks_sample: "Degree Works Sample",
  certificate: "Certificate page",
  advising: "Advising page",
  ap_credit: "AP and credit table",
  core_curriculum: "Core curriculum",
  course_catalog: "Course catalog",
  registrar: "Registrar page",
  transfer_credit: "Transfer credit policy",
};

const TRANSFER_CREDIT_INTENT =
  /\btransfer\s+credits?\b|\btransfer\b.*\bcredits?\b|\bcredits?\b.*\btransfer\b|\bcredit\s+tables?\b|\bap\s+credit\b/i;

const CORE_CURRICULUM_INTENT =
  /\bcore\s+curriculum\b|\bgeneral\s+education\b|\bcore\s+requirements?\b/i;

const MAJOR_REQUIREMENT_INTENT =
  /\b(?:requirements?|requires?|require)\b.*\b(?:major|program|degree)\b|\b(?:requirements?|requires?|require)\b.*\bfor\b|\bmajor\b.*\b(?:requirements?|requires?|require)\b|\bprogram\b.*\b(?:requirements?|requires?|require)\b/i;

const MAJOR_QUERY_STOP_WORDS = new Set([
  "auburn",
  "degree",
  "does",
  "for",
  "major",
  "program",
  "require",
  "required",
  "requirement",
  "requirements",
  "requires",
  "the",
  "what",
  "work",
]);

const BROAD_POLICY_SOURCE_TYPES = new Set([
  "advising",
  "ap_credit",
  "core_curriculum",
  "course_catalog",
  "registrar",
  "transfer_credit",
]);

const TRANSFER_SOURCE_TYPES = new Set([
  "ap_credit",
  "registrar",
  "transfer_credit",
]);

const CORE_SOURCE_TYPES = new Set([
  "advising",
  "core_curriculum",
  "course_catalog",
  "registrar",
]);

function decodeCommonHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&gt;": ">",
    "&lt;": "<",
    "&nbsp;": " ",
    "&quot;": '"',
    "&#39;": "'",
    "&mdash;": "-",
    "&ndash;": "-",
  };

  return value.replace(
    /&(amp|gt|lt|nbsp|quot|#39);/gi,
    (entity) => entities[entity.toLowerCase()] ?? " ",
  ).replace(/&#(?:x[0-9a-f]+|\d+);/gi, " ");
}

function stripHtmlExtractionFragments(value: string) {
  return value
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(
      /(?:^|\s)[a-z][a-z0-9:-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s=>]+)\s*>?/gi,
      " ",
    )
    .replace(/<\/?|>/g, " ")
    .replace(/\s*&+\s*/g, " ");
}

function compactText(value: string) {
  return normalizeText(value).replace(/\s+/g, "");
}

function normalizeText(value: string) {
  return decodeCommonHtmlEntities(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, " ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizedTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1 && !MAJOR_QUERY_STOP_WORDS.has(token));
}

function sourceSearchText(source: PresentableChatSource) {
  return `${source.title} ${source.program ?? ""} ${source.fileName ?? ""}`;
}

function isBulletinMajorSource(source: PresentableChatSource) {
  return source.sourceType === "bulletin_major";
}

function isBroadPolicySource(source: PresentableChatSource) {
  return source.sourceType ? BROAD_POLICY_SOURCE_TYPES.has(source.sourceType) : false;
}

function titleBase(title: string) {
  return normalizeText(title.split(/\s[-\u2010-\u2015]\s|:/)[0] ?? title);
}

function majorQuestionCandidates(question: string) {
  if (!MAJOR_REQUIREMENT_INTENT.test(question)) {
    return [];
  }

  const candidates: string[] = [];
  const patterns = [
    /\brequirements?\s+for\s+(?:the\s+)?(.+?)(?:\s+(?:major|program|degree))?(?:\?|$)/i,
    /\bwhat\s+are\s+the\s+requirements?\s+for\s+(?:the\s+)?(.+?)(?:\s+(?:major|program|degree))?(?:\?|$)/i,
    /\bwhat\s+does\s+(?:the\s+)?(.+?)\s+(?:major|program|degree)\s+require\b/i,
    /\b(?:the\s+)?(.+?)\s+(?:major|program|degree)\s+requirements?\b/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    const candidate = normalizeText(match?.[1] ?? "");
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return Array.from(new Set(candidates));
}

function majorSourceMatchScore(
  question: string,
  source: PresentableChatSource,
  candidates: string[],
) {
  if (!isBulletinMajorSource(source)) {
    return 0;
  }

  const sourceText = normalizeText(sourceSearchText(source));
  const sourceCompact = compactText(sourceSearchText(source));
  const normalizedTitle = normalizeText(source.title);
  const normalizedTitleBase = titleBase(source.title);
  const questionText = normalizeText(question);
  const questionCompact = compactText(question);
  const queryTokens = normalizedTokens(question);

  for (const candidate of candidates) {
    const candidateCompact = compactText(candidate);
    if (!candidateCompact) {
      continue;
    }

    if (normalizedTitle === candidate || normalizedTitleBase === candidate) {
      return 120;
    }

    if (
      normalizedTitle.startsWith(`${candidate} `) ||
      normalizedTitleBase.startsWith(`${candidate} `)
    ) {
      return 105;
    }

    if (sourceText.includes(candidate) || sourceCompact.includes(candidateCompact)) {
      return 95;
    }
  }

  if (
    queryTokens.some(
      (token) =>
        normalizedTitle === token ||
        normalizedTitleBase === token ||
        normalizedTitle.startsWith(`${token} `) ||
        sourceText.includes(` ${token} `) ||
        sourceCompact.includes(token),
    )
  ) {
    return 80;
  }

  if (
    normalizedTitle.length > 0 &&
    (questionText.includes(normalizedTitle) ||
      questionCompact.includes(compactText(normalizedTitleBase)))
  ) {
    return 80;
  }

  return 0;
}

function filterMajorSpecificSources(
  question: string,
  sources: PresentableChatSource[],
) {
  const candidates = majorQuestionCandidates(question);
  if (candidates.length === 0) {
    return null;
  }

  const scoredSources = sources.map((source, index) => ({
    source,
    index,
    majorScore: majorSourceMatchScore(question, source, candidates),
  }));
  const bestMajorScore = Math.max(...scoredSources.map((item) => item.majorScore));

  if (bestMajorScore < 80) {
    return null;
  }

  return scoredSources
    .filter(
      ({ source, majorScore }) =>
        majorScore > 0 || (isBroadPolicySource(source) && !isBulletinMajorSource(source)),
    )
    .map(({ source, index, majorScore }) => ({
      source,
      index,
      score: relevanceScore(question, source) + majorScore,
    }));
}

function filterBroadTopicSources(
  question: string,
  sources: PresentableChatSource[],
) {
  const sourceTypes = CORE_CURRICULUM_INTENT.test(question)
    ? CORE_SOURCE_TYPES
    : TRANSFER_CREDIT_INTENT.test(question)
      ? TRANSFER_SOURCE_TYPES
      : null;

  if (!sourceTypes) {
    return null;
  }

  const broadSources = sources.filter(
    (source) => source.sourceType && sourceTypes.has(source.sourceType),
  );

  return broadSources.length > 0 ? broadSources : null;
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

  const rawSnippetLooksBroken =
    /<(?:table|tbody|thead|tr|td|th)\b|<\/(?:table|tbody|thead|tr|td|th)>/i.test(value) ||
    /(?:^|\s)(?:rowspan|colspan|class|style|onclick|href|aria-[\w-]+)\s*=/i.test(value);
  const cleaned = stripHtmlExtractionFragments(decodeCommonHtmlEntities(value))
    .replace(/==+\s*(?:start|end)\s+of\s+(?:pdf|ocr|page[^=]*)==+/gi, " ")
    .replace(/(?:^|\s)(?:[-=]{2,}\s*)?page\s+\d+(?:\s+of\s+\d+)?(?:\s*[-=]{2,})?(?=\s|$)/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.match(/[A-Za-z0-9][A-Za-z0-9'-]*/g) ?? [];
  const looksLikeMarkup = /<\/?\w|\{\s*[\w-]+\s*:|\b(?:function|DOCTYPE)\b/i.test(
    cleaned,
  );

  if (rawSnippetLooksBroken && (words.length < 7 || looksLikeMarkup)) {
    return SOURCE_PREVIEW_FALLBACK;
  }

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
  if (source.sourceType === "bulletin_major") score += 35;
  if (source.sourceType === "certificate") score += 30;
  if (source.sourceType === "flowchart") score += 20;
  if (source.sourceType === "registrar") score += 20;
  if (source.sourceType === "advising") score += 20;
  if (source.sourceType === "course_catalog") score += 15;
  if (source.sourceType === "core_curriculum") score += 15;

  if (DEGREE_WORKS_INTENT.test(question) && isDegreeWorksSource(source)) {
    score += 45;
  }
  if (TRANSFER_CREDIT_INTENT.test(question)) {
    if (source.sourceType === "transfer_credit") score += 90;
    if (source.sourceType === "ap_credit") score += 55;
    if (/transfer\s+credit/i.test(normalizedSource)) score += 35;
  }
  if (CORE_CURRICULUM_INTENT.test(question)) {
    if (source.sourceType === "core_curriculum") score += 90;
    if (/core\s+curriculum|general\s+education/i.test(normalizedSource)) score += 35;
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
  const broadTopicSources = filterBroadTopicSources(question, eligible);
  const majorSpecificSources = broadTopicSources
    ? null
    : filterMajorSpecificSources(question, eligible);
  const displayEligible = broadTopicSources ?? eligible;

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

  return (majorSpecificSources ?? displayEligible.map((source, index) => ({
    source,
    index,
    score: relevanceScore(question, source),
  })))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, limit)
    .map(({ source }) => ({
      ...source,
      snippet: cleanSourcePreview(source.snippet),
    }));
}

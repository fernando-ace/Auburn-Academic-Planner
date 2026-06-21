import { createRequire } from "node:module";

import { GoogleGenAI, type Content, type GroundingChunk } from "@google/genai";

import { selectDisplaySources } from "./chat-presentation.ts";
import { getGeminiModel } from "./gemini-config.ts";

const require = createRequire(import.meta.url);
const curatedManifest = require(
  "../../sources/auburn/curated/manifest.json",
) as RawManifestSource[];

export type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ManifestSource = {
  id: string;
  title: string;
  type: string;
  catalogYear?: string;
  program?: string;
  url?: string;
  lastChecked?: string;
  fileName: string;
};

type RawManifestSource = {
  id?: unknown;
  title?: unknown;
  type?: unknown;
  catalogYear?: unknown;
  program?: unknown;
  url?: unknown;
  lastChecked?: unknown;
  seedLastChecked?: unknown;
  fetchedAt?: unknown;
  fileName: string;
};

export type AuburnSource = {
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

export type ModelAnswer = {
  answer: string;
  sources: AuburnSource[];
  confidence: "High" | "Medium" | "Low";
  advisorVerificationNote: string;
};

export type AuburnRagResult = ModelAnswer & {
  sourceTitles: string[];
  retrievalContext: RetrievalContext;
};

export type GeminiRagConfig = {
  apiKey: string;
  fileSearchStoreName: string;
};

const SYSTEM_INSTRUCTIONS = `
You are Auburn Academic Planner, an academic planning assistant for Auburn students.

Answer questions from the curated Auburn academic sources.

Grounding rules:
- For degree requirements, prerequisites, catalog rules, certificate requirements, course lists, credit counts, advising rules, or policy-like questions, answer only from retrieved Auburn sources.
- If retrieved Auburn sources are missing or insufficient, say that the retrieved sources do not contain enough information to answer confidently.
- Do not use general knowledge to fill in Auburn degree requirements.
- Do not invent citations, URLs, catalog years, or program metadata.
- Cite only retrieved File Search chunks. If the named source is not retrieved, say the matching file was not retrieved and do not infer from memory.

Product boundaries:
- You do not replace academic advisors.
- Do not claim to register students, change schedules, approve plans, or make official determinations.
- Use language like academic planning assistant, advisor prep, and verify with your advisor.

Return a concise, readable Markdown answer for the student. Use short headings only when useful and bullets or numbered lists for requirements. Do not return JSON, markdown tables, raw HTML, model-written citations, or raw source excerpts.
End the answer with a brief reminder to verify degree requirements and planning decisions with an Auburn academic advisor.
The server will attach retrieved sources, confidence, and advisor verification metadata separately.
`;

const FALLBACK_ADVISOR_NOTE =
  "Advisor verification required: use this as preparation and verify your plan with an Auburn academic advisor.";

const NO_RETRIEVAL_ANSWER =
  "The Gemini File Search tool did not return Auburn source material for this question, so I cannot answer it confidently from the uploaded Auburn sources.";

const typedManifest = curatedManifest
  .map(normalizeManifestSource)
  .filter((source): source is ManifestSource => source !== null);

export type RetrievalContext = {
  userQuestion: string;
  expandedQuery: string;
  expectedSources: ManifestSource[];
};

function isIncomingMessage(value: unknown): value is IncomingMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.role === "user" || candidate.role === "assistant") &&
    typeof candidate.content === "string" &&
    candidate.content.trim().length > 0
  );
}

export function parseChatRequestBody(value: unknown): IncomingMessage[] | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.messages)) {
    return null;
  }

  const messages = candidate.messages.filter(isIncomingMessage).slice(-12);
  return messages.length > 0 ? messages : null;
}

function sourceById(id: string) {
  return typedManifest.find((source) => source.id === id);
}

function includesPattern(value: string, pattern: RegExp) {
  return pattern.test(value);
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeManifestSource(source: RawManifestSource): ManifestSource | null {
  const id = stringValue(source.id);
  const title = stringValue(source.title);
  const type = stringValue(source.type);
  const fileName = stringValue(source.fileName);

  if (!id || !title || !type || !fileName) {
    return null;
  }

  return {
    id,
    title,
    type,
    catalogYear: stringValue(source.catalogYear),
    program: stringValue(source.program),
    url: stringValue(source.url),
    lastChecked:
      stringValue(source.lastChecked) ??
      stringValue(source.seedLastChecked) ??
      stringValue(source.fetchedAt),
    fileName,
  };
}

function latestUserQuestion(messages: IncomingMessage[]) {
  return [...messages]
    .reverse()
    .find((message) => message.role === "user")
    ?.content.trim();
}

function buildRetrievalContext(messages: IncomingMessage[]): RetrievalContext {
  const userQuestion = latestUserQuestion(messages) ?? messages.at(-1)?.content.trim() ?? "";
  const lowerQuestion = userQuestion.toLowerCase();
  const expansions: string[] = [userQuestion];
  const expectedSources: ManifestSource[] = [];

  const addSource = (id: string) => {
    const source = sourceById(id);
    if (source && !expectedSources.some((item) => item.id === source.id)) {
      expectedSources.push(source);
    }
  };

  if (
    includesPattern(
      lowerQuestion,
      /\bdegree\s*works\b|\bdegreeworks\b|\bwhere\b.*\b(?:check|find|access|see)\b.*\bdegree\s*works\b/,
    )
  ) {
    addSource("auburn-registrar-degreeworks");
    expansions.push(
      "DegreeWorks",
      "Auburn Registrar DegreeWorks",
      "auburn/curated/auburn-registrar-degreeworks.html",
      "where students check Degree Works",
      "advisor verification",
    );
  }

  if (
    includesPattern(
      lowerQuestion,
      /\btransfer\s+credit\b|\btransfer\s+credits\b|\btransfer\b.*\bcredit\b|\bcredit\s+tables?\b|\bap\s+credit\b/,
    )
  ) {
    addSource("auburn-transfer-credit-policy");
    addSource("auburn-pathways-transfer-credit");
    addSource("auburn-registrar-credit-tables");
    expansions.push(
      "Auburn transfer credit policy",
      "Undergraduate Transfer Credit Policy",
      "Transfer Credit",
      "Registrar Credit Tables",
      "auburn/curated/auburn-transfer-credit-policy.html",
      "auburn/curated/auburn-pathways-transfer-credit.html",
      "auburn/curated/auburn-registrar-credit-tables.html",
    );
  }

  const expandedQuery = uniqueStrings(expansions).join("; ");
  return {
    userQuestion,
    expandedQuery,
    expectedSources,
  };
}

function retrievalPrompt(context: RetrievalContext) {
  const sourceInstruction =
    context.expectedSources.length > 0
      ? `Named/relevant source files to retrieve and cite: ${context.expectedSources
          .map((source) => `${source.title} (${source.fileName})`)
          .join(", ")}.`
      : "Search the uploaded Auburn sources for the most relevant grounding chunks.";

  return [
    `Current user question to answer: ${context.userQuestion}`,
    sourceInstruction,
    `Expanded retrieval query for File Search only: ${context.expandedQuery}`,
    "Use the expanded query only to improve retrieval. Do not treat expansion terms as facts unless retrieved source chunks support them.",
    "If File Search does not retrieve the named source or relevant Auburn source chunks, say the matching file was not retrieved and do not answer from memory.",
  ]
    .filter(Boolean)
    .join("\n");
}

function toGeminiContents(
  messages: IncomingMessage[],
  retrievalContext: RetrievalContext,
): Content[] {
  const latestUserIndex = messages.findLastIndex(
    (message) => message.role === "user",
  );

  return messages.map((message, index) => {
    const isLatestUserMessage = index === latestUserIndex;

    return {
      role: message.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: isLatestUserMessage ? retrievalPrompt(retrievalContext) : message.content,
        },
      ],
    };
  });
}

function metadataValue(
  metadata: NonNullable<
    NonNullable<GroundingChunk["retrievedContext"]>["customMetadata"]
  >,
  key: string,
) {
  const entry = metadata.find((item) => item.key === key);
  return entry?.stringValue ?? entry?.stringListValue?.values?.[0];
}

function findManifestSourceFromChunk(chunk: GroundingChunk) {
  const context = chunk.retrievedContext;
  const metadata = context?.customMetadata ?? [];
  const sourceId = metadataValue(metadata, "id");
  const fileName = metadataValue(metadata, "fileName");
  const title = context?.title;

  return typedManifest.find((source) => {
    return (
      source.id === sourceId ||
      source.fileName === fileName ||
      source.title === title
    );
  });
}

function sourceFromManifest(
  source: ManifestSource,
  chunk: GroundingChunk,
): AuburnSource {
  const context = chunk.retrievedContext;
  return {
    title: source.title,
    sourceType: source.type,
    catalogYear: source.catalogYear,
    program: source.program,
    url: source.url || context?.uri,
    lastCheckedDate: source.lastChecked,
    fileName: source.fileName,
    snippet: context?.text ? context.text.slice(0, 420) : undefined,
  };
}

function sourceFromChunk(chunk: GroundingChunk): AuburnSource | null {
  const context = chunk.retrievedContext;
  if (!context) {
    return null;
  }

  const manifestSource = findManifestSourceFromChunk(chunk);
  if (manifestSource) {
    return sourceFromManifest(manifestSource, chunk);
  }

  if (!context.title && !context.text) {
    return null;
  }

  return {
    title: context.title ?? "Retrieved Auburn source",
    url: context.uri,
    snippet: context.text ? context.text.slice(0, 420) : undefined,
  };
}

function extractGroundedSources(response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>) {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: AuburnSource[] = [];

  for (const chunk of chunks) {
    const source = sourceFromChunk(chunk);
    if (!source) {
      continue;
    }

    const key = source.fileName ?? source.url ?? source.title;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    sources.push(source);
  }

  return sources;
}

function extractGroundingSourceTitles(
  response: Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>,
) {
  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

  return uniqueStrings(
    chunks.map((chunk) => {
      const metadata = chunk.retrievedContext?.customMetadata ?? [];
      return (
        metadataValue(metadata, "title") ??
        chunk.retrievedContext?.title ??
        metadataValue(metadata, "fileName") ??
        "Untitled retrieved source"
      );
    }),
  );
}

function noRetrievalAnswer(retrievalContext: RetrievalContext) {
  if (retrievalContext.expectedSources.length === 0) {
    return NO_RETRIEVAL_ANSWER;
  }

  const expectedTitles = retrievalContext.expectedSources
    .map((source) => `${source.title} (${source.fileName})`)
    .join(", ");

  return `Gemini File Search did not return grounding metadata for ${expectedTitles}, so I cannot answer this document-specific question confidently. The matching file was not retrieved from the uploaded Auburn sources.`;
}

function buildModelAnswer(
  outputText: string,
  retrievedSources: AuburnSource[],
  retrievalContext: RetrievalContext,
): ModelAnswer {
  const answer = outputText.trim();

  if (retrievedSources.length === 0) {
    return {
      answer: noRetrievalAnswer(retrievalContext),
      sources: [],
      confidence: "Low",
      advisorVerificationNote: FALLBACK_ADVISOR_NOTE,
    };
  }

  const displaySources = selectDisplaySources(
    retrievalContext.userQuestion,
    retrievedSources,
  );

  return {
    answer:
      answer ||
      "The retrieved Auburn sources did not provide enough information to answer this question confidently.",
    sources: displaySources,
    confidence: "Medium",
    advisorVerificationNote: FALLBACK_ADVISOR_NOTE,
  };
}

export function logRetrievalDebug(
  retrievalContext: RetrievalContext,
  sourceTitles: string[],
) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[chat] user question:", retrievalContext.userQuestion);
  console.info("[chat] expanded retrieval query:", retrievalContext.expandedQuery);
  console.info(
    "[chat] grounding source titles:",
    sourceTitles.length > 0 ? sourceTitles : [],
  );
}

export async function answerAuburnRagQuestion(
  messages: IncomingMessage[],
  config: GeminiRagConfig,
): Promise<AuburnRagResult> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });
  const retrievalContext = buildRetrievalContext(messages);
  const fileSearch = {
    fileSearchStoreNames: [config.fileSearchStoreName],
    topK: 12,
  };

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: toGeminiContents(messages, retrievalContext),
    config: {
      systemInstruction: SYSTEM_INSTRUCTIONS,
      temperature: 0.2,
      tools: [
        {
          fileSearch,
        },
      ],
    },
  });

  const retrievedSources = extractGroundedSources(response);
  const sourceTitles = extractGroundingSourceTitles(response);
  const normalized = buildModelAnswer(
    response.text ?? "",
    retrievedSources,
    retrievalContext,
  );

  return {
    ...normalized,
    sourceTitles,
    retrievalContext,
  };
}

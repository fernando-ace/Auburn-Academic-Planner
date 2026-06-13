import { createRequire } from "node:module";

import { GoogleGenAI, type Content, type GroundingChunk } from "@google/genai";

import { getGeminiModel } from "./gemini-config.ts";

const require = createRequire(import.meta.url);
const manifest = require("../../sources/manifest.json") as ManifestSource[];

export type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ManifestSource = {
  id: string;
  title: string;
  type: string;
  catalogYear: string;
  program: string;
  url: string;
  lastChecked: string;
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
You are Auburn Academic Planner, an academic planning assistant for Auburn CSSE students.

Answer questions about Auburn Software Engineering, Computer Science, and the Artificial Intelligence Engineering certificate.

Grounding rules:
- For degree requirements, prerequisites, catalog rules, certificate requirements, course lists, credit counts, advising rules, or policy-like questions, answer only from retrieved Auburn sources.
- If retrieved Auburn sources are missing or insufficient, say that the retrieved sources do not contain enough information to answer confidently.
- Do not use general knowledge to fill in Auburn degree requirements.
- Do not invent citations, URLs, catalog years, or program metadata.
- If the user names a source document, such as "Degree Works Plan Sample" or "Degree Works Dashboard Sample", you must search that named source and use it only if File Search retrieves it.
- If a document-specific question compares a named student document to a certificate, major, prerequisite, or bulletin requirement, search both the named student document and the relevant Auburn bulletin/certificate source.
- Cite only retrieved File Search chunks. If the named source is not retrieved, say the matching file was not retrieved and do not infer from memory.

Product boundaries:
- You do not replace academic advisors.
- Do not claim to register students, change schedules, approve plans, or make official determinations.
- Use language like academic planning assistant, advisor prep, and verify with your advisor.

Return a concise normal text answer for the student. Do not return JSON, markdown tables, or any strict structured data.
The server will attach retrieved sources, confidence, and advisor verification metadata separately.
`;

const FALLBACK_ADVISOR_NOTE =
  "Advisor verification required: use this as preparation and verify your plan with an Auburn academic advisor.";

const NO_RETRIEVAL_ANSWER =
  "The Gemini File Search tool did not return Auburn source material for this question, so I cannot answer it confidently from the uploaded Auburn sources.";

const typedManifest = manifest;

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
      /\bdegree\s*works\b.*\bplan\s*sample\b|\bdegreeworks[-\s]?plan[-\s]?sample\b/,
    )
  ) {
    addSource("degreeworks-plan-sample");
    expansions.push(
      "Degree Works Plan Sample",
      "degreeworks-plan-sample.pdf",
      "auburn/degreeworks-plan-sample.pdf",
      "3 Year Bachelors Degree + AI Certificate",
      "COMP 5600",
      "COMP 5630",
      "COMP 5130",
      "COMP 5610",
    );
  }

  if (
    includesPattern(
      lowerQuestion,
      /\bdegree\s*works\b.*\bdashboard\s*sample\b|\bdegreeworks[-\s]?dashboard[-\s]?sample\b/,
    )
  ) {
    addSource("degreeworks-dashboard-sample");
    expansions.push(
      "Degree Works Dashboard Sample",
      "degreeworks-dashboard-sample.pdf",
      "auburn/degreeworks-dashboard-sample.pdf",
      "credits required",
      "credits applied",
      "credits needed",
      "preregistered",
    );
  }

  if (
    includesPattern(
      lowerQuestion,
      /\bai\s+certificate\b|\bartificial\s+intelligence\s+engineering\s+certificate\b/,
    )
  ) {
    addSource("auburn-ai-engineering-certificate");
    expansions.push(
      "Artificial Intelligence Engineering Certificate Bulletin",
      "auburn/ai-engineering-certificate.html",
      "COMP 5600",
      "COMP 5630",
      "COMP 5130",
      "approved AI elective",
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
  const expectedSourceIds = new Set(
    context.expectedSources.map((source) => source.id),
  );
  const sourceInstruction =
    context.expectedSources.length > 0
      ? `Named/relevant source files to retrieve and cite: ${context.expectedSources
          .map((source) => `${source.title} (${source.fileName})`)
          .join(", ")}.`
      : "Search the uploaded Auburn sources for the most relevant grounding chunks.";
  const comparisonInstruction =
    expectedSourceIds.has("degreeworks-plan-sample") &&
    expectedSourceIds.has("auburn-ai-engineering-certificate")
      ? "For Degree Works Plan Sample comparisons to the Artificial Intelligence Engineering certificate, list retrieved planned courses that satisfy the three required courses and the approved AI elective slot. If COMP 5610 Artificial Intelligence Programming is retrieved from the plan, include it as the planned approved AI elective candidate and remind the student to verify department/advisor approval."
      : undefined;

  return [
    `Current user question to answer: ${context.userQuestion}`,
    sourceInstruction,
    `Expanded retrieval query for File Search only: ${context.expandedQuery}`,
    comparisonInstruction,
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

  return {
    answer:
      answer ||
      "The retrieved Auburn sources did not provide enough information to answer this question confidently.",
    sources: retrievedSources,
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

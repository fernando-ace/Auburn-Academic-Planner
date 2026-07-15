import {
  answerAuburnRagQuestion,
  logRetrievalDebug,
  parseChatRequestBody,
} from "../../../lib/gemini-rag.ts";
import { checkRateLimit } from "../../../lib/api/rate-limit.ts";
import {
  MAX_GEMINI_CHAT_REQUEST_BYTES,
  getGeminiChatPayloadLimitIssue,
  hasCurrentGeminiChatConsent,
} from "../../../lib/chat-privacy.ts";

export const runtime = "nodejs";

type LimitedJsonBodyResult =
  | { ok: true; value: unknown }
  | { ok: false; tooLarge: boolean };

async function readLimitedJsonBody(
  request: Request,
): Promise<LimitedJsonBodyResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_GEMINI_CHAT_REQUEST_BYTES
  ) {
    return { ok: false, tooLarge: true };
  }

  if (!request.body) {
    return { ok: false, tooLarge: false };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > MAX_GEMINI_CHAT_REQUEST_BYTES) {
      await reader.cancel().catch(() => undefined);
      return { ok: false, tooLarge: true };
    }
    chunks.push(value);
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      value: JSON.parse(new TextDecoder().decode(bodyBytes)) as unknown,
    };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, {
    namespace: "chat",
    limit: 20,
    windowSeconds: 10 * 60,
  });

  if (!rateLimit.ok) {
    return Response.json(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  }

  const bodyResult = await readLimitedJsonBody(request);
  if (!bodyResult.ok) {
    return Response.json(
      {
        error: bodyResult.tooLarge
          ? "Chat request is too large. Reset Chat and try a shorter question."
          : "Request body must include at least one valid chat message.",
      },
      { status: bodyResult.tooLarge ? 413 : 400 },
    );
  }

  const body = bodyResult.value;
  const messages = parseChatRequestBody(body);

  if (!messages) {
    return Response.json(
      { error: "Request body must include at least one valid chat message." },
      { status: 400 },
    );
  }

  if (!hasCurrentGeminiChatConsent(body)) {
    return Response.json(
      {
        error:
          "Explicit consent to Google Gemini processing is required before sending Chat messages.",
      },
      { status: 403 },
    );
  }

  const payloadLimitIssue = getGeminiChatPayloadLimitIssue(messages);
  if (payloadLimitIssue) {
    return Response.json(
      {
        error:
          payloadLimitIssue.kind === "message"
            ? `A ${payloadLimitIssue.role} Chat message exceeds the ${payloadLimitIssue.maximumCharacters.toLocaleString("en-US")}-character limit.`
            : `Recent Chat context exceeds the ${payloadLimitIssue.maximumCharacters.toLocaleString("en-US")}-character limit. Reset Chat and try a shorter question.`,
      },
      { status: 413 },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE_NAME?.trim();

  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  if (!fileSearchStoreName) {
    return Response.json(
      { error: "GEMINI_FILE_SEARCH_STORE_NAME is not configured." },
      { status: 500 },
    );
  }

  try {
    const result = await answerAuburnRagQuestion(messages, {
      apiKey,
      fileSearchStoreName,
    });

    const { sourceTitles, retrievalContext, ...responseBody } = result;
    logRetrievalDebug(retrievalContext, sourceTitles);

    return Response.json(responseBody);
  } catch (error) {
    console.error("Gemini API error", error);
    return Response.json(
      { error: "The assistant could not complete the request." },
      { status: 502 },
    );
  }
}

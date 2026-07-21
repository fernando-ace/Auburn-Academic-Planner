import {
  answerAuburnRagQuestion,
  IncompleteGeminiResponseError,
  logRetrievalDebug,
  parseChatRequestBody,
} from "../../../lib/gemini-rag.ts";
import { checkRateLimit } from "../../../lib/api/rate-limit.ts";
import {
  privateJsonResponse,
  readLimitedJsonBody,
  validateApiRequest,
} from "../../../lib/api/request-security.ts";
import {
  MAX_GEMINI_CHAT_REQUEST_BYTES,
  getGeminiChatPayloadLimitIssue,
  hasCurrentGeminiChatConsent,
} from "../../../lib/chat-privacy.ts";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const requestValidation = validateApiRequest(request, "json");
  if (!requestValidation.ok) {
    return privateJsonResponse(
      { error: requestValidation.error },
      { status: requestValidation.status },
    );
  }

  const rateLimit = await checkRateLimit(request, {
    namespace: "chat",
    limit: 20,
    windowSeconds: 10 * 60,
  });

  if (!rateLimit.ok) {
    return privateJsonResponse(
      { error: rateLimit.error },
      { status: rateLimit.status },
    );
  }

  const bodyResult = await readLimitedJsonBody(
    request,
    MAX_GEMINI_CHAT_REQUEST_BYTES,
  );
  if (!bodyResult.ok) {
    return privateJsonResponse(
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
    return privateJsonResponse(
      { error: "Request body must include at least one valid chat message." },
      { status: 400 },
    );
  }

  if (!hasCurrentGeminiChatConsent(body)) {
    return privateJsonResponse(
      {
        error:
          "Explicit consent to Google Gemini processing is required before sending Chat messages.",
      },
      { status: 403 },
    );
  }

  const payloadLimitIssue = getGeminiChatPayloadLimitIssue(messages);
  if (payloadLimitIssue) {
    return privateJsonResponse(
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
    console.error("Chat service is unavailable: Gemini API key is missing.");
    return privateJsonResponse(
      { error: "Chat is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  if (!fileSearchStoreName) {
    console.error("Chat service is unavailable: Gemini source store is missing.");
    return privateJsonResponse(
      { error: "Chat is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  try {
    const result = await answerAuburnRagQuestion(messages, {
      apiKey,
      fileSearchStoreName,
    });

    const {
      finishReason,
      sourceTitles,
      retrievalContext,
      ...responseBody
    } = result;
    logRetrievalDebug(retrievalContext, sourceTitles, finishReason);

    return privateJsonResponse(responseBody);
  } catch (error) {
    console.error(
      "Gemini request failed.",
      error instanceof IncompleteGeminiResponseError
        ? { finishReason: error.finishReason }
        : { reason: "request_error" },
    );
    return privateJsonResponse(
      {
        error:
          "Chat could not complete that request. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}

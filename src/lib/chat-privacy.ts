export const MAX_GEMINI_CHAT_MESSAGES = 6;
export const MAX_GEMINI_CHAT_USER_MESSAGE_CHARACTERS = 6_000;
export const MAX_GEMINI_CHAT_ASSISTANT_MESSAGE_CHARACTERS = 16_000;
export const MAX_GEMINI_CHAT_TOTAL_CHARACTERS = 48_000;
export const MAX_GEMINI_CHAT_REQUEST_BYTES = 256 * 1024;
export const GEMINI_CHAT_CONSENT_VERSION = "gemini-chat-v1";

export type GeminiChatMessageInput = {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

export type GeminiChatPayloadMessage = Pick<
  GeminiChatMessageInput,
  "role" | "content"
>;

export type GeminiChatPayloadLimitIssue =
  | {
      kind: "message";
      maximumCharacters: number;
      messageIndex: number;
      role: GeminiChatPayloadMessage["role"];
    }
  | {
      kind: "total";
      maximumCharacters: number;
    };

export function hasCurrentGeminiChatConsent(value: unknown) {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.geminiConsent === true &&
    candidate.geminiConsentVersion === GEMINI_CHAT_CONSENT_VERSION
  );
}

export function minimizeGeminiChatMessages(
  messages: GeminiChatMessageInput[],
): GeminiChatPayloadMessage[] {
  const recentMessages = messages
    .filter(
      (message) =>
        !message.error &&
        (message.role === "user" || message.role === "assistant") &&
        message.content.trim().length > 0,
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .slice(-MAX_GEMINI_CHAT_MESSAGES);

  while (recentMessages[0]?.role === "assistant") {
    recentMessages.shift();
  }

  return recentMessages;
}

export function getGeminiChatPayloadLimitIssue(
  messages: GeminiChatPayloadMessage[],
): GeminiChatPayloadLimitIssue | null {
  let totalCharacters = 0;

  for (const [messageIndex, message] of messages.entries()) {
    const maximumCharacters =
      message.role === "user"
        ? MAX_GEMINI_CHAT_USER_MESSAGE_CHARACTERS
        : MAX_GEMINI_CHAT_ASSISTANT_MESSAGE_CHARACTERS;

    if (message.content.length > maximumCharacters) {
      return {
        kind: "message",
        maximumCharacters,
        messageIndex,
        role: message.role,
      };
    }

    totalCharacters += message.content.length;
    if (totalCharacters > MAX_GEMINI_CHAT_TOTAL_CHARACTERS) {
      return {
        kind: "total",
        maximumCharacters: MAX_GEMINI_CHAT_TOTAL_CHARACTERS,
      };
    }
  }

  return null;
}

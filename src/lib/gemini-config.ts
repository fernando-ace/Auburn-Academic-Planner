export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

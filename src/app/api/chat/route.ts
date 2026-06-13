import {
  answerAuburnRagQuestion,
  logRetrievalDebug,
  parseChatRequestBody,
} from "@/lib/gemini-rag";

export const runtime = "nodejs";

export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const messages = parseChatRequestBody(body);

  if (!messages) {
    return Response.json(
      { error: "Request body must include at least one valid chat message." },
      { status: 400 },
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

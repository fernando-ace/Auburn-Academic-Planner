import {
  answerAuburnRagQuestion,
  logRetrievalDebug,
  parseChatRequestBody,
} from "@/lib/gemini-rag";
import {
  buildDegreeWorksPlanAiCertificateAnswer,
  isDegreeWorksPlanAiCertificateQuestion,
} from "@/lib/ai-certificate-plan-answer";
import { getDegreeWorksPlanSampleCourseCodes } from "@/lib/samples/degreeworks-plan-sample";

export const runtime = "nodejs";

function isGeminiQuotaError(error: unknown) {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : String(error ?? "");

  return /RESOURCE_EXHAUSTED|quota|rate limit/i.test(text);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const messages = parseChatRequestBody(body);

  if (!messages) {
    return Response.json(
      { error: "Request body must include at least one valid chat message." },
      { status: 400 },
    );
  }

  const usesDeterministicAiCertificateAnswer =
    isDegreeWorksPlanAiCertificateQuestion(messages);
  const degreeWorksPlanSampleCourseCodes =
    usesDeterministicAiCertificateAnswer
      ? getDegreeWorksPlanSampleCourseCodes()
      : [];
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE_NAME?.trim();

  if (!apiKey) {
    if (usesDeterministicAiCertificateAnswer) {
      return Response.json(
        buildDegreeWorksPlanAiCertificateAnswer(
          [],
          degreeWorksPlanSampleCourseCodes,
        ),
      );
    }

    return Response.json(
      { error: "GEMINI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  if (!fileSearchStoreName) {
    if (usesDeterministicAiCertificateAnswer) {
      return Response.json(
        buildDegreeWorksPlanAiCertificateAnswer(
          [],
          degreeWorksPlanSampleCourseCodes,
        ),
      );
    }

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

    if (usesDeterministicAiCertificateAnswer) {
      return Response.json(
        buildDegreeWorksPlanAiCertificateAnswer(
          responseBody.sources,
          degreeWorksPlanSampleCourseCodes,
        ),
      );
    }

    return Response.json(responseBody);
  } catch (error) {
    if (usesDeterministicAiCertificateAnswer && isGeminiQuotaError(error)) {
      console.warn(
        "Gemini quota unavailable; returning deterministic AI certificate answer.",
        error,
      );
      return Response.json(
        buildDegreeWorksPlanAiCertificateAnswer(
          [],
          degreeWorksPlanSampleCourseCodes,
        ),
      );
    }

    console.error("Gemini API error", error);
    return Response.json(
      { error: "The assistant could not complete the request." },
      { status: 502 },
    );
  }
}

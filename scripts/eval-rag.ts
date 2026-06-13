import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { answerAuburnRagQuestion } from "../src/lib/gemini-rag.ts";
import type { GeminiRagConfig } from "../src/lib/gemini-rag.ts";

type EvalCase = {
  question: string;
  expectedTerms: string[];
};

const evalCases: EvalCase[] = [
  {
    question:
      "What courses are required for the Artificial Intelligence Engineering certificate?",
    expectedTerms: [
      "COMP 5600",
      "COMP 5630",
      "COMP 5130",
      "12 credit hours",
      "approved AI elective",
    ],
  },
  {
    question:
      "Based on my Degree Works Plan Sample, what courses in my plan count toward the Artificial Intelligence Engineering certificate?",
    expectedTerms: ["COMP 5600", "COMP 5630", "COMP 5130", "COMP 5610"],
  },
  {
    question:
      "How many total planned credits are in the Degree Works Plan Sample?",
    expectedTerms: ["122"],
  },
  {
    question:
      "Based on my Degree Works Dashboard Sample, how many credits are required, applied, and still needed?",
    expectedTerms: ["122 required", "83 applied", "39 needed"],
  },
  {
    question:
      "What courses are preregistered in the Degree Works Dashboard Sample?",
    expectedTerms: [
      "COMP 2710",
      "COMP 2800",
      "COMP 3270",
      "COMP 3350",
      "STAT 3010",
      "STAT 3600",
    ],
  },
];

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const DEFAULT_DELAY_MS = 70_000;

type CliOptions = {
  list: boolean;
  index?: number;
  delayMs: number;
};

function loadLocalEnv() {
  for (const fileName of [".env.local", ".env"]) {
    const envPath = path.join(projectRoot, fileName);
    if (!existsSync(envPath)) {
      continue;
    }

    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const rawValue = trimmed.slice(equalsIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");

      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function answerIncludesTerm(answer: string, term: string) {
  const answerTokens = normalize(answer).split(" ").filter(Boolean);
  const termTokens = normalize(term).split(" ").filter(Boolean);
  const hasNumberAndLabel =
    termTokens.length === 2 && termTokens.some((token) => /^\d+$/.test(token));

  if (hasNumberAndLabel) {
    return termTokens.every((termToken) => answerTokens.includes(termToken));
  }

  let searchStart = 0;

  return termTokens.every((termToken) => {
    const foundIndex = answerTokens.findIndex(
      (answerToken, index) => index >= searchStart && answerToken === termToken,
    );

    if (foundIndex === -1) {
      return false;
    }

    searchStart = foundIndex + 1;
    return true;
  });
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseCliOptions(args: string[]): CliOptions {
  const options: CliOptions = {
    list: false,
    delayMs: DEFAULT_DELAY_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--list") {
      options.list = true;
      continue;
    }

    if (arg === "--index") {
      const rawIndex = args[index + 1];
      if (!rawIndex) {
        throw new Error("Missing value for --index.");
      }

      const selectedIndex = Number.parseInt(rawIndex, 10);
      if (!Number.isInteger(selectedIndex) || String(selectedIndex) !== rawIndex) {
        throw new Error(`Invalid --index value: ${rawIndex}`);
      }

      options.index = selectedIndex;
      index += 1;
      continue;
    }

    if (arg === "--delay-ms") {
      const rawDelay = args[index + 1];
      if (!rawDelay) {
        throw new Error("Missing value for --delay-ms.");
      }

      const delayMs = Number.parseInt(rawDelay, 10);
      if (!Number.isInteger(delayMs) || delayMs < 0) {
        throw new Error(`Invalid --delay-ms value: ${rawDelay}`);
      }

      options.delayMs = delayMs;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function listEvalCases() {
  for (const [index, evalCase] of evalCases.entries()) {
    console.log(`[${index}] ${evalCase.question}`);
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isQuotaError(error: unknown) {
  const message = errorMessage(error);

  return (
    message.includes('"code":429') ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("Quota exceeded") ||
    message.includes("quota exceeded") ||
    message.includes("current quota")
  );
}

function retryDelayFromError(error: unknown) {
  const message = errorMessage(error);
  const jsonMatch = message.match(/"retryDelay"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1];
  }

  const proseMatch = message.match(/retry in ([^".\n]+(?:s|ms|m))/i);
  return proseMatch?.[1];
}

function printQuotaStop(index: number, evalCase: EvalCase, error: unknown) {
  console.error("\nGemini quota limit reached. Stopping eval run.");
  console.error(`Eval index: ${index}`);
  console.error(`Question: ${evalCase.question}`);

  const retryDelay = retryDelayFromError(error);
  console.error(`Retry delay: ${retryDelay ?? "(not provided)"}`);
  console.error(
    "Reminder: rerun a single eval with npm run eval:rag -- --index <index>.",
  );
}

async function runEvalCase(
  index: number,
  evalCase: EvalCase,
  config: GeminiRagConfig,
) {
  const result = await answerAuburnRagQuestion(
    [{ role: "user", content: evalCase.question }],
    config,
  );

  const missingTerms = evalCase.expectedTerms.filter(
    (term) => !answerIncludesTerm(result.answer, term),
  );
  const passed = missingTerms.length === 0;

  console.log(`\n[${index}] ${passed ? "PASS" : "FAIL"}`);
  console.log(`Question: ${evalCase.question}`);
  console.log(`Answer: ${result.answer}`);
  console.log(
    `Source titles returned: ${
      result.sourceTitles.length > 0 ? result.sourceTitles.join(", ") : "(none)"
    }`,
  );
  console.log(
    `Expected terms: ${evalCase.expectedTerms
      .map((term) => (missingTerms.includes(term) ? `MISS ${term}` : `OK ${term}`))
      .join("; ")}`,
  );

  return passed;
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));

  if (options.list) {
    listEvalCases();
    return;
  }

  if (
    options.index !== undefined &&
    (options.index < 0 || options.index >= evalCases.length)
  ) {
    throw new Error(
      `Invalid --index value: ${options.index}. Use --list to see valid indexes.`,
    );
  }

  loadLocalEnv();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const fileSearchStoreName = process.env.GEMINI_FILE_SEARCH_STORE_NAME?.trim();

  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in your shell environment or in .env.local before running npm run eval:rag.",
    );
  }

  if (!fileSearchStoreName) {
    throw new Error(
      "Missing GEMINI_FILE_SEARCH_STORE_NAME. Run npm run sources:upload, then set the returned store name before running npm run eval:rag.",
    );
  }

  let failures = 0;
  const selectedCases =
    options.index === undefined
      ? evalCases.map((evalCase, index) => ({ evalCase, index }))
      : [{ evalCase: evalCases[options.index], index: options.index }];

  for (const [runIndex, { evalCase, index }] of selectedCases.entries()) {
    try {
      const passed = await runEvalCase(index, evalCase, {
        apiKey,
        fileSearchStoreName,
      });

      if (!passed) {
        failures += 1;
      }
    } catch (error) {
      if (isQuotaError(error)) {
        printQuotaStop(index, evalCase, error);
      } else {
        console.error(`\nEval index ${index} failed with an unexpected error.`);
        console.error(errorMessage(error));
      }

      process.exitCode = 1;
      return;
    }

    const hasMoreCases = runIndex < selectedCases.length - 1;
    if (hasMoreCases && options.delayMs > 0) {
      console.log(`\nWaiting ${options.delayMs}ms before the next eval...`);
      await sleep(options.delayMs);
    }
  }

  console.log(
    `\nRAG eval complete: ${selectedCases.length - failures}/${selectedCases.length} passed.`,
  );

  if (failures > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

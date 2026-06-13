import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  GoogleGenAI,
  type CustomMetadata,
  type UploadToFileSearchStoreOperation,
  type UploadToFileSearchStoreResponse,
} from "@google/genai";

const FILE_SEARCH_STORE_DISPLAY_NAME = "Auburn Academic Planner Sources";
const POLL_INTERVAL_MS = 5000;

type ManifestSource = {
  id?: unknown;
  title?: unknown;
  type?: unknown;
  program?: unknown;
  catalogYear?: unknown;
  fileName?: unknown;
  url?: unknown;
  lastChecked?: unknown;
};

type ValidSource = {
  id: string;
  title: string;
  type: string;
  program: string;
  catalogYear: string;
  fileName: string;
  filePath: string;
  url: string;
  lastChecked: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const sourcesDir = path.join(projectRoot, "sources");
const manifestPath = path.join(sourcesDir, "manifest.json");

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

function readManifest() {
  if (!existsSync(manifestPath)) {
    throw new Error(`Missing source manifest: ${manifestPath}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as
    | ManifestSource[]
    | { sources?: ManifestSource[] };

  const sourceEntries = Array.isArray(manifest) ? manifest : manifest.sources;

  if (!Array.isArray(sourceEntries)) {
    throw new Error(
      "sources/manifest.json must contain a top-level array or a top-level sources array.",
    );
  }

  const sources = sourceEntries.map((source, index) =>
    normalizeSource(source, index),
  );

  if (sources.length === 0) {
    throw new Error(
      "sources/manifest.json is empty. Add at least one source entry with a non-empty fileName.",
    );
  }

  return sources;
}

function normalizeSource(source: ManifestSource, index: number): ValidSource {
  const id = requireString(source.id, `sources[${index}].id`);
  const title = requireString(source.title, `sources[${index}].title`);
  const type = requireString(source.type, `sources[${index}].type`);
  const program = requireString(source.program, `sources[${index}].program`);
  const catalogYear = requireString(
    source.catalogYear,
    `sources[${index}].catalogYear`,
  );
  const fileName = requireString(source.fileName, `sources[${index}].fileName`);
  const lastChecked = requireString(
    source.lastChecked,
    `sources[${index}].lastChecked`,
  );
  const url = readString(source.url) ?? "";

  const filePath = path.resolve(sourcesDir, fileName);
  const relativePath = path.relative(sourcesDir, filePath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    relativePath === ""
  ) {
    throw new Error(
      `Invalid manifest fileName "${fileName}". Files must live under sources/.`,
    );
  }

  if (!existsSync(filePath)) {
    throw new Error(`Missing source file listed in manifest: ${filePath}`);
  }

  return {
    id,
    title,
    type,
    program,
    catalogYear,
    fileName: relativePath.replaceAll(path.sep, "/"),
    filePath,
    url,
    lastChecked,
  };
}

function requireString(value: unknown, label: string) {
  const stringValue = readString(value);
  if (!stringValue) {
    throw new Error(`Missing required manifest field: ${label}`);
  }

  return stringValue;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function customMetadata(source: ValidSource): CustomMetadata[] {
  return [
    { key: "id", stringValue: source.id },
    { key: "type", stringValue: source.type },
    { key: "program", stringValue: source.program },
    { key: "catalogYear", stringValue: source.catalogYear },
    { key: "url", stringValue: source.url },
    { key: "lastChecked", stringValue: source.lastChecked },
    { key: "fileName", stringValue: source.fileName },
    { key: "title", stringValue: source.title },
  ].filter((item) => item.stringValue.length > 0);
}

function mimeTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html" || extension === ".htm") {
    return "text/html";
  }

  if (extension === ".pdf") {
    return "application/pdf";
  }

  if (extension === ".txt") {
    return "text/plain";
  }

  if (extension === ".md") {
    return "text/markdown";
  }

  return undefined;
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForUploadOperation(
  ai: GoogleGenAI,
  operation: UploadToFileSearchStoreOperation,
  label: string,
) {
  let current = operation;

  while (!current.done) {
    await sleep(POLL_INTERVAL_MS);
    current = (await ai.operations.get<
      UploadToFileSearchStoreResponse,
      UploadToFileSearchStoreOperation
    >({
      operation: current,
    })) as UploadToFileSearchStoreOperation;
  }

  if (current.error) {
    throw new Error(
      `Gemini File Search upload failed for "${label}": ${JSON.stringify(
        current.error,
      )}`,
    );
  }

  return current.response;
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY. Set it in your shell environment or in .env.local before running npm run sources:upload.",
    );
  }

  const sources = readManifest();
  const ai = new GoogleGenAI({ apiKey });

  console.log(`Creating Gemini File Search store: ${FILE_SEARCH_STORE_DISPLAY_NAME}`);
  const fileSearchStore = await ai.fileSearchStores.create({
    config: {
      displayName: FILE_SEARCH_STORE_DISPLAY_NAME,
      embeddingModel: "models/gemini-embedding-2",
    },
  });

  if (!fileSearchStore.name) {
    throw new Error("Gemini did not return a File Search store name.");
  }

  console.log(`Uploading ${sources.length} source file(s).`);
  for (const source of sources) {
    console.log(`Uploading ${source.fileName} as "${source.title}".`);

    const operation = await ai.fileSearchStores.uploadToFileSearchStore({
      file: source.filePath,
      fileSearchStoreName: fileSearchStore.name,
      config: {
        displayName: source.title,
        customMetadata: customMetadata(source),
        mimeType: mimeTypeFor(source.filePath),
      },
    });

    await waitForUploadOperation(ai, operation, source.title);
  }

  console.log(`GEMINI_FILE_SEARCH_STORE_NAME=${fileSearchStore.name}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

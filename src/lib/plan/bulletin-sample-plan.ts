import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { load } from "cheerio";

import { parseCourseCodes } from "../courses/course-code-parser.ts";
import type { CurrentDegreeAuditAnalysis } from "./current-degree-audit-analysis.ts";

export type BulletinSamplePlanCourse = {
  code: string;
  credits: number | null;
  order: number;
  termLabel: string;
  yearLabel: string | null;
  requirementText: string;
};

export type BulletinSamplePlanOrdering = {
  matchedMajorTitle: string;
  catalogYear: string | null;
  fileName: string;
  confidence: "high" | "medium" | "low";
  coursesByCode: Record<string, BulletinSamplePlanCourse>;
};

type MajorManifestEntry = {
  title?: string;
  fileName?: string;
  catalogYear?: string | null;
};
type CheerioAcceptedElement = Parameters<ReturnType<typeof load>>[0];

const projectRoot = process.cwd();
const majorsDirectory = path.join(projectRoot, "sources", "auburn", "majors");
const manifestPath = path.join(majorsDirectory, "manifest.json");
let cachedManifest: MajorManifestEntry[] | null = null;
const cachedPlansByFile = new Map<string, BulletinSamplePlanOrdering | null>();

export function findBulletinSamplePlanOrdering(
  audit: CurrentDegreeAuditAnalysis,
): BulletinSamplePlanOrdering | null {
  const manifest = readMajorManifest();
  const labels = [
    audit.detectedProgram.major,
    audit.major,
    audit.detectedProgram.program,
    audit.studentProgram,
    audit.detectedProgram.displayName,
  ]
    .filter((label): label is string => Boolean(label))
    .map(splitProgramLabel)
    .flat()
    .map(normalizeLabel)
    .filter(Boolean);

  const candidate = manifest
    .map((entry) => ({
      entry,
      score: scoreManifestEntry(entry, labels),
    }))
    .filter(({ entry, score }) => score > 0 && Boolean(entry.fileName))
    .sort((left, right) => right.score - left.score)[0]?.entry;

  if (!candidate?.fileName) {
    return null;
  }

  const plan = readSamplePlan(candidate);
  if (!plan) {
    return null;
  }

  return {
    ...plan,
    confidence: scoreManifestEntry(candidate, labels) >= 100 ? "high" : "medium",
  };
}

export function extractBulletinSamplePlanOrdering({
  catalogYear = null,
  fileName,
  html,
  title,
}: {
  catalogYear?: string | null;
  fileName: string;
  html: string;
  title: string;
}): BulletinSamplePlanOrdering {
  const $ = load(html);
  const coursesByCode: Record<string, BulletinSamplePlanCourse> = {};
  let order = 0;
  let yearLabel: string | null = null;
  let termLabels: string[] = [];

  $("table.sc_plangrid tr").each((_, row) => {
    const $row = $(row);

    if ($row.hasClass("plangridyear")) {
      yearLabel = cleanText($row.text()) || null;
      termLabels = [];
      return;
    }

    if ($row.hasClass("plangridterm")) {
      termLabels = $row
        .find("th")
        .map((__, heading) => cleanText($(heading).text()))
        .get()
        .filter((label) => label && !/^hours$/i.test(label));
      return;
    }

    if ($row.hasClass("plangridsum") || $row.hasClass("plangridtotal")) {
      return;
    }

    const cells = $row.find("td").toArray();
    for (let cellIndex = 0; cellIndex < cells.length; cellIndex += 2) {
      const courseCell = cells[cellIndex];
      const hoursCell = cells[cellIndex + 1];
      if (!courseCell) {
        continue;
      }

      const requirementText = cleanText($(courseCell).text());
      const codes = extractCourseCodesFromCell($, courseCell);
      if (codes.length === 0) {
        continue;
      }

      const termIndex = Math.floor(cellIndex / 2);
      const termLabel = [termLabels[termIndex], yearLabel]
        .filter(Boolean)
        .join(" ")
        .trim();
      const credits = parseCredits(cleanText(hoursCell ? $(hoursCell).text() : ""));

      for (const code of codes) {
        if (coursesByCode[code]) {
          continue;
        }

        coursesByCode[code] = {
          code,
          credits,
          order,
          termLabel: termLabel || "Sample plan",
          yearLabel,
          requirementText,
        };
        order += 1;
      }
    }
  });

  return {
    matchedMajorTitle: title,
    catalogYear,
    fileName,
    confidence: Object.keys(coursesByCode).length > 0 ? "high" : "low",
    coursesByCode,
  };
}

function readMajorManifest() {
  if (cachedManifest) {
    return cachedManifest;
  }

  if (!existsSync(manifestPath)) {
    cachedManifest = [];
    return cachedManifest;
  }

  try {
    cachedManifest = JSON.parse(
      readFileSync(manifestPath, "utf8"),
    ) as MajorManifestEntry[];
  } catch {
    cachedManifest = [];
  }

  return cachedManifest;
}

function readSamplePlan(entry: MajorManifestEntry) {
  const fileName = entry.fileName ?? "";
  if (cachedPlansByFile.has(fileName)) {
    return cachedPlansByFile.get(fileName) ?? null;
  }

  const absolutePath = path.join(projectRoot, "sources", fileName);
  if (!existsSync(absolutePath)) {
    cachedPlansByFile.set(fileName, null);
    return null;
  }

  try {
    const plan = extractBulletinSamplePlanOrdering({
      catalogYear: entry.catalogYear ?? null,
      fileName,
      html: readFileSync(absolutePath, "utf8"),
      title: entry.title ?? "Matched Auburn Bulletin plan",
    });
    cachedPlansByFile.set(fileName, plan);
    return plan;
  } catch {
    cachedPlansByFile.set(fileName, null);
    return null;
  }
}

function scoreManifestEntry(entry: MajorManifestEntry, labels: string[]) {
  const title = normalizeLabel(entry.title);
  if (!title) {
    return 0;
  }

  let score = 0;
  for (const label of labels) {
    if (!label) {
      continue;
    }

    if (label === title) {
      score = Math.max(score, 120);
    } else if (label.includes(title)) {
      score = Math.max(score, 100);
    } else if (title.includes(label) && label.length >= 8) {
      score = Math.max(score, 80);
    }
  }

  return score;
}

function splitProgramLabel(label: string) {
  return label
    .split(/\s+-\s+|[,/]/)
    .map((part) =>
      part
        .replace(/^(?:B[A-Z]{1,4}|Bachelor of|Bachelor)\s+/i, "")
        .replace(/\b(?:BS|BA|BSBA|BCIV|BSWE|BFA|BMUS|BACH)\b/gi, " ")
        .trim(),
    )
    .filter(Boolean);
}

function normalizeLabel(label?: string | null) {
  return (label ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function extractCourseCodesFromCell(
  $: ReturnType<typeof load>,
  cell: CheerioAcceptedElement,
) {
  const $cell = $(cell);
  const codes = [
    ...parseCourseCodes($cell.text()),
    ...$cell
      .find("a")
      .toArray()
      .flatMap((anchor) =>
        parseCourseCodes(
          [
            $(anchor).text(),
            $(anchor).attr("title"),
            $(anchor).attr("href"),
            $(anchor).attr("onclick"),
          ]
            .filter(Boolean)
            .join(" "),
        ),
      ),
  ];
  const firstPrefix = codes[0]?.split(" ")[0];

  if (firstPrefix) {
    for (const match of $cell.text().matchAll(/\b(?:or|,|and)\s+(\d{4}[A-Z]?)\b/gi)) {
      codes.push(`${firstPrefix} ${match[1].toUpperCase()}`);
    }
  }

  return Array.from(new Set(codes));
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function parseCredits(value: string) {
  const match = /\d+(?:\.\d+)?/.exec(value);
  return match ? Number(match[0]) : null;
}

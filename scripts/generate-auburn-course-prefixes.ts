import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const catalogIndexPath = path.join(
  projectRoot,
  "sources",
  "auburn",
  "curated",
  "auburn-courses-of-instruction-index.html",
);
const generatedPath = path.join(
  projectRoot,
  "src",
  "lib",
  "courses",
  "auburn-course-prefixes.generated.ts",
);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const html = readFileSync(catalogIndexPath, "utf8");
  const prefixes = extractAuburnCoursePrefixes(html);

  writeFileSync(generatedPath, `${formatGeneratedPrefixModule(prefixes)}\n`);
  console.log(`Generated ${prefixes.length} Auburn course prefixes.`);
}

export function extractAuburnCoursePrefixes(html: string) {
  const prefixes = new Set<string>();
  const linkPattern =
    /href="\/coursesofinstruction\/[^"]+\/"[^>]*>\s*[^<]*?\s+-\s+([A-Z]{2,5})\s*<\/a>/g;

  for (const match of html.matchAll(linkPattern)) {
    prefixes.add(match[1]);
  }

  return [...prefixes].sort();
}

export function formatGeneratedPrefixModule(prefixes: string[]) {
  const lines = [
    "export const AUBURN_COURSE_PREFIXES = [",
    ...prefixes.map((prefix) => `  "${prefix}",`),
    "] as const;",
    "",
    "export type AuburnCoursePrefix = (typeof AUBURN_COURSE_PREFIXES)[number];",
  ];

  return lines.join("\n");
}

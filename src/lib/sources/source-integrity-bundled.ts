import { readFileSync } from "node:fs";
import path from "node:path";

import aiCertificateJson from "../../../rules/auburn/ai-engineering-certificate.json" with { type: "json" };
import planningMetadataJson from "../../../rules/auburn/course-planning-metadata.json" with { type: "json" };
import computerScienceJson from "../../../rules/auburn/computer-science-degree.json" with { type: "json" };
import softwareEngineeringJson from "../../../rules/auburn/software-engineering-degree.json" with { type: "json" };
import prerequisitesJson from "../../../rules/auburn/software-engineering-prerequisites.json" with { type: "json" };
import manifestJson from "../../../sources/manifest.json" with { type: "json" };
import {
  checkSourceIntegrity,
  type SourceIntegrityReader,
} from "./source-integrity.ts";

const bundledTextByPath = new Map<string, string>([
  ["sources/manifest.json", JSON.stringify(manifestJson)],
  ["rules/auburn/ai-engineering-certificate.json", JSON.stringify(aiCertificateJson)],
  ["rules/auburn/course-planning-metadata.json", JSON.stringify(planningMetadataJson)],
  ["rules/auburn/computer-science-degree.json", JSON.stringify(computerScienceJson)],
  ["rules/auburn/software-engineering-degree.json", JSON.stringify(softwareEngineeringJson)],
  ["rules/auburn/software-engineering-prerequisites.json", JSON.stringify(prerequisitesJson)],
  [
    "sources/auburn/ai-engineering-certificate.html",
    readFileSync(
      path.join(process.cwd(), "sources", "auburn", "ai-engineering-certificate.html"),
      "utf8",
    ),
  ],
  [
    "sources/auburn/computer-science-bulletin.html",
    readFileSync(
      path.join(process.cwd(), "sources", "auburn", "computer-science-bulletin.html"),
      "utf8",
    ),
  ],
  [
    "sources/auburn/software-engineering-bulletin.html",
    readFileSync(
      path.join(process.cwd(), "sources", "auburn", "software-engineering-bulletin.html"),
      "utf8",
    ),
  ],
]);

const bundledReader: SourceIntegrityReader = {
  hasFile: (relativePath) => bundledTextByPath.has(relativePath),
  listRuleFiles: () => [
    "ai-engineering-certificate.json",
    "computer-science-degree.json",
    "course-planning-metadata.json",
    "software-engineering-degree.json",
    "software-engineering-prerequisites.json",
  ],
  readText: (relativePath) => bundledTextByPath.get(relativePath),
};

export function checkBundledSourceIntegrity(checkedAt?: Date | string) {
  return checkSourceIntegrity({ checkedAt, reader: bundledReader });
}

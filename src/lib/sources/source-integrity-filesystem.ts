import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import {
  checkSourceIntegrity,
  type SourceIntegrityReader,
} from "./source-integrity.ts";

export type ProjectSourceIntegrityOptions = {
  projectRoot?: string;
  checkedAt?: Date | string;
};

export function checkProjectSourceIntegrity(
  options: ProjectSourceIntegrityOptions = {},
) {
  const projectRoot = options.projectRoot ?? process.cwd();
  return checkSourceIntegrity({
    checkedAt: options.checkedAt,
    reader: createProjectSourceIntegrityReader(projectRoot),
  });
}

export function createProjectSourceIntegrityReader(
  projectRoot: string,
): SourceIntegrityReader {
  const resolve = (relativePath: string) =>
    path.join(projectRoot, ...relativePath.replace(/\\/g, "/").split("/"));

  return {
    hasFile(relativePath) {
      return existsSync(resolve(relativePath));
    },
    listRuleFiles() {
      const directory = resolve("rules/auburn");
      return existsSync(directory) ? readdirSync(directory) : undefined;
    },
    readText(relativePath) {
      const filePath = resolve(relativePath);
      return existsSync(filePath) ? readFileSync(filePath, "utf8") : undefined;
    },
  };
}

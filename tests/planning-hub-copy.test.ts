import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("Planning Hub public copy is Degree Works-native", async () => {
  const files = await readUiSources([
    "src/app/plan-check/page.tsx",
    "src/app/plan-check/components/plan-check-input-sections.tsx",
    "src/app/plan-check/components/combined-analysis-details.tsx",
    "src/app/plan-check/components/current-progress-details.tsx",
  ]);

  assert.match(files, /Current Progress/);
  assert.match(files, /Planned Path/);
  assert.match(files, /Degree Works-native/);
  assert.doesNotMatch(files, /Rule Audit/);
  assert.doesNotMatch(files, /rule-audit/);
  assert.doesNotMatch(files, /local enrichment/i);
  assert.doesNotMatch(files, /source-backed exact rules/i);
  assert.doesNotMatch(files, /Local rule evidence/);
  assert.doesNotMatch(files, /Program audit details/);
});

test("Chat workspace no longer links to Rule Audit or CSSE-centered copy", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "components", "chat-workspace.tsx"),
    "utf8",
  );

  assert.match(source, /Ask about Auburn academic requirements/);
  assert.match(source, /Planning Hub/);
  assert.doesNotMatch(source, /CSSE Academic Planning Assistant/);
  assert.doesNotMatch(source, /Rule Audit/);
  assert.doesNotMatch(source, /rule-audit/);
});

test("removed route and rule files stay absent", async () => {
  const repoText = await readUiSources([
    "src/app/api/plan/analyze-degreeworks/upload/route.ts",
    "src/app/api/plan/analyze-degreeworks-current/upload/route.ts",
    "src/lib/plan/combined-degreeworks-analysis.ts",
    "src/lib/plan/current-state-next-steps.ts",
  ]);

  assert.doesNotMatch(repoText, /checkAiEngineeringCertificate/);
  assert.doesNotMatch(repoText, /checkSoftwareEngineeringDegree/);
  assert.doesNotMatch(repoText, /checkComputerScienceDegree/);
  assert.doesNotMatch(repoText, /checkSoftwareEngineeringPrerequisites/);
});

async function readUiSources(paths: string[]) {
  const contents = await Promise.all(
    paths.map((relativePath) =>
      readFile(path.join(projectRoot, relativePath), "utf8"),
    ),
  );

  return contents.join("\n");
}

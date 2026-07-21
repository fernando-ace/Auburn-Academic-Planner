import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("Planning Hub public copy is Degree Works-native", async () => {
  const files = await readUiSources([
    "src/app/limitations/page.tsx",
    "src/app/methodology/page.tsx",
    "src/app/plan-check/page.tsx",
    "src/app/plan-check/plan-check-client.tsx",
    "src/app/plan-check/components/advisor-meeting-summary.tsx",
    "src/app/plan-check/components/plan-check-input-sections.tsx",
    "src/app/plan-check/components/planning-hub-draft-controls.tsx",
    "src/app/plan-check/components/combined-analysis-details.tsx",
    "src/app/plan-check/components/current-progress-details.tsx",
  ]);

  assert.match(files, /Current Progress/);
  assert.match(files, /Planned Path/);
  assert.match(files, /Generated Planned Path/);
  assert.match(files, /I only have my own plan/);
  assert.match(files, /Compare my own plan/);
  assert.match(files, /Continue to Advisor Summary/);
  assert.match(files, /Course list parsed, not compared/);
  assert.match(files, /Fall 2026 Credits: 6/);
  assert.match(files, /How to export Current Progress/);
  assert.match(files, /Use the print icon in the top-right toolbar/);
  assert.match(files, /Degree Works-native/);
  assert.match(files, /Generated path settings/);
  assert.match(files, /Nothing is saved automatically/);
  assert.match(files, /Current Progress can save path settings only/);
  assert.match(files, /Save path settings only/);
  assert.match(files, /Save manual plan on this device/);
  assert.match(files, /Download notes/);
  assert.match(files, /Draft saved with limits/);
  assert.match(files, /planned credit totals/);
  assert.match(files, /hint is explicitly unconfirmed/);
  assert.match(files, /extracted audit evidence, and analysis results are never included/);
  assert.match(
    files,
    /does not verify prerequisites, corequisites, actual term offerings, or live seat availability/,
  );
  assert.match(files, /explicit session consent is required/);
  assert.match(
    files,
    /Upload Current Progress too to compare this plan against your actual\s+remaining Degree Works requirements\./,
  );
  assert.match(
    files,
    /Confirm availability, prerequisites, and fit with your advisor\./,
  );
  assert.doesNotMatch(files, /Rule Audit/);
  assert.doesNotMatch(files, /rule-audit/);
  assert.doesNotMatch(files, /local enrichment/i);
  assert.doesNotMatch(files, /source-backed exact rules/i);
  assert.doesNotMatch(files, /Local rule evidence/);
  assert.doesNotMatch(files, /Program audit details/);
  assert.doesNotMatch(files, /Your own plan is checked/);
  assert.doesNotMatch(files, /Degree Works will open a printable plan page/);
});

test("home route points students to Planning Hub first", async () => {
  const source = await readFile(
    path.join(projectRoot, "src", "app", "page.tsx"),
    "utf8",
  );

  assert.match(source, /permanentRedirect\("\/plan-check"\)/);
  assert.doesNotMatch(source, /permanentRedirect\("\/chat"\)/);
});

test("More menu contains stakeholder links without promoting them in Planning Hub empty state", async () => {
  const moreMenu = await readFile(
    path.join(projectRoot, "src", "components", "stakeholder-more-menu.tsx"),
    "utf8",
  );
  const planningHub = await readUiSources([
    "src/app/plan-check/page.tsx",
    "src/app/plan-check/plan-check-client.tsx",
    "src/app/plan-check/components/plan-check-input-sections.tsx",
  ]);

  for (const label of [
    "Privacy",
    "Methodology",
    "Accessibility",
    "Limitations",
    "Pilot Review",
    "Feedback",
  ]) {
    assert.match(moreMenu, new RegExp(label));
  }

  assert.doesNotMatch(planningHub, /\/privacy/);
  assert.doesNotMatch(planningHub, /\/methodology/);
  assert.doesNotMatch(planningHub, /\/accessibility/);
  assert.doesNotMatch(planningHub, /\/limitations/);
  assert.doesNotMatch(planningHub, /\/pilot-review/);
});

test("pilot documentation leads with the generated path and keeps own-plan comparison optional", async () => {
  const readme = await readFile(path.join(projectRoot, "README.md"), "utf8");
  const supportingCopy = await readUiSources([
    "docs/pilot-readiness.md",
    "src/app/pilot-review/template/page.tsx",
  ]);

  assert.match(readme, /automatically generated draft path/i);
  assert.match(readme, /generates a first draft path/i);
  assert.match(readme, /Compare Own Plan optionally parses/i);
  assert.match(readme, /optional own-plan comparison/i);
  assert.ok(
    readme.indexOf("generates a first draft path") <
      readme.indexOf("Compare Own Plan optionally parses"),
  );
  assert.doesNotMatch(readme, /Planned Path is strongest/i);
  assert.doesNotMatch(readme, /Planned Path comparison matches/i);

  assert.match(supportingCopy, /generated path/i);
  assert.match(supportingCopy, /generated-path usefulness/i);
  assert.match(supportingCopy, /optional own-plan comparison/i);
  assert.doesNotMatch(
    supportingCopy,
    /Task: run Current Progress, Planned Path, and Advisor Summary/,
  );
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

test("Planning Hub API routes stay deterministic and do not import Gemini", async () => {
  const apiText = await readUiSources([
    "src/app/api/plan/analyze-degreeworks/upload/route.ts",
    "src/app/api/plan/analyze-degreeworks-current/upload/route.ts",
    "src/app/api/plan/analyze-degreeworks/manual/route.ts",
  ]);

  assert.doesNotMatch(apiText, /@google\/genai/);
  assert.doesNotMatch(apiText, /gemini/i);
});

async function readUiSources(paths: string[]) {
  const contents = await Promise.all(
    paths.map((relativePath) =>
      readFile(path.join(projectRoot, relativePath), "utf8"),
    ),
  );

  return contents.join("\n");
}

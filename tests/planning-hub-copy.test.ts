import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildRuleCoverageAudit } from "../src/lib/rules/rule-coverage-audit.ts";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, "..");

test("Planning Hub page no longer renders CSSE manual check cards", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "plan-check", "page.tsx"),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /Advanced and manual checks/);
  assert.doesNotMatch(pageSource, /AI Certificate Manual Check/);
  assert.doesNotMatch(pageSource, /Software Engineering Degree Progress/);
  assert.doesNotMatch(pageSource, /Computer Science Degree Progress/);
  assert.doesNotMatch(pageSource, /AiCertificateCheckSection/);
  assert.doesNotMatch(pageSource, /DegreeProgressCheckSection/);
});

test("Rule Audit copy frames checked rules as local enrichments", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "rule-audit", "page.tsx"),
    "utf8",
  );

  assert.match(pageSource, /audits currently modeled local enrichments/i);
  assert.match(pageSource, /Degree Works-native analysis/);
  assert.match(pageSource, /other Auburn programs/);
});

test("Chat workspace uses Auburn-wide default product copy", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "components", "chat-workspace.tsx"),
    "utf8",
  );

  assert.doesNotMatch(pageSource, /CSSE Academic Planning Assistant/);
  assert.doesNotMatch(pageSource, /Ask about CSSE requirements/);
  assert.doesNotMatch(pageSource, /ASK ABOUT CSSE REQUIREMENTS/);
  assert.doesNotMatch(pageSource, /CSSE catalog checks/);

  assert.match(pageSource, /Ask about Auburn academic requirements\.\.\./);
  assert.match(pageSource, /Ask about Auburn planning/);
  assert.match(pageSource, /Source-grounded academic planning conversations/);
  assert.match(pageSource, /How does Auburn handle transfer credit\?/);
  assert.match(pageSource, /What is Degree Works used for\?/);
  assert.match(pageSource, /How do Auburn core curriculum requirements work\?/);
  assert.match(pageSource, /What should I verify with my advisor before registration\?/);
  assert.match(pageSource, /What is the difference between Current Progress and Planned Path\?/);
});

test("Planning Hub broad copy stays Degree Works-native and universal-first", async () => {
  const inputSectionSource = await readFile(
    path.join(
      projectRoot,
      "src",
      "app",
      "plan-check",
      "components",
      "plan-check-input-sections.tsx",
    ),
    "utf8",
  );
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "plan-check", "page.tsx"),
    "utf8",
  );
  const broadCopy = `${inputSectionSource}\n${pageSource}`;

  assert.doesNotMatch(broadCopy, /CSSE catalog checks/);
  assert.match(inputSectionSource, /Auto-detected program/);
  assert.match(inputSectionSource, /Use Degree Works audit only/);
  assert.match(inputSectionSource, /Software Engineering local enrichment/);
  assert.match(inputSectionSource, /Computer Science local enrichment/);
  assert.match(inputSectionSource, /AI certificate local enrichment/);
  assert.match(
    inputSectionSource,
    /Degree Works-native analysis works for readable Auburn audits/,
  );
  assert.match(
    pageSource,
    /Works from Degree\s+Works-native requirements for any Auburn program with readable\s+PDF text/,
  );
  assert.match(
    pageSource,
    /Local catalog enrichments are optional and only appear\s+when available/,
  );
});

test("Rule Audit and result details can still mention modeled local programs", async () => {
  const audit = buildRuleCoverageAudit();
  const auditedProgramNames = audit.programs.map((program) => program.programName);

  assert.ok(auditedProgramNames.some((name) => name.includes("Software Engineering")));
  assert.ok(auditedProgramNames.some((name) => name.includes("Computer Science")));
  assert.ok(
    auditedProgramNames.some((name) =>
      name.includes("Artificial Intelligence Engineering"),
    ),
  );

  const planCheckPageSource = await readFile(
    path.join(projectRoot, "src", "app", "plan-check", "page.tsx"),
    "utf8",
  );
  const currentProgressDetailsSource = await readFile(
    path.join(
      projectRoot,
      "src",
      "app",
      "plan-check",
      "components",
      "current-progress-details.tsx",
    ),
    "utf8",
  );

  assert.match(planCheckPageSource, /Software Engineering degree progress result/);
  assert.match(planCheckPageSource, /Computer Science degree progress result/);
  assert.match(planCheckPageSource, /AI Engineering certificate result/);
  assert.match(currentProgressDetailsSource, /Detected program/);
});

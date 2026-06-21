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

test("Rule Audit copy frames checked rules as local deterministic coverage", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "rule-audit", "page.tsx"),
    "utf8",
  );

  assert.match(pageSource, /Current local deterministic models are available for selected\s+programs/);
  assert.match(pageSource, /Planning Hub uses Degree Works-native\s+analysis for all readable Auburn audits/);
  assert.match(pageSource, /coverage audit/);
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
  assert.doesNotMatch(inputSectionSource, /Use Degree Works audit only/);
  assert.doesNotMatch(inputSectionSource, /Software Engineering local enrichment/);
  assert.doesNotMatch(inputSectionSource, /Computer Science local enrichment/);
  assert.doesNotMatch(inputSectionSource, /AI certificate local enrichment/);
  assert.match(
    inputSectionSource,
    /Degree Works-native analysis is used for all readable Auburn audits/,
  );
  assert.match(
    pageSource,
    /Works from Degree\s+Works-native requirements for any Auburn program with readable\s+PDF text/,
  );
  assert.match(
    pageSource,
    /Local deterministic models are documented as secondary\s+rule coverage/,
  );
});

test("Current Progress source leads with action summary before collapsed evidence", async () => {
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

  assert.match(currentProgressDetailsSource, /Current standing/);
  assert.match(currentProgressDetailsSource, /Top priorities/);
  assert.match(currentProgressDetailsSource, /Courses to discuss next/);
  assert.match(currentProgressDetailsSource, /Details and evidence/);
  assert.match(currentProgressDetailsSource, /Detailed course evidence/);
  assert.doesNotMatch(currentProgressDetailsSource, /Top incomplete blocks/);
  assert.doesNotMatch(currentProgressDetailsSource, /Top still-needed requirements/);
  assert.doesNotMatch(currentProgressDetailsSource, /ResultSection title="Course status buckets"/);
});

test("Planned Path source summarizes before collapsed detailed audits", async () => {
  const pageSource = await readFile(
    path.join(projectRoot, "src", "app", "plan-check", "page.tsx"),
    "utf8",
  );
  const combinedDetailsSource = await readFile(
    path.join(
      projectRoot,
      "src",
      "app",
      "plan-check",
      "components",
      "combined-analysis-details.tsx",
    ),
    "utf8",
  );

  assert.match(pageSource, /PlannedPathOverviewCard/);
  assert.match(combinedDetailsSource, /Planned path overview/);
  assert.match(combinedDetailsSource, /Plan coverage/);
  assert.match(combinedDetailsSource, /Detailed audits and evidence/);
  assert.match(combinedDetailsSource, /Detailed course evidence/);
  assert.match(combinedDetailsSource, /Parser diagnostics/);
  assert.match(combinedDetailsSource, /Parsed Degree Works text evidence/);
  assert.match(combinedDetailsSource, /Local rule\/provenance details/);
  assert.match(combinedDetailsSource, /Program audit details/);
  assert.doesNotMatch(combinedDetailsSource, /Parser and planning evidence/);
});

test("Rule Audit and collapsed diagnostics can still mention modeled local programs", async () => {
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

  assert.doesNotMatch(planCheckPageSource, /Software Engineering degree progress result/);
  assert.doesNotMatch(planCheckPageSource, /Computer Science degree progress result/);
  assert.doesNotMatch(planCheckPageSource, /AI Engineering certificate result/);
  assert.match(currentProgressDetailsSource, /Detected program/);
  assert.match(currentProgressDetailsSource, /Local rule evidence/);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanSourcePreview,
  formatSourceTypeLabel,
  sanitizeAssistantMarkdown,
  selectDisplaySources,
  SOURCE_PREVIEW_FALLBACK,
  SOURCE_RELEVANCE_FALLBACK_NOTE,
  type PresentableChatSource,
} from "../src/lib/chat-presentation.ts";

const softwareBulletin: PresentableChatSource = {
  title: "Software Engineering B.S. Bulletin",
  sourceType: "bulletin",
  program: "software_engineering",
  catalogYear: "2025-2026",
  fileName: "auburn/software-engineering-bulletin.html",
  snippet:
    "The Software Engineering curriculum includes engineering, computing, and university core requirements.",
};

const softwareFlowchart: PresentableChatSource = {
  title: "Software Engineering Flowchart",
  sourceType: "flowchart",
  program: "software_engineering",
  fileName: "auburn/software-engineering-flowchart.pdf",
};

const computerScienceBulletin: PresentableChatSource = {
  title: "Computer Science B.S. Bulletin",
  sourceType: "bulletin",
  program: "computer_science",
  fileName: "auburn/computer-science-bulletin.html",
};

const degreeWorksDashboard: PresentableChatSource = {
  title: "Degree Works Dashboard Sample",
  sourceType: "degreeworks_sample",
  program: "software_engineering",
  fileName: "auburn/degreeworks-dashboard-sample.pdf",
};

const degreeWorksPlan: PresentableChatSource = {
  title: "Degree Works Plan Sample",
  sourceType: "degreeworks_sample",
  program: "software_engineering",
  fileName: "auburn/degreeworks-plan-sample.pdf",
};

const transferCreditPolicy: PresentableChatSource = {
  title: "Undergraduate Transfer Credit Policy",
  sourceType: "transfer_credit",
  fileName: "auburn/curated/auburn-transfer-credit-policy.html",
};

const registrarCreditTables: PresentableChatSource = {
  title: "Registrar Credit Tables",
  sourceType: "ap_credit",
  fileName: "auburn/curated/auburn-registrar-credit-tables.html",
};

test("sanitizes assistant markdown without removing supported markdown syntax", () => {
  const result = sanitizeAssistantMarkdown(
    "\u0000**Requirements**\r\n\r\n<script>alert('no')</script>\r\n- `COMP 1210`",
  );

  assert.equal(
    result,
    "**Requirements**\n\nalert('no')\n- `COMP 1210`",
  );
  assert.doesNotMatch(result, /<script>|<\/script>/);
});

test("cleans PDF, OCR, page, and HTML extraction noise from source previews", () => {
  const result = cleanSourcePreview(
    "==Start of PDF== ==Start of OCR== Page 2 of 8 <table><tr><td>Software Engineering students complete the listed curriculum requirements before graduation.</td></tr></table> ==End of OCR==",
  );

  assert.equal(
    result,
    "Software Engineering students complete the listed curriculum requirements before graduation.",
  );
  assert.doesNotMatch(result, /Start of|OCR|<td>|<\/tr>|Page 2/i);
});

test("uses metadata fallback for short or code-like source previews", () => {
  assert.equal(cleanSourcePreview("</td></tr>"), SOURCE_PREVIEW_FALLBACK);
  assert.equal(
    cleanSourcePreview("function renderSource() { return rawHtml; } with several extra words here"),
    SOURCE_PREVIEW_FALLBACK,
  );
});

test("caps long source previews without cutting the final word", () => {
  const result = cleanSourcePreview(
    "Software Engineering curriculum requirements include mathematics, science, computing, engineering, and university core courses that students should review with an academic advisor before registration decisions.",
    100,
  );

  assert.ok(result.length <= 100);
  assert.match(result, /…$/);
  assert.doesNotMatch(result, /\s…$/);
});

test("general Software Engineering questions prefer bulletin and exclude Degree Works samples", () => {
  const result = selectDisplaySources(
    "What are the Software Engineering degree requirements?",
    [
      degreeWorksDashboard,
      computerScienceBulletin,
      softwareFlowchart,
      degreeWorksPlan,
      softwareBulletin,
    ],
  );

  assert.equal(result[0].title, softwareBulletin.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [softwareBulletin.title, softwareFlowchart.title],
  );
});

test("cross-program comparisons retain sources for both named programs", () => {
  const result = selectDisplaySources(
    "How does Computer Science differ from Software Engineering?",
    [computerScienceBulletin, softwareBulletin, degreeWorksDashboard],
  );

  assert.deepEqual(
    new Set(result.map((source) => source.program)),
    new Set(["computer_science", "software_engineering"]),
  );
  assert.ok(result.every((source) => source.sourceType !== "degreeworks_sample"));
});

test("Degree Works and personal-plan questions retain matching sample sources", () => {
  const dashboardResult = selectDisplaySources(
    "What does my Degree Works dashboard show?",
    [softwareBulletin, degreeWorksPlan, degreeWorksDashboard],
  );
  const planResult = selectDisplaySources(
    "Which certificate courses are in my plan?",
    [softwareBulletin, degreeWorksPlan],
  );

  assert.equal(dashboardResult[0].title, degreeWorksDashboard.title);
  assert.ok(planResult.some((source) => source.title === degreeWorksPlan.title));
});

test("keeps the best retrieved source with a caveat when filtering removes everything", () => {
  const result = selectDisplaySources(
    "What are the Software Engineering degree requirements?",
    [degreeWorksDashboard, degreeWorksPlan],
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].relevanceNote, SOURCE_RELEVANCE_FALLBACK_NOTE);
  assert.equal(result[0].snippet, SOURCE_PREVIEW_FALLBACK);
});

test("transfer credit questions prefer curated transfer policy sources", () => {
  const result = selectDisplaySources(
    "How does Auburn handle transfer credit?",
    [softwareBulletin, registrarCreditTables, transferCreditPolicy],
  );

  assert.equal(result[0].title, transferCreditPolicy.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [
      transferCreditPolicy.title,
      registrarCreditTables.title,
      softwareBulletin.title,
    ],
  );
});

test("formats curated source type labels for source cards", () => {
  assert.equal(
    formatSourceTypeLabel("transfer_credit"),
    "Transfer credit policy",
  );
  assert.equal(formatSourceTypeLabel("registrar"), "Registrar page");
  assert.equal(formatSourceTypeLabel("course_catalog"), "Course catalog");
});

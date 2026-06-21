import assert from "node:assert/strict";
import test from "node:test";

import {
  cleanSourcePreview,
  formatSourceTypeLabel,
  sanitizeAssistantMarkdown,
  selectDisplaySources,
  SOURCE_PREVIEW_FALLBACK,
  type PresentableChatSource,
} from "../src/lib/chat-presentation.ts";

const transferCreditPolicy: PresentableChatSource = {
  title: "Undergraduate Transfer Credit Policy",
  sourceType: "transfer_credit",
  fileName: "auburn/curated/auburn-transfer-credit-policy.html",
  snippet:
    "Transfer credit accepted by Auburn University may be applied toward degree requirements after review.",
};

const registrarCreditTables: PresentableChatSource = {
  title: "Registrar Credit Tables",
  sourceType: "ap_credit",
  fileName: "auburn/curated/auburn-registrar-credit-tables.html",
};

const degreeWorksSource: PresentableChatSource = {
  title: "DegreeWorks",
  sourceType: "registrar",
  fileName: "auburn/curated/auburn-registrar-degreeworks.html",
};

const coreCurriculum: PresentableChatSource = {
  title: "Core Curriculum and General Education Outcomes",
  sourceType: "core_curriculum",
  fileName: "auburn/curated/auburn-core-curriculum.html",
};

test("sanitizes assistant markdown without removing supported markdown syntax", () => {
  const result = sanitizeAssistantMarkdown(
    "\u0000**Requirements**\r\n\r\n<script>alert('no')</script>\r\n- `ENGL 1100`",
  );

  assert.equal(result, "**Requirements**\n\nalert('no')\n- `ENGL 1100`");
  assert.doesNotMatch(result, /<script>|<\/script>/);
});

test("cleans OCR, page, and HTML extraction noise from source previews", () => {
  const result = cleanSourcePreview(
    "==Start of OCR== Page 2 of 8 <table><tr><td>Auburn students should review academic requirements with an advisor before registration decisions.</td></tr></table> ==End of OCR==",
  );

  assert.equal(
    result,
    "Auburn students should review academic requirements with an advisor before registration decisions.",
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

test("transfer credit questions prefer curated transfer policy sources", () => {
  const result = selectDisplaySources(
    "How does Auburn handle transfer credit?",
    [degreeWorksSource, registrarCreditTables, transferCreditPolicy],
  );

  assert.equal(result[0].title, transferCreditPolicy.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [transferCreditPolicy.title, registrarCreditTables.title],
  );
});

test("Degree Works questions prefer the curated registrar source", () => {
  const result = selectDisplaySources(
    "What is Degree Works used for?",
    [coreCurriculum, transferCreditPolicy, degreeWorksSource],
  );

  assert.equal(result[0].title, degreeWorksSource.title);
});

test("formats curated source type labels for source cards", () => {
  assert.equal(formatSourceTypeLabel("transfer_credit"), "Transfer credit policy");
  assert.equal(formatSourceTypeLabel("registrar"), "Registrar page");
  assert.equal(formatSourceTypeLabel("course_catalog"), "Course catalog");
});

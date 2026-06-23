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

const financeMajor: PresentableChatSource = {
  title: "Finance",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-finance.html",
  snippet:
    "Finance students complete Auburn University major requirements listed in the Bulletin.",
};

const marketingMajor: PresentableChatSource = {
  title: "Marketing",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-marketing.html",
};

const economicsPrimaryTrack: PresentableChatSource = {
  title: "Economics \u2014 Primary Track",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-economics-primarytrack.html",
};

const nursingTraditional: PresentableChatSource = {
  title: "Nursing \u2014 Traditional",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-nursingtraditional.html",
};

const nursingRnBsn: PresentableChatSource = {
  title: "RN \u2014 BSN",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-nursingrntobsn.html",
};

const histotechnologyMajor: PresentableChatSource = {
  title: "Laboratory Science - Histotechnology Track",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-laboratoryhistotechnology.html",
};

const exerciseScienceMajor: PresentableChatSource = {
  title: "Exercise Science",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-exercisescience.html",
};

const psychologyMajor: PresentableChatSource = {
  title: "Psychology",
  sourceType: "bulletin_major",
  fileName: "auburn/majors/auburn-major-psychology.html",
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
    cleanSourcePreview(
      "<tr><td class=\"codecol\"><a href=\"/search/?P=FINC%203610\">FINC&nbsp;3610</a></td></tr>",
    ),
    SOURCE_PREVIEW_FALLBACK,
  );
  assert.equal(
    cleanSourcePreview("function renderSource() { return rawHtml; } with several extra words here"),
    SOURCE_PREVIEW_FALLBACK,
  );
});

test("transfer credit questions prefer curated transfer policy sources", () => {
  const result = selectDisplaySources(
    "How does Auburn handle transfer credit?",
    [degreeWorksSource, registrarCreditTables, transferCreditPolicy, nursingTraditional],
  );

  assert.equal(result[0].title, transferCreditPolicy.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [transferCreditPolicy.title, registrarCreditTables.title],
  );
});

test("Finance major questions prioritize Finance and suppress unrelated major cards", () => {
  const result = selectDisplaySources(
    "What are the requirements for the Finance major?",
    [marketingMajor, economicsPrimaryTrack, financeMajor, coreCurriculum],
  );

  assert.equal(result[0].title, financeMajor.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [financeMajor.title, coreCurriculum.title],
  );
});

test("Nursing major questions prioritize Nursing pages and suppress unrelated health-major cards", () => {
  const result = selectDisplaySources(
    "What are the requirements for Nursing?",
    [
      histotechnologyMajor,
      exerciseScienceMajor,
      nursingTraditional,
      nursingRnBsn,
      coreCurriculum,
    ],
  );

  assert.deepEqual(
    result.map((source) => source.title),
    [nursingTraditional.title, nursingRnBsn.title, coreCurriculum.title],
  );
});

test("Core curriculum questions still allow the core curriculum source", () => {
  const result = selectDisplaySources(
    "How do Auburn core curriculum requirements work?",
    [marketingMajor, coreCurriculum, financeMajor],
  );

  assert.equal(result[0].title, coreCurriculum.title);
  assert.deepEqual(
    result.map((source) => source.title),
    [coreCurriculum.title],
  );
});

test("falls back to current display behavior when no exact major source matches", () => {
  const result = selectDisplaySources(
    "What are the requirements for Aerospace Studies?",
    [marketingMajor, economicsPrimaryTrack, psychologyMajor],
  );

  assert.deepEqual(
    result.map((source) => source.title),
    [marketingMajor.title, economicsPrimaryTrack.title, psychologyMajor.title],
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

import assert from "node:assert/strict";
import test from "node:test";

import {
  MAX_EXTRACTED_PDF_TEXT_LENGTH,
  MAX_PDF_UPLOAD_BYTES,
  validatePdfUpload,
} from "../src/lib/api/pdf-upload-validation.ts";

test("rejects a missing PDF file", async () => {
  const result = await validatePdfUpload(null);

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("rejects a non-PDF upload", async () => {
  const result = await validatePdfUpload(
    new File(["not a pdf"], "notes.txt", { type: "text/plain" }),
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("rejects a PDF larger than 10 MiB", async () => {
  const result = await validatePdfUpload(
    new File(
      [new Uint8Array(MAX_PDF_UPLOAD_BYTES + 1)],
      "oversized.pdf",
      { type: "application/pdf" },
    ),
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("rejects a file without a PDF header", async () => {
  const result = await validatePdfUpload(
    new File(["plain text"], "fake.pdf", { type: "application/pdf" }),
  );

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 400);
});

test("returns a friendly error when PDF parsing fails", async () => {
  const result = await validatePdfUpload(validPdfFile(), {
    extractText: async () => {
      throw new Error("parser detail should not escape");
    },
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 422);
    assert.match(result.error, /could not be parsed/i);
    assert.doesNotMatch(result.error, /parser detail/i);
  }
});

test("rejects a PDF with no readable extracted text", async () => {
  const result = await validatePdfUpload(validPdfFile(), {
    extractText: async () => " \n\t ",
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);
});

test("rejects excessive extracted PDF text", async () => {
  const result = await validatePdfUpload(validPdfFile(), {
    extractText: async () => "A".repeat(MAX_EXTRACTED_PDF_TEXT_LENGTH + 1),
  });

  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 422);
});

function validPdfFile() {
  return new File(["%PDF-1.7\n"], "degreeworks.pdf", {
    type: "application/pdf",
  });
}

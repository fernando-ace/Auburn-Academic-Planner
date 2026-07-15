import assert from "node:assert/strict";
import test from "node:test";

import {
  getPdfUploadSizeError,
  MAX_PDF_UPLOAD_BYTES,
} from "../src/lib/api/pdf-upload-policy.ts";

test("accepts a PDF at the deployment-safe upload limit", () => {
  assert.equal(getPdfUploadSizeError(MAX_PDF_UPLOAD_BYTES), null);
});

test("returns a useful client error above the upload limit", () => {
  assert.equal(
    getPdfUploadSizeError(MAX_PDF_UPLOAD_BYTES + 1),
    "Choose a PDF that is 4 MiB or smaller.",
  );
});

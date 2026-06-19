import assert from "node:assert/strict";
import test from "node:test";

import { POST as analyzeDegreeWorks } from "../src/app/api/plan/analyze-degreeworks/upload/route.ts";
import { POST as checkAiCertificate } from "../src/app/api/plan/check-ai-certificate/upload/route.ts";
import { POST as checkComputerScience } from "../src/app/api/plan/check-computer-science/upload/route.ts";
import { POST as checkSoftwareEngineering } from "../src/app/api/plan/check-software-engineering/upload/route.ts";
import { MAX_PDF_UPLOAD_BYTES } from "../src/lib/api/pdf-upload-validation.ts";

const uploadRoutes = [
  ["combined Degree Works", analyzeDegreeWorks],
  ["AI certificate", checkAiCertificate],
  ["Software Engineering", checkSoftwareEngineering],
  ["Computer Science", checkComputerScience],
] as const;

for (const [routeName, post] of uploadRoutes) {
  test(`${routeName} route rejects a non-PDF upload`, async () => {
    const response = await post(
      uploadRequest(
        new File(["not a pdf"], "notes.txt", { type: "text/plain" }),
      ),
    );
    const payload = (await response.json()) as { error?: string };

    assert.equal(response.status, 400);
    assert.match(payload.error ?? "", /must be a PDF/i);
  });

  test(`${routeName} route rejects an oversized PDF`, async () => {
    const response = await post(
      uploadRequest(
        new File(
          [new Uint8Array(MAX_PDF_UPLOAD_BYTES + 1)],
          "oversized.pdf",
          { type: "application/pdf" },
        ),
      ),
    );
    const payload = (await response.json()) as { error?: string };

    assert.equal(response.status, 413);
    assert.match(payload.error ?? "", /10 MiB or smaller/i);
  });
}

function uploadRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return new Request("http://localhost/api/plan/upload", {
    method: "POST",
    body: formData,
  });
}

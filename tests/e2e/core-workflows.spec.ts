import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { MAX_PDF_UPLOAD_BYTES } from "../../src/lib/api/pdf-upload-policy";

test("Current Progress PDF generates a draft path and advisor summary", async ({
  page,
}) => {
  const worksheetText = await readFile(
    path.join(
      process.cwd(),
      "tests",
      "fixtures",
      "degreeworks",
      "worksheet-current-audit-sample.txt",
    ),
    "utf8",
  );

  await page.goto("/plan-check");
  await page.getByLabel("Worksheet PDF").setInputFiles({
    buffer: Buffer.from(makePdf(worksheetText)),
    mimeType: "application/pdf",
    name: "synthetic-current-progress.pdf",
  });
  await page.getByRole("button", { name: "Check Current Progress" }).click();

  await expect(
    page.getByRole("heading", {
      name: "Draft path from your Current Progress",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/BSWE Software Engineering/).first(),
  ).toBeVisible();

  const advisorStep = page.getByTestId("planning-step-advisor_summary");
  await expect(advisorStep).toBeEnabled();
  await advisorStep.click();
  await expect(
    page.getByRole("heading", { name: "Advisor Meeting Summary" }),
  ).toBeVisible();
});

test("Chat API rejects an empty conversation before model execution", async ({
  request,
}) => {
  const response = await request.post("/api/chat", {
    data: { messages: [] },
  });

  expect(response.status()).toBe(400);
  expect(await response.json()).toEqual({
    error: "Request body must include at least one valid chat message.",
  });
});

test("oversized PDFs are rejected before upload", async ({ page }) => {
  await page.goto("/plan-check");
  await page.getByLabel("Worksheet PDF").setInputFiles({
    buffer: Buffer.alloc(MAX_PDF_UPLOAD_BYTES + 1),
    mimeType: "application/pdf",
    name: "oversized-current-progress.pdf",
  });

  await expect(
    page.getByRole("alert").filter({ hasText: "Choose a PDF that is 4 MiB or smaller." }),
  ).toBeVisible();
  await expect(page.getByText("Selected: PDF ready")).toHaveCount(0);
});

function makePdf(text: string) {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) =>
      `BT /F1 9 Tf 32 ${760 - index * 12} Td (${line}) Tj ET`,
    )
    .join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${escaped.length} >>\nstream\n${escaped}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = "%PDF-1.7\n";

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return pdf;
}

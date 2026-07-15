import { readFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { MAX_PDF_UPLOAD_BYTES } from "../../src/lib/api/pdf-upload-policy";
import { PLANNING_HUB_DRAFT_STORAGE_KEY } from "../../src/lib/plan/planning-hub-device-draft";

test("Current Progress PDF generates a draft path and advisor summary", async ({
  page,
}) => {
  test.setTimeout(60_000);

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
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "What this draft checked" }),
  ).toBeVisible();
  await expect(
    page.getByText("Prerequisites and corequisites: Not checked"),
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
  await expect(
    page.getByRole("textbox", { name: "Advisor Meeting Summary" }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download notes" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^auburn-advisor-notes-\d{4}-\d{2}-\d{2}\.txt$/);
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const downloadedNotes = await readFile(downloadPath as string, "utf8");
  expect(downloadedNotes).toContain("Advisor Meeting Summary");
  expect(downloadedNotes).toContain("not an official degree audit");
});

test("manual plan device draft is opt-in, minimized, restorable, and deletable", async ({
  page,
}) => {
  await page.goto("/plan-check");
  await page.getByTestId("planning-step-planned_path").click();
  await page.getByRole("button", { name: "Paste courses" }).click();
  await page.getByLabel("Planned courses").fill([
    "Student: Aubie Tiger",
    "Student ID: 903123456",
    "Total Planned Credits: 6",
    "Fall 2026 Credits: 6",
    "COMP 1210, MATH 1610",
    "Private note: meet with Dr. Example",
  ].join("\n"));

  expect(
    await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      PLANNING_HUB_DRAFT_STORAGE_KEY,
    ),
  ).toBeNull();

  await page
    .getByRole("button", { name: "Save manual plan on this device" })
    .click();
  await expect(page.getByRole("status")).toContainText("Manual plan draft saved");

  const serializedDraft = await page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    PLANNING_HUB_DRAFT_STORAGE_KEY,
  );
  expect(serializedDraft).toContain("COMP 1210");
  expect(serializedDraft).not.toContain("Aubie Tiger");
  expect(serializedDraft).not.toContain("903123456");
  expect(serializedDraft).not.toContain("Dr. Example");

  await page.reload();
  const restoreButton = page.getByRole("button", { name: "Restore" });
  await expect(restoreButton).toBeEnabled();
  await restoreButton.click();

  const restoredPlan = page.getByLabel("Planned courses");
  await expect(restoredPlan).toHaveValue(/Fall 2026 Credits: 6/);
  await expect(restoredPlan).toHaveValue(/COMP 1210, MATH 1610/);
  await expect(restoredPlan).not.toHaveValue(/Aubie Tiger/);
  await expect(page.getByRole("status")).toContainText("Manual plan draft restored");

  await page.getByRole("button", { name: "Delete saved draft" }).click();
  await expect(page.getByRole("status")).toContainText("Saved draft deleted");
  expect(
    await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      PLANNING_HUB_DRAFT_STORAGE_KEY,
    ),
  ).toBeNull();
});

test("Current Progress saves settings only and rechecks expiry before restore", async ({
  page,
}) => {
  await page.goto("/plan-check");
  await page.getByLabel("Max fall/spring credits").fill("18");
  await page.getByLabel("Include summer terms").check();

  await page.getByRole("button", { name: "Save path settings only" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Path settings saved only",
  );

  const serializedDraft = await page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    PLANNING_HUB_DRAFT_STORAGE_KEY,
  );
  expect(serializedDraft).not.toBeNull();
  if (!serializedDraft) {
    throw new Error("Expected a Current Progress settings draft.");
  }
  expect(serializedDraft).not.toContain("manualPlan");
  expect(serializedDraft).not.toContain("sourceFileName");
  expect(serializedDraft).not.toContain("currentProgressAnalysis");

  await page.reload();
  const restoreSettingsButton = page.getByRole("button", {
    name: "Restore settings",
  });
  await expect(restoreSettingsButton).toBeEnabled();
  await restoreSettingsButton.click();
  await expect(page.getByLabel("Max fall/spring credits")).toHaveValue("18");
  await expect(page.getByLabel("Include summer terms")).toBeChecked();
  await expect(page.getByRole("status")).toContainText("Path settings restored");

  await page.evaluate((storageKey) => {
    const serialized = window.localStorage.getItem(storageKey);
    if (!serialized) {
      throw new Error("Expected saved settings draft.");
    }
    const draft = JSON.parse(serialized) as Record<string, unknown>;
    const now = Date.now();
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...draft,
        savedAt: new Date(now - 29 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(now - 1000).toISOString(),
      }),
    );
  }, PLANNING_HUB_DRAFT_STORAGE_KEY);

  await restoreSettingsButton.click();
  await expect(page.getByRole("status")).toContainText(
    "saved device draft expired and was deleted",
  );
  await expect(restoreSettingsButton).toBeDisabled();
  expect(
    await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      PLANNING_HUB_DRAFT_STORAGE_KEY,
    ),
  ).toBeNull();
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

test("Chat consent gates sending and reset revokes the session", async ({
  page,
}) => {
  await page.goto("/chat");

  const input = page.getByLabel("Ask about Auburn academic requirements");
  const sendButton = page.getByRole("button", { name: "Send question" });
  await input.fill("How does Degree Works help with planning?");
  await expect(sendButton).toBeDisabled();

  await page
    .getByRole("checkbox", {
      name: /I agree to send this Chat content to Google Gemini/,
    })
    .click();
  await expect(sendButton).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Reset chat and revoke consent" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Reset chat and revoke consent" })
    .click();
  await expect(input).toHaveValue("");
  await expect(sendButton).toBeDisabled();
  await expect(
    page.getByRole("checkbox", {
      name: /I agree to send this Chat content to Google Gemini/,
    }),
  ).toBeVisible();
});

test("Chat reset ignores a response that resolves after consent is revoked", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (!url.endsWith("/api/chat")) {
        return nativeFetch(input, init);
      }

      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          resolve(
            new Response(
              JSON.stringify({
                answer: "Delayed answer that must stay cleared.",
                sources: [],
                confidence: "Low",
                advisorVerificationNote: "Verify with an advisor.",
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 200,
              },
            ),
          );
        }, 250);
      });
    }) as typeof fetch;
  });

  await page.goto("/chat");
  await page
    .getByLabel("Ask about Auburn academic requirements")
    .fill("How should I prepare for registration?");
  await page
    .getByRole("checkbox", {
      name: /I agree to send this Chat content to Google Gemini/,
    })
    .click();
  await page.getByRole("button", { name: "Send question" }).click();
  await page
    .getByRole("button", { name: "Reset chat and revoke consent" })
    .click();

  await expect(page.getByRole("status")).toContainText(
    "Chat cleared. Gemini consent is off.",
  );
  await page.waitForTimeout(400);
  await expect(
    page.getByText("Delayed answer that must stay cleared."),
  ).toHaveCount(0);
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

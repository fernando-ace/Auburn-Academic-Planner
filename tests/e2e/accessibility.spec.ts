import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/plan-check",
  "/chat",
  "/privacy",
  "/methodology",
  "/accessibility",
  "/limitations",
  "/pilot-review",
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route} has no horizontal overflow and passes axe on ${viewport.name}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto(route);

      await expect(page.locator("body")).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
}

test("More menu opens and closes with pointer and keyboard", async ({ page }) => {
  await page.goto("/plan-check");

  const moreButton = page.getByRole("button", { name: /^More$/ });
  const menu = page.getByRole("menu", { name: "Stakeholder pages" });

  await moreButton.click();
  await expect(menu).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Privacy" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  await moreButton.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
});

test("Planning Hub wizard starts on Current Progress with Advisor Summary locked", async ({
  page,
}) => {
  await page.goto("/plan-check");

  await expect(page.getByRole("heading", { name: "Step 1: Current Progress" })).toBeVisible();
  await expect(page.getByTestId("planning-step-current_progress")).toHaveAttribute("aria-current", "step");
  await expect(page.getByTestId("planning-step-advisor_summary")).toBeDisabled();
  await expect(page.getByRole("button", { name: "I only have my own plan" })).toBeVisible();
  await expect(
    page.locator("details").filter({ hasText: "How to export Current Progress" }),
  ).toHaveJSProperty("open", false);
});

test("Planning Hub moves from Current Progress to Planned Path and back", async ({
  page,
}) => {
  await page.goto("/plan-check");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "I only have my own plan" }).click();
  await expect(page.getByRole("heading", { name: "Step 2: Planned Path" })).toBeVisible();
  await expect(page.getByTestId("planning-step-planned_path")).toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("button", { name: "Upload PDF" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Paste courses" })).toBeVisible();
  await expect(page.getByTestId("planning-step-advisor_summary")).toBeDisabled();

  await page.getByRole("button", { name: "Back to Current Progress" }).click();
  await expect(page.getByRole("heading", { name: "Step 1: Current Progress" })).toBeVisible();
  await expect(page.getByTestId("planning-step-current_progress")).toHaveAttribute("aria-current", "step");
});

test("standalone manual Planned Path is parsed without claiming a requirements comparison", async ({
  page,
}) => {
  await page.goto("/plan-check");
  await page.waitForLoadState("networkidle");

  await page.getByRole("button", { name: "I only have my own plan" }).click();
  await expect(page.getByRole("heading", { name: "Step 2: Planned Path" })).toBeVisible();
  await page.getByRole("button", { name: "Paste courses" }).click();
  await page
    .getByLabel("Planned courses")
    .fill(
      "Total Planned Credits: 12\nFall 2026 Credits: 6\nBIOL 1020, CHEM 1030\nSpring 2027 Credits: 6\nMATH 1610, CSES 2040",
    );
  await page.getByRole("button", { name: "Check Planned Path" }).click();

  await expect(page.getByRole("heading", { name: "Planned path overview" })).toBeVisible();
  await expect(page.getByText("Course and term parsing only; no Degree Works requirements were compared.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fall 2026", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spring 2027", exact: true })).toBeVisible();
  await expect(page.getByTestId("planning-step-planned_path")).toHaveAccessibleName(/Parsed only/);
  await expect(page.getByTestId("planning-step-advisor_summary")).toBeDisabled();
  await expect(page.getByTestId("planning-step-advisor_summary")).toHaveAccessibleName(/Needs Current Progress/);
  await expect(page.getByRole("button", { name: "Continue to Advisor Summary" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Current Progress to compare" })).toBeVisible();
});

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;

    return {
      documentScrollWidth: documentElement.scrollWidth,
      documentClientWidth: documentElement.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
    };
  });

  expect(overflow.documentScrollWidth).toBeLessThanOrEqual(
    overflow.documentClientWidth + 1,
  );
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(
    overflow.bodyClientWidth + 1,
  );
}

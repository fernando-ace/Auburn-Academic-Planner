import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { getSiteUrl } from "../../src/lib/site-metadata";

const routes = [
  { path: "/plan-check", title: "Planning Hub | Auburn Academic Planner" },
  { path: "/chat", title: "Source-Grounded Chat | Auburn Academic Planner" },
  { path: "/privacy", title: "Privacy | Auburn Academic Planner" },
  { path: "/methodology", title: "Methodology | Auburn Academic Planner" },
  { path: "/accessibility", title: "Accessibility | Auburn Academic Planner" },
  { path: "/limitations", title: "Limitations | Auburn Academic Planner" },
  { path: "/feedback", title: "Feedback | Auburn Academic Planner" },
  { path: "/pilot-review", title: "Pilot Review | Auburn Academic Planner" },
  {
    path: "/pilot-review/template",
    title: "Pilot Readiness Template | Auburn Academic Planner",
  },
] as const;

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow mobile", width: 320, height: 700 },
] as const;

for (const route of routes) {
  for (const viewport of viewports) {
    test(`${route.path} has no horizontal overflow and passes axe on ${viewport.name}`, async ({
      page,
    }) => {
      const runtimeErrors = monitorRuntimeErrors(page);
      await page.setViewportSize(viewport);
      await page.goto(route.path);

      await expect(page.locator("body")).toBeVisible();
      await expect(page).toHaveTitle(route.title);
      await expectNoHorizontalOverflow(page);

      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
      expect(runtimeErrors).toEqual([]);
    });
  }
}

test("public metadata identifies canonical routes and share assets", async (
  { page, request },
  testInfo,
) => {
  const expectedOrigin = getSiteUrl().origin;
  const rootResponse = await request.get("/", { maxRedirects: 0 });
  expect(rootResponse.status()).toBe(308);
  expect(rootResponse.headers().location).toBe("/plan-check");

  const response = await page.goto("/plan-check");
  expect(response?.status()).toBe(200);
  if (testInfo.project.name.endsWith("-production")) {
    expect(response?.headers()["cache-control"]).toMatch(/s-maxage=/i);
    expect(response?.headers()["cache-control"]).not.toMatch(/private|no-store/i);
  }

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${expectedOrigin}/plan-check`,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Planning Hub | Auburn Academic Planner",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifestHref).toBeTruthy();

  const manifestResponse = await request.get(manifestHref as string);
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.start_url).toBe("/plan-check");
  expect(manifest.icons).toContainEqual(
    expect.objectContaining({ src: "/icon-192", sizes: "192x192" }),
  );
  expect(manifest.icons).toContainEqual(
    expect.objectContaining({ src: "/icon", sizes: "512x512" }),
  );

  const robotsResponse = await request.get("/robots.txt");
  expect(robotsResponse.ok()).toBe(true);
  const robots = await robotsResponse.text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain(`Sitemap: ${expectedOrigin}/sitemap.xml`);

  const sitemapResponse = await request.get("/sitemap.xml");
  expect(sitemapResponse.ok()).toBe(true);
  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain(`${expectedOrigin}/plan-check`);
  expect(sitemap).toContain(`${expectedOrigin}/feedback`);

  const socialImageUrl = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  const appleIconUrl = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(socialImageUrl).toBeTruthy();
  expect(appleIconUrl).toBeTruthy();
  expect(socialImageUrl).toBe(`${expectedOrigin}/opengraph-image`);

  const socialImagePath = new URL(socialImageUrl as string).pathname;
  const appleIconPath = new URL(
    appleIconUrl as string,
    "http://127.0.0.1:3100",
  ).pathname;
  expect((await request.get(socialImagePath)).ok()).toBe(true);
  expect((await request.get(appleIconPath)).ok()).toBe(true);
  expect((await request.get("/icon-192")).ok()).toBe(true);
  expect((await request.get("/icon")).ok()).toBe(true);
});

test("unknown routes render the accessible recovery page", async ({ page }) => {
  const runtimeErrors = monitorRuntimeErrors(page);
  const response = await page.goto("/this-page-does-not-exist");

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to Planning Hub" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
  expect(
    runtimeErrors.filter(
      (message) => !message.includes("status of 404 (Not Found)"),
    ),
  ).toEqual([]);
});

test("More disclosure uses ordinary link navigation and returns focus on Escape", async ({
  page,
}) => {
  await page.goto("/plan-check");

  const moreButton = page.getByRole("button", { name: /^More$/ });
  const stakeholderLinks = page.getByRole("list", {
    name: "Stakeholder pages",
  });
  const privacyLink = page.getByRole("link", {
    name: "Privacy",
    exact: true,
  });

  await moreButton.click();
  await expect(stakeholderLinks).toBeVisible();
  await expect(privacyLink).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);

  await privacyLink.focus();
  await page.keyboard.press("Escape");
  await expect(stakeholderLinks).toBeHidden();
  await expect(moreButton).toBeFocused();

  await moreButton.focus();
  await page.keyboard.press("Enter");
  await expect(stakeholderLinks).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(privacyLink).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(stakeholderLinks).toBeHidden();
  await expect(moreButton).toBeFocused();
});

test("Chat header keeps a visible truthful brand label at narrow widths", async ({
  page,
}) => {
  await page.goto("/chat");

  const mainContent = page.locator("main#main-content");
  await page.getByRole("link", { name: "Skip to main content" }).focus();
  await page.keyboard.press("Enter");
  await expect(mainContent).toBeFocused();

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = page.getByRole("heading", {
      name: "Auburn Planner",
      exact: true,
    });
    await expect(heading).toBeVisible();
    expect(
      await heading.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
    await expect(
      page.locator("header").getByRole("link", { name: "Planning Hub" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "More" })).toBeVisible();
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(
    page.getByRole("heading", {
      name: "Auburn Academic Planner",
      exact: true,
    }),
  ).toBeVisible();
});

test("fresh mobile Chat starts at the welcome heading", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chat");

  const conversation = page.getByTestId("chat-scroll-container");
  await expect(
    page.getByRole("heading", {
      name: "Source-grounded academic planning conversations",
    }),
  ).toBeVisible();
  await expect
    .poll(() => conversation.evaluate((element) => element.scrollTop))
    .toBe(0);
});

test("Chat mobile drawers trap focus, inert the app, close by Escape and backdrop, and restore focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/chat");

  const appContent = page.getByTestId("chat-app-content");
  const topicsTrigger = page.getByRole("button", {
    name: "Open planning topics",
  });
  await topicsTrigger.click();

  const topicsDialog = page.getByRole("dialog", {
    name: "Planning topics",
  });
  const closeButton = topicsDialog.getByRole("button", {
    name: "Close drawer",
  });
  await expect(topicsDialog).toBeVisible();
  await expect(topicsDialog).toHaveAttribute("aria-modal", "true");
  await expect(appContent).toHaveAttribute("inert", "");
  await expect(closeButton).toBeFocused();

  const focusableElements = topicsDialog.locator(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  const lastFocusableElement = focusableElements.last();
  await lastFocusableElement.focus();
  await page.keyboard.press("Tab");
  await expect(closeButton).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(lastFocusableElement).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(topicsDialog).toBeHidden();
  await expect(appContent).not.toHaveAttribute("inert", "");
  await expect(topicsTrigger).toBeFocused();

  await topicsTrigger.click();
  await page.getByTestId("mobile-drawer-backdrop").click({
    position: { x: 385, y: 400 },
  });
  await expect(topicsDialog).toBeHidden();
  await expect(topicsTrigger).toBeFocused();

  const sourcesTrigger = page.getByRole("button", { name: "Open sources" });
  await sourcesTrigger.click();
  await expect(page.getByRole("dialog", { name: "Sources" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Sources" })).toBeHidden();
  await expect(sourcesTrigger).toBeFocused();
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

function monitorRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

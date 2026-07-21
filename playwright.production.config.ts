import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  // Serialize release-gate browsers. Concurrent Firefox contexts intermittently
  // deadlock during reload on Windows and can turn a healthy DOM into a false
  // timeout; the CI timeout leaves ample room for deterministic execution.
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-production",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox-production",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit-production",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100/plan-check",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

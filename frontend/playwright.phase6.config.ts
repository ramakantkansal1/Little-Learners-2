import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/phase6",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-phase6-report", open: "never" }],
  ],
  outputDir: "test-results/phase6",
  use: {
    baseURL: process.env.E2E_FRONTEND_URL || "http://localhost:5174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

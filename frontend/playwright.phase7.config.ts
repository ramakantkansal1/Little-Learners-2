import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/phase7",
  workers: 1,
  retries: 0,
  timeout: 180000,
  expect: { timeout: 20000 },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-phase7-report", open: "never" }],
  ],
  outputDir: "test-results/phase7-browser",
  use: {
    baseURL: "http://localhost:5174",
    actionTimeout: 15000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

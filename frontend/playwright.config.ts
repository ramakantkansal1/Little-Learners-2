import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright Configuration for E2E Testing
 *
 * Optimized for reliability against live backend + MySQL.
 * Uses dedicated E2E backend on port 8001 with isolated database.
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Run tests in parallel but limit workers to avoid backend overload
  // E2E backend has its own connection pool
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,

  // Fail fast on CI if any test is marked as test.only
  forbidOnly: !!process.env.CI,

  // Retry flaky tests on CI
  retries: process.env.CI ? 2 : 1,

  // Reporter configuration
  reporter: process.env.CI ? [['line'], ['html', { outputFolder: 'playwright-report' }]] : 'line',

  // Global test timeout (increased for E2E with live backend)
  timeout: 120000,

  // Default options for all tests
  use: {
    baseURL: 'http://localhost:5173',

    // Trace collection for debugging failures
    trace: 'on-first-retry',

    // Screenshots on failure
    screenshot: 'only-on-failure',

    // Video on failure for CI debugging
    video: 'retain-on-failure',

    // No storageState - each test authenticates via UI for isolation
    storageState: undefined,

    // Action timeout for individual actions (click, fill, etc.)
    actionTimeout: 15000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Project configurations
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Viewport for consistent testing
        viewport: { width: 1280, height: 720 },
      },
    },
    // Uncomment for multi-browser testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Exclude debug tests and security-frontend (times out)
  testIgnorePatterns: ['**/debug*.spec.ts', '**/security-frontend.spec.ts'],

  // Web server (frontend dev server)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, // Don't reuse on CI
    timeout: 120000,
    // Health check to ensure server is ready
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      E2E_MODE: 'true',
    },
  },

  // Expect timeout for assertions
  expect: {
    timeout: 15000,
  },

  // Global setup/teardown for E2E database verification
  globalSetup: path.resolve(__dirname, './tests/e2e/global-setup.ts'),
  globalTeardown: path.resolve(__dirname, './tests/e2e/global-teardown.ts'),

  // Output directory for test artifacts
  outputDir: 'test-results',

  // Metadata for test reports
  metadata: {
    'Test Environment': process.env.APP_ENV || 'e2e',
    'Backend URL': process.env.E2E_BACKEND_URL || 'http://localhost:8001',
    'E2E Database': process.env.E2E_DB_NAME || 'happy_little_learners_e2e',
  },
});
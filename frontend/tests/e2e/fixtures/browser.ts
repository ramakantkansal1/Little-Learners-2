/**
 * E2E Browser and Page Lifecycle Fixtures
 * 
 * Manages browser context, page lifecycle, and test isolation.
 */
import { test as base, BrowserContext, Page } from '@playwright/test';

// Extend base test with browser/page fixtures
export const test = base.extend<{
  // Isolated browser context per test (for storage state isolation)
  isolatedContext: BrowserContext;
  isolatedPage: Page;
}>({
  // Create a fresh browser context for each test
  isolatedContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      // No storage state - each test authenticates fresh
      // This ensures test isolation
    });
    await use(context);
    await context.close();
  },

  // Create a fresh page in the isolated context
  isolatedPage: async ({ isolatedContext }, use) => {
    const page = await isolatedContext.newPage();
    await use(page);
    await page.close();
  },
});

export { expect } from '@playwright/test';
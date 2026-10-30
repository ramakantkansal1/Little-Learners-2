import { test, expect } from '@playwright/test';

test.describe('Student Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    const username = process.env.E2E_STUDENT_USERNAME || 'aarav_1';
    const pin = process.env.E2E_STUDENT_PIN || '1234';
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="pin"]', pin);
    await page.click('button[type="submit"]');
    // Wait for dashboard to fully load: URL + profile name
    await expect(page).toHaveURL(/.*student\/dashboard/, { timeout: 30000 });
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });

    // Wait for sidebar to be visible
    await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Clear cookies and storage to ensure test isolation
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  });

  test('should navigate to My Journey', async ({ page }) => {
    // Wait for My Journey to be visible and clickable
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    // Wait for history data to load
    await page.waitForResponse('**/api/v1/students/me/history');
    // Page title should be "Learning Journey" - use main content heading
    await expect(page.locator('main h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to My Rewards', async ({ page }) => {
    await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Rewards').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/rewards/);
    // Page title should be "My Rewards" - use main content heading
    await expect(page.locator('main h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to History', async ({ page }) => {
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    // Page title should be "Learning Journey" (per HistoryPage.tsx)
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
  });

  test('should use browser back and forward', async ({ page }) => {
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/.*student\/dashboard/);
    
    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/.*student\/history/);
  });

  test('should reload journey page correctly', async ({ page }) => {
    test.setTimeout(60000);
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
    
    await page.reload();
    // Wait for history data API response after reload
    await page.waitForResponse('**/api/v1/students/me/history');
    // Wait for page content to reappear after reload
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
  });

  test('should reload rewards page correctly', async ({ page }) => {
    test.setTimeout(60000);
    await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Rewards').first().click({ force: true });
    await expect(page.locator('main h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
    
    await page.reload();
    // Wait for rewards data API response after reload
    await page.waitForResponse('**/api/v1/students/me/rewards');
    // Wait for page content to reappear after reload
    await expect(page.locator('main h1:has-text("My Rewards")')).toBeVisible({ timeout: 30000 });
  });
});

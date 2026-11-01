import { test, expect } from './fixtures';

test.describe('Student Navigation', () => {
  // Use authenticatedStudentPage fixture which handles login automatically

  test('should navigate to My Journey', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;

    // Wait for My Journey to be visible and clickable
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    // Wait for history data to load
    await page.waitForResponse('**/api/v1/students/me/history');
    // Page title should be "Learning Journey" - use main content heading
    await expect(page.locator('main h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to My Rewards', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;

    await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Rewards').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/rewards/);
    // Page title should be "My Rewards" - use main content heading
    await expect(page.locator('main h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to History', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;

    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    // Page title should be "Learning Journey" (per HistoryPage.tsx)
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
  });

  test('should use browser back and forward', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;

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

  test('should reload journey page correctly', async ({ authenticatedStudentPage }) => {
    test.setTimeout(60000);
    const page = authenticatedStudentPage;

    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });

    await page.reload();
    // Wait for history data API response after reload
    await page.waitForResponse('**/api/v1/students/me/history');
    // Wait for page content to reappear after reload
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
  });

  test('should reload rewards page correctly', async ({ authenticatedStudentPage }) => {
    test.setTimeout(60000);
    const page = authenticatedStudentPage;

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
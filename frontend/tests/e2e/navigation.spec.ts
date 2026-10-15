import { test, expect } from '@playwright/test';

test.describe('Student Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for sidebar to be visible
    await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to My Journey', async ({ page }) => {
    // Wait for My Journey to be visible and clickable
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/history/);
    // Page title should be "Learning Journey"
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to My Rewards', async ({ page }) => {
    await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Rewards').first().click({ force: true });
    await expect(page).toHaveURL(/.*student\/rewards/);
    // Page title should be "My Rewards"
    await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to History', async ({ page }) => {
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    // Page title should be "My Journey"
    await expect(page.locator('h1:has-text("My Journey")')).toBeVisible({ timeout: 10000 });
  });

  test('should use browser back and forward', async ({ page }) => {
    // Navigate to journey
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
    await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Journey').first().click({ force: true });
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
    
    await page.reload();
    // Increase timeout for reload as auth re-validation and data fetching may take time
    await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
  });

  test('should reload rewards page correctly', async ({ page }) => {
    await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=My Rewards').first().click({ force: true });
    await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
    
    await page.reload();
    // Increase timeout for reload as auth re-validation and data fetching may take time
    await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 30000 });
  });
});
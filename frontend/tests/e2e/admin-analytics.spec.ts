import { test, expect } from './fixtures';

test.describe('Admin Analytics', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/analytics');
    await expect(adminPage.locator('h1:has-text("Analytics")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display analytics tabs', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Overview")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Engagement")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Content")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Users")').first()).toBeVisible();
  });

  test('should display overview KPIs', async ({ adminPage }) => {
    await expect(adminPage.locator('text=Total Registrations').first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=Active Children').first()).toBeVisible();
    await expect(adminPage.locator('text=Avg Session Time').first()).toBeVisible();
    await expect(adminPage.locator('text=Completion Rate').first()).toBeVisible();
  });

  test('should navigate between tabs', async ({ adminPage }) => {
    await adminPage.locator('button:has-text("Engagement")').first().click();
    await expect(adminPage.locator('button:has-text("Engagement")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Content")').first().click();
    await expect(adminPage.locator('button:has-text("Content")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Users")').first().click();
    await expect(adminPage.locator('button:has-text("Users")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Overview")').first().click();
    await expect(adminPage.locator('button:has-text("Overview")').first()).toHaveClass(/border-primary-500/);
  });

  test('should have date range selector', async ({ adminPage }) => {
    await expect(adminPage.locator('select').first()).toBeVisible();
  });
});
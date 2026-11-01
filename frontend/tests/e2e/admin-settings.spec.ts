import { test, expect } from './fixtures';

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/settings');
    await expect(adminPage.locator('h1:has-text("Platform Settings")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display settings tabs', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("General")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Email")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Security")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Content")').first()).toBeVisible();
    await expect(adminPage.locator('button:has-text("Privacy")').first()).toBeVisible();
  });

  test('should display general settings', async ({ adminPage }) => {
    await expect(adminPage.locator('text=Platform Information').first()).toBeVisible({ timeout: 5000 });
    await expect(adminPage.locator('input[value="Happy Little Learners"]').first()).toBeVisible({ timeout: 5000 });
    await expect(adminPage.locator('input[value="support@happylittlelearners.in"]').first()).toBeVisible();
  });

  test('should navigate between tabs', async ({ adminPage }) => {
    await adminPage.locator('button:has-text("Email")').first().click();
    await expect(adminPage.locator('button:has-text("Email")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Security")').first().click();
    await expect(adminPage.locator('button:has-text("Security")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Content")').first().click();
    await expect(adminPage.locator('button:has-text("Content")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("Privacy")').first().click();
    await expect(adminPage.locator('button:has-text("Privacy")').first()).toHaveClass(/border-primary-500/);
    
    await adminPage.locator('button:has-text("General")').first().click();
    await expect(adminPage.locator('button:has-text("General")').first()).toHaveClass(/border-primary-500/);
  });
});
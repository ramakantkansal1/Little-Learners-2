import { test, expect } from '@playwright/test';

test.describe('Student Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/student/login');
  });

  test('should login successfully and navigate to dashboard', async ({ page }) => {
    // Wait for login page to load
    await expect(page.locator('text=Little Learner Login')).toBeVisible();
    
    // Fill in credentials
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*student\/dashboard/);
    
    // Verify dashboard content loads (not showing loading spinner)
    await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 10000 });
    // Check for profile name in sidebar (use first match)
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid PIN', async ({ page }) => {
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '0000');
    await page.click('button[type="submit"]');
    
    // Should show error message - wait for the error div to appear
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 15000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/student\/login/);
  });
});
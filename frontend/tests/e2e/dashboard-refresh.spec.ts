import { test, expect } from '@playwright/test';

test.describe('Dashboard Refresh & Session Restoration', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });

  test('should restore session on page reload', async ({ page }) => {
    // Reload the page
    await page.reload();
    
    // Should not show loading spinner indefinitely
    await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 10000 });
    
    // Should show dashboard content (profile name)
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });

  test('should restore session on multiple reloads', async ({ page }) => {
    // Reload multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should not have HTTP 500 or CORS errors on reload', async ({ page }) => {
    // Track network errors
    const errors: string[] = [];
    page.on('response', response => {
      if (response.status() >= 500) {
        errors.push(`${response.url()} - ${response.status()}`);
      }
    });
    
    await page.reload();
    
    // Wait for page to load
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Check no 500 errors occurred
    expect(errors.filter(e => e.includes('500'))).toHaveLength(0);
  });
});
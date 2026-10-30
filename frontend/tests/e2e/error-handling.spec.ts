import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test('should handle failed profile request gracefully', async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/, { timeout: 30000 });
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Clear cookies to simulate auth failure
    await page.context().clearCookies();
    
    // Reload page - should handle gracefully
    await page.reload();
    
    // Should redirect to login or show error, not infinite spinner
    await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 10000 });
    
    // Should redirect to login
    const url = page.url();
    expect(url).toMatch(/.*auth\/student\/login/);
  });
});
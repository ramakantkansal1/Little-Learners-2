import { test, expect } from '@playwright/test';

test.describe('Debug Login - Check Browser Cookies', () => {
  test('should show browser cookies after login', async ({ page }) => {
    await page.goto('/auth/student/login');
    await expect(page.locator('text=Little Learner Login')).toBeVisible();
    
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/.*student\/dashboard/);
    
    // Wait a bit for API calls
    await page.waitForTimeout(3000);
    
    console.log('Current URL:', page.url());
    
    // Get all cookies
    const cookies = await page.context().cookies();
    console.log('Browser cookies:', JSON.stringify(cookies, null, 2));
    
    // Check for loading spinner
    const spinner = page.locator('text=Loading your learning space');
    const isVisible = await spinner.isVisible();
    console.log('Spinner visible:', isVisible);
    
    // Check for Aarav
    const aarav = page.locator('text=Aarav').first();
    const aaravVisible = await aarav.isVisible();
    console.log('Aarav visible:', aaravVisible);
  });
});
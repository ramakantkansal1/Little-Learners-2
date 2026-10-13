import { test, expect } from '@playwright/test';

test.describe('Debug Login - Check Cookies', () => {
  test('should show request cookies', async ({ page }) => {
    // Track all requests with cookies
    page.on('request', request => {
      const headers = request.headers();
      if (headers.cookie) {
        console.log(`REQUEST: ${request.method()} ${request.url()}`);
        console.log(`  Cookie: ${headers.cookie.substring(0, 500)}`);
      }
    });
    
    page.on('response', response => {
      console.log(`RESPONSE: ${response.status()} ${response.url()}`);
    });
    
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
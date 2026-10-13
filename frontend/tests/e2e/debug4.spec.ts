import { test, expect } from '@playwright/test';

test.describe('Debug Login - Check Set-Cookie', () => {
  test('should show login response set-cookie headers', async ({ page }) => {
    // Track login response
    page.on('response', response => {
      if (response.url().includes('/auth/student/login')) {
        console.log('LOGIN RESPONSE HEADERS:');
        const headers = response.headers();
        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase().includes('set-cookie') || key.toLowerCase().includes('cookie')) {
            console.log(`  ${key}: ${value}`);
          }
        }
      }
      if (response.url().includes('/api/v1/')) {
        console.log(`RESPONSE: ${response.status()} ${response.url()}`);
      }
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
import { test, expect } from '@playwright/test';

test.describe('Debug Invalid PIN - Check Network', () => {
  test('should show error for invalid PIN', async ({ page }) => {
    // Track all requests
    page.on('request', request => {
      if (request.url().includes('/api/v1/auth/student/login')) {
        console.log('LOGIN REQUEST:', request.method(), request.url());
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/api/v1/auth/student/login')) {
        console.log('LOGIN RESPONSE:', response.status(), response.url());
      }
    });
    
    await page.goto('/auth/student/login');
    await expect(page.locator('text=Little Learner Login')).toBeVisible();
    
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '0000');
    await page.click('button[type="submit"]');
    
    // Wait for API call
    await page.waitForTimeout(5000);
    
    // Check for error div
    const errorDiv = page.locator('div[role="alert"]');
    console.log('Error div visible:', await errorDiv.isVisible());
    
    // Check for any error text
    const errorText = page.locator('text=Invalid credentials');
    console.log('Error text visible:', await errorText.isVisible());
    
    // Check body text
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 500));
  });
});
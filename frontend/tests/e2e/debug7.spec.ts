import { test, expect } from '@playwright/test';

test.describe('Debug Invalid PIN', () => {
  test('should show error for invalid PIN', async ({ page }) => {
    await page.goto('/auth/student/login');
    await expect(page.locator('text=Little Learner Login')).toBeVisible();
    
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '0000');
    
    // Check for validation errors before submit
    const pinError = page.locator('text=PIN must be at least 4 digits');
    const pinError2 = page.locator('text=PIN must be numbers only');
    console.log('Pin error 1 visible:', await pinError.isVisible());
    console.log('Pin error 2 visible:', await pinError2.isVisible());
    
    await page.click('button[type="submit"]');
    
    // Wait a bit for submission
    await page.waitForTimeout(2000);
    
    // Check for any error messages
    const allErrors = page.locator('text=Invalid credentials, text=PIN must, text=Login failed');
    const count = await allErrors.count();
    console.log('Error count:', count);
    
    // Check all visible text
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 500));
    
    // Check for error div
    const errorDiv = page.locator('div[role="alert"]');
    console.log('Error div visible:', await errorDiv.isVisible());
    
    // Check for any text containing "Invalid"
    const invalidText = page.locator('text=Invalid');
    console.log('Invalid text visible:', await invalidText.isVisible());
  });
});
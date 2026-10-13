import { test, expect } from '@playwright/test';

test.describe('Debug Error Message', () => {
  test('should check error message', async ({ page }) => {
    await page.goto('/auth/student/login');
    await expect(page.locator('text=Little Learner Login')).toBeVisible();
    
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '0000');
    await page.click('button[type="submit"]');
    
    // Wait for error div
    await page.waitForTimeout(3000);
    
    // Check error div content
    const errorDiv = page.locator('div[role="alert"]');
    const errorDivVisible = await errorDiv.isVisible();
    console.log('Error div visible:', errorDivVisible);
    
    if (errorDivVisible) {
      const errorText = await errorDiv.textContent();
      console.log('Error div text:', errorText);
      
      // Check for specific text
      const invalidText = page.locator('text=Invalid credentials');
      console.log('Invalid credentials text visible:', await invalidText.isVisible());
      
      // Check all text in error div
      const allText = await errorDiv.locator('*').allTextContents();
      console.log('All text in error div:', allText);
    }
    
    // Check body text
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 500));
  });
});
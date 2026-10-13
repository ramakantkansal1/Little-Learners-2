import { test, expect } from '@playwright/test';

test.describe('Debug Activity Attempt', () => {
  test('should check attempt URL', async ({ page }) => {
    // Track all requests
    page.on('request', request => {
      if (request.url().includes('/activities/64/attempts')) {
        console.log(`ATTEMPT REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('/activities/64/attempts')) {
        console.log(`ATTEMPT RESPONSE: ${response.status()} ${response.url()}`);
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
    
    // Go to lesson page
    await page.goto('/student/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Should navigate to activity page with attempt parameter
    await expect(page).toHaveURL(/.*student\/activity\/64\?attempt=\d+/);
    
    // Wait for activity content to load (not loading spinner)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    
    // Check body text
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 1000));
    
    // Check URL
    console.log('Current URL:', page.url());
  });
});
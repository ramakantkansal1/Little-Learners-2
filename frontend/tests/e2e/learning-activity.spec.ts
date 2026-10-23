import { test, expect } from '@playwright/test';

test.describe('Learning Activity', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    const username = process.env.E2E_STUDENT_USERNAME || 'aarav_1';
    const pin = process.env.E2E_STUDENT_PIN || '1234';
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="pin"]', pin);
    await page.click('button[type="submit"]');
    // Wait for dashboard to fully load: URL + profile name
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async ({ page }) => {
    // Clear cookies and storage to ensure test isolation
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  });

  test('should open Alphabet A-E lesson (Lesson 22) and show activities', async ({ page }) => {
    // Navigate to lesson and wait for lesson content API response
    await page.goto('/student/learn/22');
    await page.waitForResponse('**/api/v1/students/me/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
  });

  test('should start activity and submit answer', async ({ page }) => {
    test.setTimeout(60000);
    // Go to lesson page and wait for lesson content to load
    await page.goto('/student/learn/22');
    await page.waitForResponse('**/api/v1/students/me/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Wait for the activity attempt creation API response, then navigation
    await page.waitForResponse('**/api/v1/students/me/activities/64/attempts');
    await expect(page).toHaveURL(/.*student\/activity\/64/);
    
    // Wait for activity content to load (not loading spinner)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 30000 });
    // Use h1 for activity title on activity page
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 30000 });
    
    // Wait for options to load - click the button containing "Option 1"
    await expect(page.getByRole('button', { name: 'Option 1' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Option 1' }).first().click();
    
    // Should show feedback - use a more flexible selector that matches partial text
    await expect(page.locator('p:has-text("Correct")')).toBeVisible({ timeout: 10000 });
    
    // Click Next to proceed
    await page.click('button:has-text("Next")');
  });

  test('should resume existing attempt on reload', async ({ page }) => {
    test.setTimeout(60000);
    // Go to lesson page and wait for lesson content to load
    await page.goto('/student/learn/22');
    await page.waitForResponse('**/api/v1/students/me/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Wait for the activity attempt creation API response, then navigation
    await page.waitForResponse('**/api/v1/students/me/activities/64/attempts');
    await expect(page).toHaveURL(/.*student\/activity\/64/);
    
    // Wait for activity content to load
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 20000 });
    
    // Select an option
    await expect(page.getByRole('button', { name: 'Option 1' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Option 1' }).first().click();
    
    // Reload page
    await page.reload();
    
    // Wait for the activity attempt data to reload after page refresh
    await page.waitForResponse('**/api/v1/students/me/attempts/*');
    
    // Should still show the activity (attempt should resume)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 30000 });
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 30000 });
  });
});

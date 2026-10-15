import { test, expect } from '@playwright/test';

test.describe('Debug Activity Page Feedback', () => {
  test('should debug feedback text', async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`CONSOLE ${msg.type().toUpperCase()}:`, msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });

    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Go to lesson page
    await page.goto('/student/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Should navigate to activity page
    await expect(page).toHaveURL(/.*student\/activity\/64/);
    
    // Wait for activity content to load (not loading spinner)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    
    // Wait for options to load
    await expect(page.locator('text=Option 1').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=Option 1').first().click({ force: true });
    
    // Wait a bit for feedback to appear
    await page.waitForTimeout(1000);
    
    // Check what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Body text after click:', bodyText?.substring(0, 3000));
    
    // Check for all p elements
    const pElements = page.locator('p');
    const pCount = await pElements.count();
    console.log('p count:', pCount);
    for (let i = 0; i < pCount; i++) {
      const text = await pElements.nth(i).textContent();
      console.log(`p[${i}]:`, text);
    }
    
    // Check for feedback container
    const feedback = page.locator('.bg-gray-50');
    const feedbackCount = await feedback.count();
    console.log('feedback count:', feedbackCount);
    for (let i = 0; i < feedbackCount; i++) {
      const text = await feedback.nth(i).textContent();
      console.log(`feedback[${i}]:`, text);
    }
  });
});
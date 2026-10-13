import { test, expect } from '@playwright/test';

test.describe('Debug Activity Page', () => {
  test('should check h1 elements', async ({ page }) => {
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
    
    // Check all h1 elements
    const h1Elements = page.locator('h1');
    const count = await h1Elements.count();
    console.log('h1 count:', count);
    
    for (let i = 0; i < count; i++) {
      const text = await h1Elements.nth(i).textContent();
      console.log(`h1[${i}]:`, text);
    }
    
    // Check for Activity 1 in any element
    const activityText = page.locator('text=Activity 1');
    const activityCount = await activityText.count();
    console.log('Activity 1 count:', activityCount);
    
    for (let i = 0; i < activityCount; i++) {
      const element = activityText.nth(i);
      const tagName = await element.evaluate(el => el.tagName);
      const className = await element.getAttribute('class');
      const isVisible = await element.isVisible();
      console.log(`Activity 1[${i}]: tag=${tagName}, class=${className}, visible=${isVisible}`);
    }
  });
});
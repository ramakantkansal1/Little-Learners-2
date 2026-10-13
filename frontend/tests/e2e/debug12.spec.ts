import { test, expect } from '@playwright/test';

test.describe('Debug Activity Page State', () => {
  test('should check activity state', async ({ page }) => {
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
    
    // Check all text on page
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 1000));
    
    // Check for activity title in any element
    const activityTitle = page.locator('text=Activity 1');
    const count = await activityTitle.count();
    console.log('Activity 1 count:', count);
    
    // Check all h1 elements
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log('h1 count:', h1Count);
    for (let i = 0; i < (await h1Elements.count()); i++) {
      const text = await h1Elements.nth(i).textContent();
      console.log(`h1[${i}]:`, await h1Elements.nth(i).textContent());
    }
  });
});
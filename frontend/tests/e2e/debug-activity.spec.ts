import { test, expect } from '@playwright/test';

test.describe('Debug Activity Page', () => {
  test('should debug activity page load', async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`CONSOLE ${msg.type().toUpperCase()}:`, msg.text());
      }
    });
    
    page.on('pageerror', error => {
      console.log('PAGE ERROR:', error.message);
    });
    
    // Capture network requests
    page.on('response', response => {
      if (response.url().includes('/api/v1/students/me/activities/') || 
          response.url().includes('/api/v1/students/me/attempts/')) {
        console.log(`NETWORK ${response.status()} ${response.url()}`);
      }
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
    
    // Check what's on the page
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 3000));
    
    // Check for h1 elements
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log('h1 count:', h1Count);
    for (let i = 0; i < h1Count; i++) {
      const text = await h1Elements.nth(i).textContent();
      console.log(`h1[${i}]:`, text);
    }
    
    // Check root element
    const root = page.locator('#root');
    const rootHtml = await root.innerHTML();
    console.log('Root HTML length:', rootHtml.length);
    if (rootHtml.length > 0) {
      console.log('Root HTML:', rootHtml.substring(0, 2000));
    }
  });
});
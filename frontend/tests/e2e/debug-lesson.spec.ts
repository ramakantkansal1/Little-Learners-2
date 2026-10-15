import { test, expect } from '@playwright/test';

test.describe('Debug Lesson Page', () => {
  test('should check page content', async ({ page }) => {
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('CONSOLE ERROR:', msg.text());
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
    
    // Check dashboard root
    const dashboardRoot = page.locator('#root');
    const dashboardHtml = await dashboardRoot.innerHTML();
    console.log('Dashboard Root HTML length:', dashboardHtml.length);
    
    // Go to lesson page
    await page.goto('/student/learn/22');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check URL
    console.log('Current URL:', page.url());
    
    // Check for loading spinner
    const loading = page.locator('text=Loading lesson');
    const loadingVisible = await loading.isVisible();
    console.log('Loading visible:', loadingVisible);
    
    // Check for error
    const error = page.locator('text=Unable to load lesson');
    const errorVisible = await error.isVisible();
    console.log('Error visible:', errorVisible);
    
    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('Body text:', bodyText?.substring(0, 3000));
    
    // Check for specific elements
    const activities = page.locator('text=Activity');
    const count = await activities.count();
    console.log('Activity count:', count);
    
    for (let i = 0; i < count; i++) {
      const text = await activities.nth(i).textContent();
      console.log(`Activity[${i}]:`, text);
    }
    
    // Check for h1 elements
    const h1Elements = page.locator('h1');
    const h1Count = await h1Elements.count();
    console.log('h1 count:', h1Count);
    for (let i = 0; i < h1Count; i++) {
      const text = await h1Elements.nth(i).textContent();
      console.log(`h1[${i}]:`, text);
    }
    
    // Check for React root
    const root = page.locator('#root');
    const rootHtml = await root.innerHTML();
    console.log('Root HTML length:', rootHtml.length);
    console.log('Root HTML:', rootHtml.substring(0, 1000));
  });
});
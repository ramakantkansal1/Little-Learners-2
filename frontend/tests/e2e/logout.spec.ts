import { test, expect } from '@playwright/test';

test.describe('Logout and Access Control', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Wait for sidebar
    await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
    
    // Click logout (Sign Out button)
    await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=Sign Out').first().click({ force: true });
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth\/student\/login/);
  });

  test('should deny access to protected pages after logout', async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    
    // Logout
    await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=Sign Out').first().click({ force: true });
    await expect(page).toHaveURL(/.*auth\/student\/login/);
    
    // Try to access dashboard directly
    await page.goto('/student/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*auth\/student\/login/);
  });

  test('should login again after logout', async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
    
    // Logout
    await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Sign Out').first()).toBeVisible({ timeout: 10000 });
    await page.locator('text=Sign Out').first().click({ force: true });
    await expect(page).toHaveURL(/.*auth\/student\/login/);
    
    // Login again
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });
});
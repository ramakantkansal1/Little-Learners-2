import { test, expect } from './fixtures';

test.describe('Admin Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/parent/login');
    // Wait for login page to load
    await expect(page.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
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

  test('should login successfully as admin and navigate to admin dashboard', async ({ adminPage }) => {
    // The adminPage fixture already logs in and navigates to admin dashboard
    await expect(adminPage).toHaveURL(/.*admin\/dashboard/, { timeout: 30000 });
    
    // Verify admin dashboard content loads
    await expect(adminPage.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=Platform overview')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid admin credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 15000 });
    const alertText = await page.locator('div[role="alert"]').textContent();
    expect(alertText).toBeTruthy();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for missing email', async ({ page }) => {
    await page.fill('input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible({ timeout: 10000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for missing password', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Password is required')).toBeVisible({ timeout: 10000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for non-existent admin email', async ({ page }) => {
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 15000 });
    const alertText = await page.locator('div[role="alert"]').textContent();
    expect(alertText).toBeTruthy();
  });

  test('should handle admin session persistence after reload', async ({ adminPage }) => {
    // Verify initial load
    await expect(adminPage.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    
    // Reload page - session should persist
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/.*admin\/dashboard/);
    await expect(adminPage.locator('text=Admin Dashboard')).toBeVisible({ timeout: 30000 });
  });

  test('should logout successfully', async ({ adminPage }) => {
    // Click profile dropdown
    await adminPage.click('button[aria-label="Profile menu"]');
    
    // Click Sign Out
    await adminPage.click('text=Sign Out');
    
    // Should redirect to login page
    await expect(adminPage).toHaveURL(/.*auth\/parent\/login/, { timeout: 10000 });
  });

  test('should reject unauthenticated admin API requests', async ({ page }) => {
    // The key security boundary is the API - verify admin API requires auth
    const response = await page.request.get('/api/v1/admin/dashboard');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});
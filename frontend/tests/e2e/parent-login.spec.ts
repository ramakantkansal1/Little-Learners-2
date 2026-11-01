import { test, expect } from './fixtures';

test.describe('Parent Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/parent/login');
    // Wait for login page to load - use button selector to avoid strict mode violation
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

  test('should login successfully and navigate to dashboard', async ({ page, parentCredentials }) => {
    // Fill in credentials from fixture
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.fill('input[name="password"]', parentCredentials.parentPassword);
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await expect(page).toHaveURL(/.*parent\/dashboard/, { timeout: 30000 });
    
    // Verify dashboard content loads (not showing loading spinner)
    await expect(page.locator('text=Loading dashboard...')).not.toBeVisible({ timeout: 60000 });
    // Check for welcome message
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid password', async ({ page, parentCredentials }) => {
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.fill('input[name="password"]', 'WrongPassword123');
    await page.click('button[type="submit"]');
    
    // Should show error message - use the alert div which contains the error
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 15000 });
    // Check for any error text in the alert
    const alertText = await page.locator('div[role="alert"]').textContent();
    expect(alertText).toBeTruthy();
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for missing email', async ({ page }) => {
    await page.fill('input[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible({ timeout: 10000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for missing password', async ({ page, parentCredentials }) => {
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.click('button[type="submit"]');
    
    // Should show validation error
    await expect(page.locator('text=Password is required')).toBeVisible({ timeout: 10000 });
    
    // Should stay on login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/);
  });

  test('should show error for non-existent email', async ({ page }) => {
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('div[role="alert"]')).toBeVisible({ timeout: 15000 });
    const alertText = await page.locator('div[role="alert"]').textContent();
    expect(alertText).toBeTruthy();
  });

  test('should handle login error gracefully', async ({ page, parentCredentials }) => {
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.fill('input[name="password"]', parentCredentials.parentPassword);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/.*parent\/dashboard/, { timeout: 30000 });
    await expect(page.locator('text=Loading dashboard...')).not.toBeVisible({ timeout: 60000 });
    
    // Reload page - session should persist
    await page.reload();
    await expect(page).toHaveURL(/.*parent\/dashboard/);
    await expect(page.locator('text=Loading dashboard...')).not.toBeVisible({ timeout: 60000 });
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page, parentCredentials }) => {
    // Login first
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.fill('input[name="password"]', parentCredentials.parentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*parent\/dashboard/, { timeout: 30000 });
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
    
    // Click profile dropdown (ChevronDown button)
    await page.click('button[aria-label="Profile menu"]');
    
    // Click Sign Out
    await page.click('text=Sign Out');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/.*auth\/parent\/login/, { timeout: 10000 });
  });
});
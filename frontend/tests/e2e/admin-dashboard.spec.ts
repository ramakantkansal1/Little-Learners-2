import { test, expect } from './fixtures';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ adminPage }) => {
    // Dashboard is already loaded by the fixture
    await expect(adminPage.locator('h1:has-text("Admin Dashboard")')).toBeVisible({ timeout: 10000 });
  });

  test('should display admin dashboard with stats cards', async ({ adminPage }) => {
    // Check for stats cards
    await expect(adminPage.locator('text=Registered Parents')).toBeVisible();
    await expect(adminPage.locator('text=Child Profiles')).toBeVisible();
    await expect(adminPage.locator('text=Published Lessons')).toBeVisible();
    await expect(adminPage.locator('text=Activities Completed')).toBeVisible();
  });

  test('should display content status section', async ({ adminPage }) => {
    await expect(adminPage.locator('h2:has-text("Content Status")')).toBeVisible();
    // Use more specific selectors for status badges
    await expect(adminPage.locator('span:has-text("Published")').first()).toBeVisible();
    await expect(adminPage.locator('span:has-text("In Review")').first()).toBeVisible();
    await expect(adminPage.locator('span:has-text("Draft")').first()).toBeVisible();
    await expect(adminPage.locator('span:has-text("Archived")').first()).toBeVisible();
  });

  test('should display recent activity section', async ({ adminPage }) => {
    await expect(adminPage.locator('h2:has-text("Recent Activity")')).toBeVisible();
    // Should show activity entries
    await expect(adminPage.locator('text=New parent registered').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display top lessons section', async ({ adminPage }) => {
    await expect(adminPage.locator('h2:has-text("Top Lessons by Completion")')).toBeVisible();
    await expect(adminPage.locator('text=Counting 1-10')).toBeVisible();
    await expect(adminPage.locator('text=Letter Sounds A-E')).toBeVisible();
  });

  test('should display quick actions section', async ({ adminPage }) => {
    await expect(adminPage.locator('h2:has-text("Quick Actions")')).toBeVisible();
    await expect(adminPage.locator('text=Create Lesson')).toBeVisible();
    await expect(adminPage.locator('text=Upload Media')).toBeVisible();
    await expect(adminPage.locator('text=Add User')).toBeVisible();
    // Use first() to avoid strict mode violation with sidebar link
    await expect(adminPage.locator('h3:has-text("Settings")').first()).toBeVisible();
  });

  test('should display quick action cards', async ({ adminPage }) => {
    // Verify quick action cards are visible
    await expect(adminPage.locator('text=Create Lesson')).toBeVisible();
    await expect(adminPage.locator('text=Upload Media')).toBeVisible();
    await expect(adminPage.locator('text=Add User')).toBeVisible();
    await expect(adminPage.locator('h3:has-text("Settings")').first()).toBeVisible();
  });

  test('should display view all links in sections', async ({ adminPage }) => {
    // Verify View All links are present in sections
    await expect(adminPage.locator('h2:has-text("Content Status")').locator('..').locator('a:has-text("View All")').first()).toBeVisible();
    await expect(adminPage.locator('h2:has-text("Recent Activity")').locator('..').locator('a:has-text("View All")').first()).toBeVisible();
    await expect(adminPage.locator('h2:has-text("Top Lessons by Completion")').locator('..').locator('a:has-text("View Analytics")').first()).toBeVisible();
  });

  test('should persist dashboard data after reload', async ({ adminPage }) => {
    await expect(adminPage.locator('text=Registered Parents')).toBeVisible();
    
    await adminPage.reload();
    
    await expect(adminPage.locator('h1:has-text("Admin Dashboard")')).toBeVisible({ timeout: 30000 });
    await expect(adminPage.locator('text=Registered Parents')).toBeVisible({ timeout: 10000 });
  });

  test('should handle dashboard loading state', async ({ page }) => {
    // Use a fresh context
    const freshContext = await page.context().browser()?.newContext();
    if (!freshContext) throw new Error('Failed to create fresh context');
    const freshPage = await freshContext.newPage();
    
    try {
      await freshPage.goto('/auth/parent/login');
      await expect(freshPage.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
      
      // Login as admin
      await freshPage.fill('input[name="email"]', 'admin@example.com');
      await freshPage.fill('input[name="password"]', 'Admin@123');
      await freshPage.click('button[type="submit"]');
      
      // Should eventually show dashboard (loading may be too fast to catch)
      await expect(freshPage.locator('h1:has-text("Admin Dashboard")')).toBeVisible({ timeout: 60000 });
    } finally {
      await freshPage.close();
      await (await freshPage.context()).close();
    }
  });
});
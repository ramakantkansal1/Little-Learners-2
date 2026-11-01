import { test, expect } from './fixtures';

test.describe('Parent Dashboard', () => {
  test.beforeEach(async ({ authenticatedParentPage }) => {
    // Dashboard is already loaded by the fixture
    await expect(authenticatedParentPage.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
  });

  test('should display parent profile information', async ({ authenticatedParentPage }) => {
    // Check for welcome header
    await expect(authenticatedParentPage.locator('text=Welcome back')).toBeVisible();
    
    // Check for stats cards
    await expect(authenticatedParentPage.locator('text=Total Children')).toBeVisible();
    await expect(authenticatedParentPage.locator('text=Lessons This Week')).toBeVisible();
    await expect(authenticatedParentPage.locator('text=Time Learning')).toBeVisible();
    await expect(authenticatedParentPage.locator('text=Rewards Earned')).toBeVisible();
  });

  test('should display linked children', async ({ authenticatedParentPage, parentCredentials }) => {
    // Should show at least one child (the one created in fixture) - use the display name
    const childDisplayName = parentCredentials.studentDisplayName; // "Test Student <timestamp>_<random>"
    await expect(authenticatedParentPage.locator(`text=${childDisplayName}`).first()).toBeVisible({ timeout: 10000 });
    
    // Should show progress bar
    await expect(authenticatedParentPage.locator('text=Overall Progress').first()).toBeVisible();
  });

  test('should navigate to child progress on click', async ({ authenticatedParentPage, parentCredentials }) => {
    // Click on child card (View Progress link)
    await authenticatedParentPage.click(`a[href*="/parent/children/${parentCredentials.studentId}"]`);
    
    // Should navigate to child progress page
    await expect(authenticatedParentPage).toHaveURL(new RegExp(`/parent/children/${parentCredentials.studentId}$`));
    // Page loaded successfully (URL verification is sufficient)
  });

  test('should navigate to child rewards', async ({ authenticatedParentPage, parentCredentials }) => {
    // Click on rewards link for first child
    await authenticatedParentPage.click(`a[href*="/parent/children/${parentCredentials.studentId}/rewards"]`);
    
    // Should navigate to child rewards page
    await expect(authenticatedParentPage).toHaveURL(new RegExp(`/parent/children/${parentCredentials.studentId}/rewards`));
    // Page loaded successfully (URL verification is sufficient)
  });

  test('should navigate to children page', async ({ authenticatedParentPage }) => {
    // Click on "Add Child" link
    await authenticatedParentPage.click('text=Add Child');
    
    // Should navigate to children page
    await expect(authenticatedParentPage).toHaveURL(/.*parent\/children/);
    // Check for page heading (not sidebar link)
    await expect(authenticatedParentPage.locator('h1:has-text("My Children")')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to settings', async ({ authenticatedParentPage }) => {
    // Click on settings link
    await authenticatedParentPage.click('text=Settings');
    
    // Should navigate to settings page
    await expect(authenticatedParentPage).toHaveURL(/.*parent\/settings/);
  });

  test('should handle dashboard loading state', async ({ page, parentCredentials }) => {
    // Use a fresh page to test login flow - create new context
    const freshContext = await page.context().browser()?.newContext();
    if (!freshContext) throw new Error('Failed to create fresh context');
    const freshPage = await freshContext.newPage();
    
    try {
      await freshPage.goto('/auth/parent/login');
      await expect(freshPage.locator('button[type="submit"]:has-text("Sign In")')).toBeVisible({ timeout: 10000 });
      
      // Login
      await freshPage.fill('input[name="email"]', parentCredentials.parentEmail);
      await freshPage.fill('input[name="password"]', parentCredentials.parentPassword);
      await freshPage.click('button[type="submit"]');
      
      // Should show loading state briefly
      await expect(freshPage.locator('text=Loading dashboard...')).toBeVisible({ timeout: 5000 });
      
      // Should then show dashboard
      await expect(freshPage.locator('text=Loading dashboard...')).not.toBeVisible({ timeout: 60000 });
      await expect(freshPage.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
    } finally {
      await freshPage.close();
      await freshContext.close();
    }
  });

  test('should display recent activity section', async ({ authenticatedParentPage }) => {
    // Check for recent activity section - use heading to avoid strict mode violation
    await expect(authenticatedParentPage.locator('h2:has-text("Recent Activity")')).toBeVisible();
    
    // Either shows activity or empty state
    const hasActivity = await authenticatedParentPage.locator('text=No recent activity yet').isVisible({ timeout: 5000 }).catch(() => false);
    if (!hasActivity) {
      // Should show activity table
      await expect(authenticatedParentPage.locator('text=Lesson')).toBeVisible();
      await expect(authenticatedParentPage.locator('text=Child')).toBeVisible();
      await expect(authenticatedParentPage.locator('text=Completed')).toBeVisible();
      await expect(authenticatedParentPage.locator('text=Score')).toBeVisible();
    }
  });

  test('should display weekly learning goal', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('text=Weekly Learning Goal')).toBeVisible();
  });
});
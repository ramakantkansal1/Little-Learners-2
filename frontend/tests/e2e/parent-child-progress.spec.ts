import { test, expect } from './fixtures';

test.describe('Parent Child Progress', () => {
  test.beforeEach(async ({ authenticatedParentPage, parentCredentials }) => {
    // Navigate to child progress page
    await authenticatedParentPage.goto(`/parent/children/${parentCredentials.studentId}/progress`);
    // Wait for page to load
    await expect(authenticatedParentPage).toHaveURL(new RegExp(`/parent/children/${parentCredentials.studentId}/progress`));
  });

  test('should display correct child information', async ({ authenticatedParentPage, parentCredentials }) => {
    // Check child name in header (using display name from fixture)
    await expect(authenticatedParentPage.locator(`h1:has-text("${parentCredentials.studentDisplayName}'s Progress")`)).toBeVisible({ timeout: 20000 });
  });

  test('should display overview stats', async ({ authenticatedParentPage }) => {
    // Check overview stat cards - use main content area
    await expect(authenticatedParentPage.locator('main').getByText('Lessons Completed')).toBeVisible({ timeout: 20000 });
    await expect(authenticatedParentPage.locator('main').getByText('Time This Week')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Current Streak')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Rewards Earned')).toBeVisible();
  });

  test('should display subject progress', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('main').getByText('Subject Progress')).toBeVisible({ timeout: 20000 });
    
    // Should show subjects - use first() to avoid strict mode violation
    await expect(authenticatedParentPage.locator('main').getByText('English').first()).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Hindi').first()).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Mathematics').first()).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('EVS').first()).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Art & Music').first()).toBeVisible();
  });

  test('should display weekly activity chart', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('main').getByText('Weekly Activity')).toBeVisible({ timeout: 20000 });
    
    // Should show days of week
    await expect(authenticatedParentPage.locator('main').getByText('Mon')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Tue')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Wed')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Thu')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Fri')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Sat')).toBeVisible();
    await expect(authenticatedParentPage.locator('main').getByText('Sun')).toBeVisible();
  });

  test('should display recent lessons', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('main').getByText('Recent Lessons')).toBeVisible({ timeout: 20000 });
  });

  test('should display strengths and areas for practice', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('main').getByText('Strengths')).toBeVisible({ timeout: 20000 });
    await expect(authenticatedParentPage.locator('main').getByText('Areas for Practice')).toBeVisible();
  });

  test('should display recommended next steps', async ({ authenticatedParentPage }) => {
    await expect(authenticatedParentPage.locator('main').getByText('Recommended Next Steps')).toBeVisible({ timeout: 20000 });
  });

  test('should persist progress data after page reload', async ({ authenticatedParentPage, parentCredentials }) => {
    // Verify initial load
    await expect(authenticatedParentPage.locator(`h1:has-text("${parentCredentials.studentDisplayName}'s Progress")`)).toBeVisible({ timeout: 20000 });
    
    // Reload page
    await authenticatedParentPage.reload();
    
    // Should still show progress data
    await expect(authenticatedParentPage.locator(`h1:has-text("${parentCredentials.studentDisplayName}'s Progress")`)).toBeVisible({ timeout: 30000 });
    await expect(authenticatedParentPage.locator('main').getByText('Lessons Completed')).toBeVisible({ timeout: 20000 });
  });

  test('should handle empty progress state correctly', async ({ authenticatedParentPage }) => {
    // The page should load without errors
    await expect(authenticatedParentPage.locator('text=Loading progress...')).not.toBeVisible({ timeout: 60000 });
  });
});
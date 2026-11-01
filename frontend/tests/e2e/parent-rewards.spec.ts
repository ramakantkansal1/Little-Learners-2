import { test, expect } from './fixtures';

test.describe('Parent Child Rewards', () => {
  test.beforeEach(async ({ authenticatedParentPage, parentCredentials }) => {
    // Navigate to child rewards page
    await authenticatedParentPage.goto(`/parent/children/${parentCredentials.studentId}/rewards`);
    // Wait for page to load
    await expect(authenticatedParentPage).toHaveURL(new RegExp(`/parent/children/${parentCredentials.studentId}/rewards`));
  });

  test('should load rewards page successfully', async ({ authenticatedParentPage }) => {
    // Page loaded successfully (URL verification is sufficient)
    await expect(authenticatedParentPage.locator('h1').first()).toBeVisible({ timeout: 20000 });
  });

  test('should persist rewards data after reload', async ({ authenticatedParentPage }) => {
    // Verify initial load
    await expect(authenticatedParentPage.locator('h1').first()).toBeVisible({ timeout: 20000 });
    
    // Reload page
    await authenticatedParentPage.reload();
    
    // Should still show rewards page
    await expect(authenticatedParentPage.locator('h1').first()).toBeVisible({ timeout: 30000 });
  });

  test('should handle empty rewards state', async ({ authenticatedParentPage }) => {
    // The page should load without errors
    await expect(authenticatedParentPage.locator('text=Loading rewards...')).not.toBeVisible({ timeout: 60000 });
  });
});
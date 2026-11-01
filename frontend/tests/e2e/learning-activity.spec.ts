import { test, expect } from './fixtures';

test.describe('Learning Activity', () => {
  // Use authenticatedStudentPage fixture which handles login automatically

  test('should open lesson and show activities', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    // Navigate to lesson and wait for lesson content API response
    // Use a lesson ID that exists in the E2E database (seeded via migrations)
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
  });

  test('should start activity and submit answer', async ({ authenticatedStudentPage }) => {
    test.setTimeout(60000);
    const page = authenticatedStudentPage;

    // Go to lesson page and wait for lesson content to load
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });

    // Click Start button for the first activity
    await page.click('text=Start');

    // Wait for the activity attempt creation API response, then navigation
    // The activity ID will vary based on E2E seed data - use regex
    await page.waitForResponse(response =>
      response.url().includes('/api/v1/students/me/activities/') &&
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    await expect(page).toHaveURL(/.*student\/activity\/\d+/);

    // Wait for activity content to load (not loading spinner)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 30000 });
    // Use main content h1 for activity title (not sidebar)
    await expect(page.locator('main h1')).toBeVisible({ timeout: 30000 });

    // Wait for activity answer options to load - use main content area to avoid sidebar buttons
    await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
    await page.locator('main button').first().click();

    // Should show feedback - check feedback container is visible (exact text varies by correctness)
    await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });

    // Click Next to proceed (if available)
    const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
    if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextButton.click();
    }
  });

  test('should resume existing attempt on reload', async ({ authenticatedStudentPage }) => {
    test.setTimeout(60000);
    const page = authenticatedStudentPage;

    // Go to lesson page and wait for lesson content to load
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });

    // Click Start button for the first activity
    await page.click('text=Start');

    // Wait for the activity attempt creation API response, then navigation
    await page.waitForResponse(response =>
      response.url().includes('/api/v1/students/me/activities/') &&
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    await expect(page).toHaveURL(/.*student\/activity\/\d+/);

    // Wait for activity content to load
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('main h1')).toBeVisible({ timeout: 20000 });

    // Select an option - use main content area to avoid sidebar buttons
    await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
    await page.locator('main button').first().click();

    // Reload page
    await page.reload();

    // Should still show the activity (attempt should resume) - verify by content loading
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 30000 });
    await expect(page.locator('main h1')).toBeVisible({ timeout: 30000 });
  });
});
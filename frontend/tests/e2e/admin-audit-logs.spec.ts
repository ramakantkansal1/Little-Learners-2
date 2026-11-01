import { test, expect } from './fixtures';

test.describe('Admin Audit Logs', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/audit-logs');
    await expect(adminPage.locator('h1:has-text("Audit Logs")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display audit logs table', async ({ adminPage }) => {
    await expect(adminPage.locator('th:has-text("Time")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("User")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Action")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Resource")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Details")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("IP Address")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Status")').first()).toBeVisible();
  });

  test('should show seeded audit log entries', async ({ adminPage }) => {
    // The CREATE action badge should be visible in the table
    await expect(adminPage.locator('span:has-text("CREATE")').first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=admin').first()).toBeVisible();
  });

  test('should have filter controls', async ({ adminPage }) => {
    await expect(adminPage.locator('input[placeholder="Search by user, resource, or details..."]').first()).toBeVisible();
    await expect(adminPage.locator('select').first()).toBeVisible(); // Action filter
  });
});
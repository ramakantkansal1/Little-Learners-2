import { test, expect } from './fixtures';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/users');
    await expect(adminPage.locator('h1:has-text("User Management")').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display users table', async ({ adminPage }) => {
    await expect(adminPage.locator('th:has-text("User")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Role")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Status")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Children")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Registered")').first()).toBeVisible();
    await expect(adminPage.locator('th:has-text("Last Login")').first()).toBeVisible();
  });

  test('should show seeded users', async ({ adminPage }) => {
    // Should show at least the admin user
    await expect(adminPage.locator('text=Admin User').first()).toBeVisible({ timeout: 10000 });
    await expect(adminPage.locator('text=admin@happylittlelearners.in').first()).toBeVisible();
  });

  test('should have search and filter controls', async ({ adminPage }) => {
    await expect(adminPage.locator('input[placeholder="Search by name or email..."]').first()).toBeVisible();
    await expect(adminPage.locator('select').first()).toBeVisible(); // Role filter
  });
});
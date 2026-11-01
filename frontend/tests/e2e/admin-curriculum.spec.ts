import { test, expect } from './fixtures';

test.describe('Admin Curriculum Management', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/admin/curriculum');
    await expect(adminPage.locator('text=Curriculum Management')).toBeVisible({ timeout: 20000 });
  });

  test('should display curriculum tabs', async ({ adminPage }) => {
    await expect(adminPage.locator('button:has-text("Stages")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Subjects")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Lessons")')).toBeVisible();
    await expect(adminPage.locator('button:has-text("Activities")')).toBeVisible();
  });

  test('should navigate between tabs', async ({ adminPage }) => {
    await adminPage.click('button:has-text("Subjects")');
    await adminPage.click('button:has-text("Lessons")');
    await adminPage.click('button:has-text("Activities")');
    await adminPage.click('button:has-text("Stages")');
  });

  test('should open add content modal', async ({ adminPage }) => {
    await adminPage.click('text=Add Content');
    await expect(adminPage.locator('text=Add New Content')).toBeVisible({ timeout: 5000 });
    await adminPage.click('text=Cancel');
  });

  test('should have search input', async ({ adminPage }) => {
    await expect(adminPage.locator('input[placeholder*="Search"]')).toBeVisible();
  });
});
/**
 * E2E Account Fixtures
 * 
 * Reusable fixtures for creating and managing test accounts:
 * - Student accounts
 * - Parent accounts  
 * - Admin accounts
 * - Authentication/session management
 */
import { test as base, Page, APIRequestContext, expect } from '@playwright/test';
import { createE2ERequestContext, createTestUser, authenticateStudent, authenticateParent, TestUserCredentials, E2E_BACKEND_URL } from './database';

// Extend base test with E2E fixtures
export const test = base.extend<{
  e2eRequestContext: APIRequestContext;
  studentCredentials: TestUserCredentials;
  parentCredentials: TestUserCredentials;
  authenticatedStudentPage: Page;
  authenticatedParentPage: Page;
  adminPage: Page;
}>({
  // Shared API request context for the test worker
  // eslint-disable-next-line no-empty-pattern
  e2eRequestContext: async ({}, use) => {
    const context = await createE2ERequestContext();
    await use(context);
    await context.dispose();
  },

  // Create a unique student account for each test
  studentCredentials: async ({ e2eRequestContext }, use) => {
    const credentials = await createTestUser(e2eRequestContext, 'student');
    await use(credentials);
    // Cleanup would go here if needed (but unique identifiers prevent conflicts)
  },

  // Parent credentials (same as student since they're linked)
  parentCredentials: async ({ studentCredentials }, use) => {
    await use({
      parentEmail: studentCredentials.parentEmail,
      parentPassword: studentCredentials.parentPassword,
      studentUsername: studentCredentials.studentUsername,
      studentDisplayName: studentCredentials.studentDisplayName,
      studentPin: studentCredentials.studentPin,
      studentId: studentCredentials.studentId,
      parentId: studentCredentials.parentId,
    });
  },

  // Page authenticated as student
  authenticatedStudentPage: async ({ page, studentCredentials }, use) => {
    // Login as student
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', studentCredentials.studentUsername);
    await page.fill('input[name="pin"]', studentCredentials.studentPin);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL(/.*student\/dashboard/);
    await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 120000 });
    
    await use(page);
    
    // Cleanup: logout
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  },

  // Page authenticated as parent
  authenticatedParentPage: async ({ page, parentCredentials }, use) => {
    await page.goto('/auth/parent/login');
    await page.fill('input[name="email"]', parentCredentials.parentEmail);
    await page.fill('input[name="password"]', parentCredentials.parentPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*parent\/dashboard/);
    
    await use(page);
    
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  },

  // Page authenticated as admin
  adminPage: async ({ page }, use) => {
    // Admin credentials - should be pre-seeded in E2E database
    const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'Admin@123';
    
    await page.goto('/auth/parent/login');
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*admin\/dashboard/);
    
    await use(page);
    
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // Ignore cross-origin errors
      }
    });
  },
});

export { expect } from '@playwright/test';
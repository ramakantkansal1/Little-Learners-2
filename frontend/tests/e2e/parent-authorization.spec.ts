import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL } from './fixtures/database';

test.describe('Parent Authorization & Data Isolation', () => {
  let parentA: TestUserCredentials;
  let parentB: TestUserCredentials;
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    // Create request context for API calls
    requestContext = await createE2ERequestContext();
    
    // Create Parent A with Child A
    parentA = await createTestUser(requestContext, 'parent_a');
    console.log(`Created Parent A: ${parentA.parentEmail}, Child A: ${parentA.studentUsername} (id: ${parentA.studentId})`);
    
    // Create Parent B with Child B
    parentB = await createTestUser(requestContext, 'parent_b');
    console.log(`Created Parent B: ${parentB.parentEmail}, Child B: ${parentB.studentUsername} (id: ${parentB.studentId})`);
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test.beforeEach(async ({ page }) => {
    // Clear cookies before each test
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

  test('Parent A can access Child A progress via UI', async ({ page }) => {
    // Login as Parent A
    await page.goto('/auth/parent/login');
    await page.fill('input[name="email"]', parentA.parentEmail);
    await page.fill('input[name="password"]', parentA.parentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*parent\/dashboard/, { timeout: 30000 });
    
    // Navigate to Child A's progress
    await page.goto(`/parent/children/${parentA.studentId}/progress`);
    await expect(page).toHaveURL(new RegExp(`/parent/children/${parentA.studentId}/progress`));
  });

  test('Parent B can access Child B progress via UI', async ({ page }) => {
    // Login as Parent B
    await page.goto('/auth/parent/login');
    await page.fill('input[name="email"]', parentB.parentEmail);
    await page.fill('input[name="password"]', parentB.parentPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*parent\/dashboard/, { timeout: 30000 });
    
    // Navigate to Child B's progress
    await page.goto(`/parent/children/${parentB.studentId}/progress`);
    await expect(page).toHaveURL(new RegExp(`/parent/children/${parentB.studentId}/progress`));
  });

  test('Direct API request for unauthorized child is rejected', async () => {
    // Login as Parent A via API
    const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const csrfToken = (await csrfResponse.json()).csrf_token;
    
    const loginResponse = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
      {
        data: { email: parentA.parentEmail, password: parentA.parentPassword },
        headers: { 'X-CSRF-Token': csrfToken },
      }
    );
    expect(loginResponse.ok()).toBeTruthy();
    
    // Get fresh CSRF token
    const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
    
    // Try to access Child B's progress API
    const progressResponse = await requestContext.get(
      `${E2E_BACKEND_URL}/api/v1/parents/me/children/${parentB.studentId}/progress`,
      { headers: { 'X-CSRF-Token': loginCsrfToken } }
    );
    
    // Should be forbidden or not found (400-499 range)
    expect(progressResponse.status()).toBeGreaterThanOrEqual(400);
    expect(progressResponse.status()).toBeLessThan(500);
  });

  test('Parent cannot access admin endpoints via API', async () => {
    // Login as Parent A via API
    const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const csrfToken = (await csrfResponse.json()).csrf_token;
    
    const loginResponse = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
      {
        data: { email: parentA.parentEmail, password: parentA.parentPassword },
        headers: { 'X-CSRF-Token': csrfToken },
      }
    );
    expect(loginResponse.ok()).toBeTruthy();
    
    // Get fresh CSRF token
    const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
    
    // Try to access admin dashboard
    const adminResponse = await requestContext.get(
      `${E2E_BACKEND_URL}/api/v1/admin/dashboard`,
      { headers: { 'X-CSRF-Token': loginCsrfToken } }
    );
    
    // Should be forbidden
    expect(adminResponse.status()).toBe(403);
  });

  test('Unauthenticated parent dashboard API request is rejected', async () => {
    // Try to access parent dashboard API without auth - use fresh context
    const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
    const response = await freshContext.get('/api/v1/parents/me');
    await freshContext.dispose();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Unauthenticated child progress API request is rejected', async () => {
    // Try to access child progress API without auth - use fresh context
    const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
    const response = await freshContext.get(`/api/v1/parents/me/children/${parentA.studentId}/progress`);
    await freshContext.dispose();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('Unauthenticated child rewards API request is rejected', async () => {
    // Try to access child rewards API without auth - use fresh context
    const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
    const response = await freshContext.get(`/api/v1/parents/me/children/${parentA.studentId}/rewards`);
    await freshContext.dispose();
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
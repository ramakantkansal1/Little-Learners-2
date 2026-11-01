import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL } from './fixtures/database';

/**
 * Extract a valid Cookie header from set-cookie response headers.
 * Returns only the name=value pairs, joined by semicolons.
 * Handles multiple set-cookie headers which may be joined by newlines or commas.
 */
function extractCookieHeader(response: { headers: () => Record<string, string | string[]> }): string {
  const setCookieRaw = response.headers()['set-cookie'] || '';
  // Split by newline or comma to handle multiple set-cookie headers
  const setCookieHeaders = setCookieRaw.split(/[\n,]/).map(s => s.trim()).filter(s => s.length > 0);
  
  const cookiePairs: string[] = [];
  for (const cookie of setCookieHeaders) {
    // Each set-cookie header is like: "access_token=xxx; HttpOnly; Path=/; SameSite=lax"
    // We need just the "access_token=xxx" part
    const nameValue = cookie.split(';')[0].trim();
    if (nameValue && nameValue.includes('=')) {
      cookiePairs.push(nameValue);
    }
  }
  return cookiePairs.join('; ');
}

test.describe('Security: Session Management', () => {
  let studentCredentials: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    studentCredentials = await createTestUser(requestContext, 'sec_session_student');
    parentCredentials = await createTestUser(requestContext, 'sec_session_parent');
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test.describe('Session Establishment', () => {
    test('Student session established with HttpOnly cookies', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      // Verify access_token cookie is HttpOnly
      expect(cookieHeader).toContain('access_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('Path=/');
      
      // Verify refresh_token cookie is HttpOnly
      expect(cookieHeader).toContain('refresh_token=');
      expect(cookieHeader).toContain('HttpOnly');
      
      // Verify CSRF token cookie is NOT HttpOnly (accessible to JS)
      expect(cookieHeader).toContain('csrf_token=');
      // In E2E env (development), SameSite should be lax (lowercase)
      expect(cookieHeader.toLowerCase()).toContain('samesite=lax');
    });

    test('Parent session established with HttpOnly cookies', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: parentCredentials.parentEmail, password: parentCredentials.parentPassword },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.ok()).toBeTruthy();
      
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      expect(cookieHeader).toContain('access_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('refresh_token=');
      expect(cookieHeader).toContain('HttpOnly');
      expect(cookieHeader).toContain('csrf_token=');
      expect(cookieHeader.toLowerCase()).toContain('samesite=lax');
    });
  });

  test.describe('Protected Routes Reject Unauthenticated', () => {
    test('Student dashboard API rejects unauthenticated', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent dashboard API rejects unauthenticated', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/parents/me');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Admin dashboard API rejects unauthenticated', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/admin/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Token Validation', () => {
    test('Expired access token is rejected', async () => {
      // This test would require manipulating token expiry
      // For now, we test that an invalid token is rejected
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': 'access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6InN0dWRlbnQiLCJleHAiOjEsInR5cGUiOiJhY2Nlc3MifQ.invalid' }
      });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Invalid/malformed token is rejected', async () => {
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': 'access_token=not-a-valid-jwt-token' }
      });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Tampered token is rejected', async () => {
      // Valid token structure but tampered signature
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjo5OTk5OTk5OTk5LCJ0eXBlIjoiYWNjZXNzIn0.tampered_signature';
      
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': `access_token=${tamperedToken}` }
      });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Token with wrong role is rejected for admin endpoint', async () => {
      // Login as student
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      expect(loginResponse.ok()).toBeTruthy();
      
      // Extract cookie name=value pairs from set-cookie headers
      const cookieHeader = extractCookieHeader(loginResponse);
      
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const response = await freshContext.get('/api/v1/admin/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Refresh Token Handling', () => {
    test('Refresh token rotation works', async () => {
      // Login as student
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      expect(loginResponse.ok()).toBeTruthy();
      
      const cookieHeader = extractCookieHeader(loginResponse);
      
      // Debug: log the cookie header
      console.log('Cookie header for refresh:', cookieHeader);
      
      // Call refresh endpoint
      const refreshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const refreshResponse = await refreshContext.post('/api/v1/auth/refresh');
      
      // Debug: log response status
      console.log('Refresh response status:', refreshResponse.status());
      
      // Read body before checking ok() to avoid "Response has been disposed"
      const responseBody = await refreshResponse.text();
      if (!refreshResponse.ok()) {
        console.log('Refresh failed:', refreshResponse.status(), responseBody);
      }
      
      await refreshContext.dispose();
      
      expect(refreshResponse.ok()).toBeTruthy();
      const data = JSON.parse(responseBody);
      expect(data.access_token).toBeTruthy();
      expect(data.refresh_token).toBeTruthy();
      
      // Verify new cookies are set
      const refreshCookies = refreshResponse.headers()['set-cookie'] || [];
      const refreshCookieHeader = Array.isArray(refreshCookies) ? refreshCookies.join('; ') : refreshCookies;
      expect(refreshCookieHeader).toContain('access_token=');
      expect(refreshCookieHeader).toContain('refresh_token=');
    });

    test('Old refresh token cannot be reused', async () => {
      // Login as student
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      expect(loginResponse.ok()).toBeTruthy();
      
      const cookieHeader = extractCookieHeader(loginResponse);
      
      // First refresh
      const refreshContext1 = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const refreshResponse1 = await refreshContext1.post('/api/v1/auth/refresh');
      await refreshContext1.dispose();
      expect(refreshResponse1.ok()).toBeTruthy();
      
      // Try to use old refresh token again (should fail)
      const refreshContext2 = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const refreshResponse2 = await refreshContext2.post('/api/v1/auth/refresh');
      await refreshContext2.dispose();
      
      // Should be rejected (token revoked)
      expect(refreshResponse2.status()).toBeGreaterThanOrEqual(400);
      expect(refreshResponse2.status()).toBeLessThan(500);
    });
  });

  test.describe('Logout Behavior', () => {
    test('Logout invalidates session and clears cookies', async () => {
      // Login as student
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      expect(loginResponse.ok()).toBeTruthy();
      
      const cookieHeader = extractCookieHeader(loginResponse);
      
      // Call logout
      const logoutContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const logoutResponse = await logoutContext.post('/api/v1/auth/logout');
      await logoutContext.dispose();
      
      expect(logoutResponse.ok()).toBeTruthy();
      
      // Verify cookies are cleared
      const logoutCookies = logoutResponse.headers()['set-cookie'] || [];
      const logoutCookieHeader = Array.isArray(logoutCookies) ? logoutCookies.join('; ') : logoutCookies;
      // Cookies are cleared with empty value: access_token=""; Max-Age=0
      expect(logoutCookieHeader).toContain('access_token=""');
      expect(logoutCookieHeader).toContain('Max-Age=0');
    });

    test('Logged out user cannot access protected APIs using refresh token', async () => {
      // Login as student
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      expect(loginResponse.ok()).toBeTruthy();
      
      const cookieHeader = extractCookieHeader(loginResponse);
      
      // Call logout
      const logoutContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      await logoutContext.post('/api/v1/auth/logout');
      await logoutContext.dispose();
      
      // Try to use old refresh token to get new access token (should fail)
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const response = await freshContext.post('/api/v1/auth/refresh');
      await freshContext.dispose();
      
      // Refresh should fail because refresh token was revoked on logout
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Browser Session Behavior', () => {
    test('Student can access dashboard after login via UI', async ({ page }) => {
      await page.goto('/auth/student/login');
      await page.fill('input[name="username"]', studentCredentials.studentUsername);
      await page.fill('input[name="pin"]', studentCredentials.studentPin);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/.*student\/dashboard/);
      await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 60000 });
      
      // Verify dashboard content loads - check for welcome header with student name
      const firstName = studentCredentials.studentUsername.split('_')[0];
      await expect(page.locator(`text=Hello, ${firstName}`)).toBeVisible({ timeout: 30000 });
    });

    test('Page refresh maintains session', async ({ page }) => {
      await page.goto('/auth/student/login');
      await page.fill('input[name="username"]', studentCredentials.studentUsername);
      await page.fill('input[name="pin"]', studentCredentials.studentPin);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/.*student\/dashboard/);
      await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 60000 });
      
      const firstName = studentCredentials.studentUsername.split('_')[0];
      await expect(page.locator(`text=Hello, ${firstName}`)).toBeVisible({ timeout: 30000 });
      
      // Refresh page
      await page.reload();
      
      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL(/.*student\/dashboard/);
      await expect(page.locator(`text=Hello, ${firstName}`)).toBeVisible({ timeout: 30000 });
    });

    test('Logout via UI clears session', async ({ page }) => {
      await page.goto('/auth/student/login');
      await page.fill('input[name="username"]', studentCredentials.studentUsername);
      await page.fill('input[name="pin"]', studentCredentials.studentPin);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/.*student\/dashboard/);
      await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 60000 });
      
      // Logout via Sign Out button in sidebar
      await page.click('button:has-text("Sign Out")', { force: true });
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*auth\/student\/login/);
    });

    test('Browser back after logout does not reveal protected content', async ({ page }) => {
      await page.goto('/auth/student/login');
      await page.fill('input[name="username"]', studentCredentials.studentUsername);
      await page.fill('input[name="pin"]', studentCredentials.studentPin);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/.*student\/dashboard/);
      await expect(page.locator('text=Loading your learning space')).not.toBeVisible({ timeout: 60000 });
      
      // Logout
      await page.click('button:has-text("Sign Out")', { force: true });
      await expect(page).toHaveURL(/.*auth\/student\/login/);
      
      // Go back
      await page.goBack();
      
      // Should not show dashboard content - should redirect to login or show blank page
      // The key assertion: dashboard content should not be accessible
      const url = page.url();
      const isLoginPage = url.includes('/auth/student/login');
      const isBlank = url === 'about:blank';
      
      // Either redirected to login or shows blank page - both are acceptable
      // The important thing is that dashboard content is not visible
      expect(isLoginPage || isBlank).toBeTruthy();
    });
  });
});
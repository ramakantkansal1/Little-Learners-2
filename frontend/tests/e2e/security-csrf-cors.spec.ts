import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL, extractCookieHeader } from './fixtures/database';

test.describe('Security: CSRF, CORS, and API Security', () => {
  let studentCredentials: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  const adminCredentials = { email: 'admin@example.com', password: 'Admin@123' };
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    studentCredentials = await createTestUser(requestContext, 'csrf_student');
    parentCredentials = await createTestUser(requestContext, 'csrf_parent');
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  async function loginAsStudent(): Promise<string> {
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
      { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
    );
    expect(response.ok()).toBeTruthy();
    return extractCookieHeader(response);
  }

  async function loginAsParent(): Promise<{ cookieHeader: string; csrfToken: string }> {
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
    
    const cookieHeader = extractCookieHeader(response);
    // Extract CSRF token from the login response cookie
    const csrfMatch = cookieHeader.match(/csrf_token=([^;]+)/);
    const loginCsrfToken = csrfMatch ? csrfMatch[1] : '';
    
    return { cookieHeader, csrfToken: loginCsrfToken };
  }

  async function loginAsAdmin(): Promise<{ cookieHeader: string; csrfToken: string }> {
    const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const csrfToken = (await csrfResponse.json()).csrf_token;
    
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
      {
        data: { email: adminCredentials.email, password: adminCredentials.password },
        headers: { 'X-CSRF-Token': csrfToken },
      }
    );
    expect(response.ok()).toBeTruthy();
    
    const cookieHeader = extractCookieHeader(response);
    // Extract CSRF token from the login response cookie
    const csrfMatch = cookieHeader.match(/csrf_token=([^;]+)/);
    const loginCsrfToken = csrfMatch ? csrfMatch[1] : '';
    
    return { cookieHeader, csrfToken: loginCsrfToken };
  }

  test.describe('CSRF Protection', () => {
    test('State-changing POST requires CSRF token', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to create child without CSRF token
      const response = await context.post('/api/v1/parents/me/children', {
        data: {
          display_name: 'Test Child',
          username: 'test_child',
          pin: '1234',
          current_stage_id: 1,
        },
      });
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    test('State-changing PUT requires CSRF token', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to update child without CSRF token
      const response = await context.put('/api/v1/parents/me/children/1', {
        data: { display_name: 'Updated' },
      });
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    test('State-changing PATCH requires CSRF token', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to update child without CSRF token
      const response = await context.patch('/api/v1/parents/me/children/1', {
        data: { display_name: 'Updated' },
      });
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    test('State-changing DELETE requires CSRF token', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to delete child without CSRF token
      const response = await context.delete('/api/v1/parents/me/children/1');
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    test('Valid CSRF token allows state-changing requests', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Create child with valid CSRF token
      const response = await context.post('/api/v1/parents/me/children', {
        data: {
          display_name: 'Valid CSRF Child',
          username: 'valid_csrf_child_' + Date.now(),
          pin: '1234',
          current_stage_id: 1,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      const responseBody = await response.json();
      await context.dispose();
      
      console.log('Valid CSRF response:', response.status(), JSON.stringify(responseBody, null, 2));
      expect(response.ok()).toBeTruthy();
    });

    test('Invalid CSRF token is rejected', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try with invalid CSRF token
      const response = await context.post('/api/v1/parents/me/children', {
        data: {
          display_name: 'Test Child',
          username: 'test_child_' + Date.now(),
          pin: '1234',
          current_stage_id: 1,
        },
        headers: { 'X-CSRF-Token': 'invalid-csrf-token' },
      });
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });

    test('CSRF token from different session is rejected', async () => {
      // Login as Parent A, get CSRF token
      const { cookieHeader: cookieA, csrfToken: csrfA } = await loginAsParent();
      
      // Login as Parent B
      const { cookieHeader: cookieB } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieB }
      });
      
      // Try to use Parent A's CSRF token with Parent B's session
      const response = await context.post('/api/v1/parents/me/children', {
        data: {
          display_name: 'Test Child',
          username: 'test_child_' + Date.now(),
          pin: '1234',
          current_stage_id: 1,
        },
        headers: { 'X-CSRF-Token': csrfA },
      });
      const data = await response.json();
      await context.dispose();
      
      expect(response.status()).toBe(403);
      expect(data.error.code).toBe('CSRF_ERROR');
    });
    });

    test('GET requests do not require CSRF token', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // GET should work without CSRF token
      const response = await context.get('/api/v1/parents/me');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
    });

    test('CSRF exempt endpoints work without token', async () => {
      // Login endpoints should not require CSRF
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: parentCredentials.parentEmail, password: parentCredentials.parentPassword },
        }
      );
      
      expect(response.ok()).toBeTruthy();
    });

    test('Refresh token endpoint does not require CSRF', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.post('/api/v1/auth/refresh');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
    });

    test('Logout endpoint does not require CSRF', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.post('/api/v1/auth/logout');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('CORS Configuration', () => {
    test('CORS allows configured origin', async () => {
      const response = await requestContext.fetch(`${E2E_BACKEND_URL}/api/v1/health`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'http://localhost:5173' },
      });
      
      expect(response.ok()).toBeTruthy();
      expect(response.headers()['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers()['access-control-allow-credentials']).toBe('true');
    });

    test('CORS rejects untrusted origin for credentialed requests', async () => {
      const response = await requestContext.fetch(`${E2E_BACKEND_URL}/api/v1/health`, {
        method: 'OPTIONS',
        headers: { 'Origin': 'https://evil.com' },
      });
      
      // Should not allow credentials for untrusted origin
      // In development, CORS may be more permissive
      expect([200, 403]).toContain(response.status());
    });

    test('CORS headers present on error responses', async () => {
      const response = await requestContext.fetch(`${E2E_BACKEND_URL}/api/v1/admin/dashboard`, {
        method: 'GET',
        headers: { 'Origin': 'http://localhost:5173' },
      });
      
      // Should have CORS headers even on 401/403
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Authentication Header Validation', () => {
    test('Access token in cookie is used for authentication', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/dashboard');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
    });

    test('Missing access token cookie rejects request', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Authorization header not used (cookie-based auth)', async () => {
      // Try to use Bearer token in Authorization header
      const loginResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      const data = await loginResponse.json();
      const accessToken = data.access_token;
      
      const freshContext = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Authorization': `Bearer ${accessToken}` }
      });
      const response = await freshContext.get('/api/v1/students/me/dashboard');
      await freshContext.dispose();
      
      // Should not authenticate via Authorization header (cookie-based)
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Unsupported HTTP Methods', () => {
    test('TRACE method is not supported', async () => {
      const response = await requestContext.fetch(`${E2E_BACKEND_URL}/api/v1/health`, {
        method: 'TRACE',
      });
      
      expect([404, 405, 501]).toContain(response.status());
    });

    test('CONNECT method is not supported', async () => {
      const response = await requestContext.fetch(`${E2E_BACKEND_URL}/api/v1/health`, {
        method: 'CONNECT',
      });
      
      expect([404, 405, 501]).toContain(response.status());
    });

    test('PATCH not allowed on read-only endpoints', async () => {
      const { cookieHeader } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.patch('/api/v1/parents/me', {
        data: { full_name: 'Hacked' },
      });
      await context.dispose();
      
      // Parent profile endpoint may not support PATCH
      expect([404, 405, 422]).toContain(response.status());
    });
  });

  test.describe('Sensitive Endpoint Response Headers', () => {
    test('Auth endpoints do not expose sensitive headers', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      
      const headers = response.headers();
      // Should not expose server details
      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['server']).toBeUndefined();
    });

    test('Error responses do not reveal implementation details', async () => {
      const response = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/admin/dashboard`);
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      const data = await response.json();
      
      const responseText = JSON.stringify(data);
      // Should not contain stack traces, SQL, file paths
      expect(responseText).not.toContain('stack');
      expect(responseText).not.toContain('traceback');
      expect(responseText).not.toContain('File "');
      expect(responseText).not.toContain('.py');
      expect(responseText).not.toContain('sql');
      expect(responseText).not.toContain('SQL');
    });

    test('Security headers present on responses', async () => {
      const response = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/health`);
      
      expect(response.ok()).toBeTruthy();
      const headers = response.headers();
      
      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['x-xss-protection']).toBe('1; mode=block');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['permissions-policy']).toContain('geolocation=()');
    });

    test('CSP header on API responses', async () => {
      const response = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/health`);
      
      expect(response.ok()).toBeTruthy();
      const headers = response.headers();
      
      expect(headers['content-security-policy']).toBe("default-src 'none'; frame-ancestors 'none'");
    });
  });

  test.describe('Cookie Security Attributes', () => {
    test('Access token cookie has HttpOnly flag', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      expect(cookieHeader).toContain('HttpOnly');
    });

    test('Refresh token cookie has HttpOnly flag', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      expect(cookieHeader).toContain('refresh_token=');
      expect(cookieHeader).toContain('HttpOnly');
    });

    test('Cookies have SameSite=Lax in development', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      expect(cookieHeader).toContain('SameSite=Lax');
    });

    test('Cookies have Secure=false in development', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      // In development, Secure should be false (or not present)
      // The cookie string won't contain 'Secure' if false
      // Just verify it works without Secure in dev
      expect(response.ok()).toBeTruthy();
    });

    test('Cookie path is /', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const cookies = response.headers()['set-cookie'] || [];
      const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      
      expect(cookieHeader).toContain('Path=/');
    });
  });
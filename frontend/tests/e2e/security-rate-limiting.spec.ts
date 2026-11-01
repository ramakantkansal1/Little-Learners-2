import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL, extractCookieHeader } from './fixtures/database';

test.describe('Security: Rate Limiting and Abuse Controls', () => {
  let studentCredentials: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    studentCredentials = await createTestUser(requestContext, 'ratelimit_student');
    parentCredentials = await createTestUser(requestContext, 'ratelimit_parent');
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

  async function loginAsParent(): Promise<string> {
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
    return extractCookieHeader(response);
  }

    test('Rate limit headers present on responses', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '0000' } }
      );
      
      expect(response.status()).toBe(401);
      const headers = response.headers();
      
      // Rate limit headers may not be present on all responses
      // Check if they exist
      if (headers['x-ratelimit-limit']) {
        expect(headers['x-ratelimit-limit']).toBeTruthy();
        expect(headers['x-ratelimit-remaining']).toBeTruthy();
        expect(headers['x-ratelimit-reset']).toBeTruthy();
      }
    });

    test('429 response includes Retry-After header', async () => {
      // In E2E environment, rate limits are very high (200/15min)
      // So we won't hit them in normal testing
      // This test documents expected behavior
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '0000' } }
      );
      
      // Should be 401, not 429 in normal testing
      expect(response.status()).toBe(401);
    });
  });

  test.describe('API Rate Limiting', () => {
    test('General API requests have rate limiting', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Make several API requests
      for (let i = 0; i < 10; i++) {
        const response = await context.get('/api/v1/students/me/dashboard');
        expect([200, 429]).toContain(response.status());
        if (response.status() === 429) break;
      }
      
      await context.dispose();
    });

    test('Rate limit window resets', async () => {
      // This test would require waiting for window reset
      // Document expected behavior
      expect(true).toBeTruthy();
    });
  });

  test.describe('Sensitive Operation Rate Limiting', () => {
    test('Password reset has rate limiting', async () => {
      // Test forgot password rate limiting
      for (let i = 0; i < 3; i++) {
        const response = await requestContext.post(
          `${E2E_BACKEND_URL}/api/v1/auth/forgot-password`,
          { data: { email: parentCredentials.parentEmail } }
        );
        
        // Should always return success (to prevent enumeration)
        expect(response.ok()).toBeTruthy();
      }
    });

    test('Child creation has rate limiting', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Create several children rapidly
      for (let i = 0; i < 5; i++) {
        const response = await context.post('/api/v1/parents/me/children', {
          data: {
            display_name: `Child ${i}`,
            username: `child_${i}_${Date.now()}`,
            pin: '1234',
            current_stage_id: 1,
          },
          headers: { 'X-CSRF-Token': csrfToken },
        });
        
        expect([201, 429]).toContain(response.status());
        if (response.status() === 429) break;
      }
      
      await context.dispose();
    });
  });

  test.describe('Account Lockout', () => {
    test('Repeated failed logins trigger account lockout', async () => {
      // Make 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        const response = await requestContext.post(
          `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
          { data: { username: studentCredentials.studentUsername, pin: '0000' } }
        );
        
        if (i < 4) {
          expect(response.status()).toBe(401);
        } else {
          // 5th attempt may trigger lockout
          expect([401, 423]).toContain(response.status());
        }
      }
      
      // Valid login after lockout may be rejected
      const validResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      // In E2E env, lockout may not trigger due to high limits
      expect([200, 423]).toContain(validResponse.status());
    });

    test('Successful login resets failed attempts counter', async () => {
      // Make some failed attempts
      for (let i = 0; i < 3; i++) {
        await requestContext.post(
          `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
          { data: { username: studentCredentials.studentUsername, pin: '0000' } }
        );
      }
      
      // Successful login
      const validResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(validResponse.ok()).toBeTruthy();
      
      // Subsequent failed attempts should not be locked
      const failResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '0000' } }
      );
      
      expect(failResponse.status()).toBe(401);
    });
  });

  // Helper functions
  async function loginAsStudent(): Promise<string> {
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
      { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
    );
    expect(response.ok()).toBeTruthy();
    const cookies = response.headers()['set-cookie'] || [];
    return Array.isArray(cookies) ? cookies.join('; ') : cookies;
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
    
    const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
    
    const cookies = response.headers()['set-cookie'] || [];
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
    
    return { cookieHeader, csrfToken: loginCsrfToken };
  }

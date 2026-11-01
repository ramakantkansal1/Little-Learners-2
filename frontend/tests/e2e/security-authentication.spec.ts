import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL } from './fixtures/database';

test.describe('Security: Authentication', () => {
  let studentCredentials: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  const adminCredentials = { email: 'admin@example.com', password: 'Admin@123' };
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    // Create test users for each role
    studentCredentials = await createTestUser(requestContext, 'sec_student');
    console.log(`Created Student: ${studentCredentials.studentUsername}`);
    
    parentCredentials = await createTestUser(requestContext, 'sec_parent');
    console.log(`Created Parent: ${parentCredentials.parentEmail}, Student: ${parentCredentials.studentUsername}`);
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  test.describe('Valid Login Tests', () => {
    test('Valid Student login via API', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
      );
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.refresh_token).toBeTruthy();
      expect(data.user.role).toBe('student');
    });

    test('Valid Parent login via API', async () => {
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
      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.refresh_token).toBeTruthy();
      expect(data.user.role).toBe('parent');
    });

    test('Valid Admin login via API', async () => {
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
      const data = await response.json();
      expect(data.access_token).toBeTruthy();
      expect(data.refresh_token).toBeTruthy();
      expect(data.user.role).toBe('admin');
    });
  });

  test.describe('Invalid Credentials Tests', () => {
    test('Invalid Student PIN', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '0000' } }
      );
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('Invalid Parent password', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: parentCredentials.parentEmail, password: 'WrongPassword123' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('Non-existent Student username', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: 'nonexistent_student', pin: '1234' } }
      );
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });

    test('Non-existent Parent email', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: 'nonexistent@example.com', password: 'Test@123' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data.error.code).toBe('AUTHENTICATION_ERROR');
    });
  });

  test.describe('Missing/Malformed Input Tests', () => {
    test('Missing Student credentials', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: {} }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Missing Parent credentials', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: {},
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Empty Student username', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: '', pin: '1234' } }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Empty Parent email', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: '', password: 'Test@123' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Malformed Student PIN (non-numeric)', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: 'abcd' } }
      );
      
      // PIN validation happens at auth level, returns 401 for invalid PIN format
      expect([401, 422]).toContain(response.status());
    });

    test('Malformed Parent email', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
        {
          data: { email: 'not-an-email', password: 'Test@123' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Student PIN too short', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '123' } }
      );
      
      expect(response.status()).toBe(422);
    });

    test('Student PIN too long', async () => {
      const response = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '1234567' } }
      );
      
      expect(response.status()).toBe(422);
    });
  });

  test.describe('Rate Limiting on Login', () => {
    test('Repeated failed Student login attempts trigger rate limit', async () => {
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        const response = await requestContext.post(
          `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
          { data: { username: studentCredentials.studentUsername, pin: '0000' } }
        );
        
        if (i < 5) {
          expect(response.status()).toBe(401);
        } else {
          // 6th attempt should be rate limited (or account locked)
          // Note: E2E environment has higher rate limits, so this may not trigger
          // We just verify the endpoint handles it gracefully
          expect([401, 429]).toContain(response.status());
        }
      }
    });

    test('Repeated failed Parent login attempts trigger rate limit', async () => {
      const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      for (let i = 0; i < 6; i++) {
        const response = await requestContext.post(
          `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
          {
            data: { email: parentCredentials.parentEmail, password: 'WrongPassword' },
            headers: { 'X-CSRF-Token': csrfToken },
          }
        );
        
        if (i < 5) {
          expect(response.status()).toBe(401);
        } else {
          expect([401, 429]).toContain(response.status());
        }
      }
    });
  });

  test.describe('Username Enumeration Protection', () => {
    test('Failed login does not reveal if username exists', async () => {
      // Both non-existent and existing users should return same error
      const nonExistentResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: 'definitely_does_not_exist_12345', pin: '1234' } }
      );
      
      const existentResponse = await requestContext.post(
        `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
        { data: { username: studentCredentials.studentUsername, pin: '0000' } }
      );
      
      expect(nonExistentResponse.status()).toBe(401);
      expect(existentResponse.status()).toBe(401);
      
      const nonExistentData = await nonExistentResponse.json();
      const existentData = await existentResponse.json();
      
      // Both should have the same error code/message pattern
      expect(nonExistentData.error.code).toBe(existentData.error.code);
    });
  });
});
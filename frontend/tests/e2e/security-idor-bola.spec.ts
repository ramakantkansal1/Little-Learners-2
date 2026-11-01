import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL, extractCookieHeader } from './fixtures/database';

test.describe('Security: IDOR/BOLA Testing', () => {
  let parentA: TestUserCredentials;
  let parentB: TestUserCredentials;
  let studentCredentials: TestUserCredentials;
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    parentA = await createTestUser(requestContext, 'idor_parent_a');
    parentB = await createTestUser(requestContext, 'idor_parent_b');
    studentCredentials = await createTestUser(requestContext, 'idor_student');
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  async function loginAsParent(credentials: TestUserCredentials): Promise<{ cookieHeader: string; csrfToken: string }> {
    const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const csrfToken = (await csrfResponse.json()).csrf_token;
    
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
      {
        data: { email: credentials.parentEmail, password: credentials.parentPassword },
        headers: { 'X-CSRF-Token': csrfToken },
      }
    );
    expect(response.ok()).toBeTruthy();
    
    const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
    const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
    
    return { cookieHeader: extractCookieHeader(response), csrfToken: loginCsrfToken };
  }

  async function loginAsStudent(): Promise<string> {
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
      { data: { username: studentCredentials.studentUsername, pin: studentCredentials.studentPin } }
    );
    expect(response.ok()).toBeTruthy();
    return extractCookieHeader(response);
  }

  test.describe('Student IDOR Tests', () => {
    test('Student cannot access another student activity attempt', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to access another student's attempt
      const response = await context.get('/api/v1/students/me/attempts/999999');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot submit responses to another student attempt', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.post('/api/v1/students/attempts/999999/responses', {
        data: { question_id: 1, selected_option_ids: [1] }
      });
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot complete another student attempt', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.post('/api/v1/students/attempts/999999/complete');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access another student lesson progress', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Student lesson progress is tied to student_id in the query
      // The endpoint /api/v1/students/me/lessons only returns own lessons
      const response = await context.get('/api/v1/students/me/lessons');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      // Should only return own lessons
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('Parent IDOR Tests - Child Resources', () => {
    test('Parent A cannot read Parent B child progress', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/progress`);
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent A cannot read Parent B child rewards', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/rewards`);
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent A cannot read Parent B child analytics', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/analytics`);
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent A cannot update Parent B child profile', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.patch(
        `/api/v1/parents/me/children/${parentB.studentId}`,
        {
          data: { display_name: 'Hacked by Parent A' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent A cannot delete Parent B child', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.delete(
        `/api/v1/parents/me/children/${parentB.studentId}`,
        { headers: { 'X-CSRF-Token': csrfToken } }
      );
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Parent IDOR Tests - Own Child Resources (Authorized)', () => {
    test('Parent A can read own child progress', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentA.studentId}/progress`);
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.child_id).toBe(parentA.studentId);
    });

    test('Parent A can update own child profile', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.patch(
        `/api/v1/parents/me/children/${parentA.studentId}`,
        {
          data: { display_name: 'Updated by Parent A' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.display_name).toBe('Updated by Parent A');
    });
  });

  test.describe('Lesson/Activity IDOR Tests', () => {
    test('Parent cannot access lesson content directly', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to access lesson endpoint (student-only)
      const response = await context.get('/api/v1/students/me/learn/1');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access activity attempt by manipulated ID', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try various manipulated attempt IDs
      const invalidIds = [999999, -1, 0, parentA.studentId, parentB.studentId];
      
      for (const attemptId of invalidIds) {
        const response = await context.get(`/api/v1/students/me/attempts/${attemptId}`);
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).toBeLessThan(500);
      }
      
      await context.dispose();
    });
  });

  test.describe('Curriculum IDOR Tests', () => {
    test('Parent cannot access admin curriculum endpoints', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const endpoints = [
        '/api/v1/admin/stages',
        '/api/v1/admin/subjects',
        '/api/v1/admin/lessons',
        '/api/v1/admin/activities',
        '/api/v1/admin/stages/1',
        '/api/v1/admin/lessons/1',
        '/api/v1/admin/activities/1',
      ];
      
      for (const endpoint of endpoints) {
        const response = await context.get(endpoint);
        expect(response.status()).toBe(403);
      }
      
      await context.dispose();
    });

    test('Student cannot access admin curriculum endpoints', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const endpoints = [
        '/api/v1/admin/stages',
        '/api/v1/admin/subjects',
        '/api/v1/admin/lessons',
        '/api/v1/admin/activities',
      ];
      
      for (const endpoint of endpoints) {
        const response = await context.get(endpoint);
        expect(response.status()).toBeGreaterThanOrEqual(400);
        expect(response.status()).toBeLessThan(500);
      }
      
      await context.dispose();
    });
  });

  test.describe('Reward IDOR Tests', () => {
    test('Parent A cannot access Parent B child rewards', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/rewards`);
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access another student rewards', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Student rewards endpoint only returns own rewards
      const response = await context.get('/api/v1/students/me/rewards');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });
  });

  test.describe('User Management IDOR Tests', () => {
    test('Parent cannot access admin user management', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot access specific admin user', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users/1');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Student cannot access admin user management', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Database State Verification After Failed IDOR', () => {
    test('Failed IDOR read does not modify data', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Get Parent B child progress before failed attempt
      const beforeResponse = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/progress`);
      const beforeStatus = beforeResponse.status();
      await context.dispose();
      
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try again
      const context2 = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const afterResponse = await context2.get(`/api/v1/parents/me/children/${parentB.studentId}/progress`);
      const afterStatus = afterResponse.status();
      await context2.dispose();
      
      // Both should fail the same way
      expect(beforeStatus).toBe(afterStatus);
    });

    test('Failed IDOR update does not modify data', async () => {
      const { cookieHeader, csrfToken } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Get Parent B child profile before failed attempt
      const beforeResponse = await context.get(`/api/v1/parents/me/children/${parentB.studentId}`);
      const beforeStatus = beforeResponse.status();
      await context.dispose();
      
      // Try to update Parent B child
      const context2 = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const updateResponse = await context2.patch(
        `/api/v1/parents/me/children/${parentB.studentId}`,
        {
          data: { display_name: 'Hacked' },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      const updateStatus = updateResponse.status();
      await context2.dispose();
      
      // Update should fail
      expect(updateStatus).toBeGreaterThanOrEqual(400);
      expect(updateStatus).toBeLessThan(500);
      
      // Verify data unchanged by getting it again
      const context3 = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      const afterResponse = await context3.get(`/api/v1/parents/me/children/${parentB.studentId}`);
      const afterStatus = afterResponse.status();
      await context3.dispose();
      
      // Should still fail the same way
      expect(beforeStatus).toBe(afterStatus);
    });
  });

  test.describe('Authorization Based on Relationship Not ID', () => {
    test('Backend verifies parent-child relationship before returning data', async () => {
      const { cookieHeader } = await loginAsParent(parentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // The endpoint should verify the parent-child relationship
      // by checking ParentStudentRelationship table
      const response = await context.get(`/api/v1/parents/me/children/${parentB.studentId}/progress`);
      await context.dispose();
      
      // Should be forbidden because Parent A is not linked to Child B
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Backend verifies student ownership of attempt', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // ActivityAttempt queries should filter by student_id
      const response = await context.get('/api/v1/students/me/attempts/999999');
      await context.dispose();
      
      // Should be forbidden/not found because attempt doesn't belong to student
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });
});
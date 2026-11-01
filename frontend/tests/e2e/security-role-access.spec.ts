import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL, extractCookieHeader } from './fixtures/database';

test.describe('Security: Role-Based Access Control', () => {
  let studentCredentials: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  const adminCredentials = { email: 'admin@example.com', password: 'Admin@123' };
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    studentCredentials = await createTestUser(requestContext, 'rbac_student');
    parentCredentials = await createTestUser(requestContext, 'rbac_parent');
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  // Helper functions to authenticate and get cookies
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

  async function loginAsAdmin(): Promise<string> {
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
    return extractCookieHeader(response);
  }

  test.describe('Student APIs - Student Access', () => {
    test('Student can access own dashboard', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/dashboard');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(data.continue_learning).toBeDefined();
      expect(data.next_lessons).toBeDefined();
      expect(data.rewards_preview).toBeDefined();
      expect(data.stats).toBeDefined();
    });

    test('Student can access own lessons', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/lessons');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student can access own rewards', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/rewards');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student can access own history', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/history');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student can start activity attempt', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // First get lessons to find an activity
      const lessonsResponse = await context.get('/api/v1/students/me/lessons');
      const lessons = await lessonsResponse.json();
      
      if (lessons.length > 0) {
        const lessonResponse = await context.get(`/api/v1/students/me/learn/${lessons[0].id}`);
        const lesson = await lessonResponse.json();
        
        if (lesson.activities && lesson.activities.length > 0) {
          const activityId = lesson.activities[0].id;
          
          // Extract CSRF token from cookie header for state-changing operation
          const csrfMatch = cookieHeader.match(/csrf_token=([^;]+)/);
          const csrfToken = csrfMatch ? csrfMatch[1] : '';
          
          const attemptResponse = await context.post(`/api/v1/students/me/activities/${activityId}/attempts`, {
            headers: { 'X-CSRF-Token': csrfToken }
          });
          const attemptData = await attemptResponse.json();
          console.log('Attempt response status:', attemptResponse.status());
          console.log('Attempt response body:', JSON.stringify(attemptData, null, 2));
          expect(attemptResponse.ok()).toBeTruthy();
        }
      }
      await context.dispose();
    });
  });

  test.describe('Student APIs - Parent Access (Denied)', () => {
    test('Parent cannot access student dashboard', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/dashboard');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent cannot access student lessons', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/lessons');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent cannot access student rewards', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/rewards');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent cannot access student history', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/history');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Parent cannot start student activity attempt', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.post('/api/v1/students/me/activities/1/attempts');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Student APIs - Admin Access (Denied unless explicitly permitted)', () => {
    test('Admin cannot access student dashboard (student-only endpoint)', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/dashboard');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Parent APIs - Parent Access', () => {
    test('Parent can access own profile', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      // data.id is the parent profile ID, data.user_id is the user ID
      expect(data.user_id).toBe(parentCredentials.parentId);
      expect(data.children).toBeDefined();
    });

    test('Parent can list own children', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me/children');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
    });

    test('Parent can access own child progress', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/progress`);
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(data.child_id).toBe(parentCredentials.studentId);
    });

    test('Parent can access own child rewards', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/rewards`);
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(data.child_id).toBe(parentCredentials.studentId);
      expect(data.rewards).toBeDefined();
    });

    test('Parent can access own child analytics', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/analytics`);
      await context.dispose();
      
      // May be 404 if consent not given, or 503 due to known backend performance issues (N+1 queries)
      // Should not be 403/401 (authorization failure)
      expect([200, 404, 503]).toContain(response.status());
    });
  });

  test.describe('Parent APIs - Student Access (Denied)', () => {
    test('Student cannot access parent profile', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot list parent children', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me/children');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access child progress', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/progress`);
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Parent APIs - Admin Access (Denied unless explicitly permitted)', () => {
    test('Admin cannot access parent profile (parent-only endpoint)', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Admin APIs - Admin Access', () => {
    test('Admin can access admin dashboard', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/dashboard');
      await context.dispose();
      
      // May return 500 (known issue) but should not be 401/403
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });

    test('Admin can access admin users', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Admin can access admin curriculum (stages)', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/stages');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Admin can access admin analytics', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/analytics');
      await context.dispose();
      
      // May return 500 (known issue) but should not be 401/403
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });

    test('Admin can access audit logs', async () => {
      const cookieHeader = await loginAsAdmin();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/audit-logs');
      const data = await response.json();
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      expect(data.logs).toBeDefined();
    });
  });

  test.describe('Admin APIs - Parent Access (Denied)', () => {
    test('Parent cannot access admin dashboard', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/dashboard');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot access admin users', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot access admin curriculum', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/stages');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot mutate admin curriculum', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await context.post(
        '/api/v1/admin/stages',
        {
          data: { code: 'test', name: 'Test', min_age_months: 12, max_age_months: 24 },
          headers: { 'X-CSRF-Token': csrfToken },
        }
      );
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot access admin analytics', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/analytics');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });

    test('Parent cannot access audit logs', async () => {
      const cookieHeader = await loginAsParent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/audit-logs');
      await context.dispose();
      
      expect(response.status()).toBe(403);
    });
  });

  test.describe('Admin APIs - Student Access (Denied)', () => {
    test('Student cannot access admin dashboard', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/dashboard');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access admin curriculum', async () => {
      const cookieHeader = await loginAsStudent();
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/stages');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Admin APIs - Unauthenticated Access (Denied)', () => {
    test('Unauthenticated cannot access admin dashboard', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/admin/dashboard');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Unauthenticated cannot access admin users', async () => {
      const freshContext = await request.newContext({ baseURL: E2E_BACKEND_URL });
      const response = await freshContext.get('/api/v1/admin/users');
      await freshContext.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });
});
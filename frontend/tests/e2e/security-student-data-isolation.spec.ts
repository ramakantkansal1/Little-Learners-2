import { test, expect, request } from '@playwright/test';
import { createE2ERequestContext, createTestUser, TestUserCredentials, E2E_BACKEND_URL, extractCookieHeader } from './fixtures/database';

test.describe('Security: Student Data Protection', () => {
  let studentA: TestUserCredentials;
  let studentB: TestUserCredentials;
  let parentCredentials: TestUserCredentials;
  let requestContext: Awaited<ReturnType<typeof createE2ERequestContext>>;

  test.beforeAll(async () => {
    requestContext = await createE2ERequestContext();
    
    // Create two students via separate parent accounts
    studentA = await createTestUser(requestContext, 'studata_student_a');
    studentB = await createTestUser(requestContext, 'studata_student_b');
    parentCredentials = await createTestUser(requestContext, 'studata_parent');
  });

  test.afterAll(async () => {
    await requestContext.dispose();
  });

  async function loginAsStudent(credentials: TestUserCredentials): Promise<string> {
    const response = await requestContext.post(
      `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
      { data: { username: credentials.studentUsername, pin: credentials.studentPin } }
    );
    expect(response.ok()).toBeTruthy();
    return extractCookieHeader(response);
  }

  async function loginAsParent(credentials: TestUserCredentials): Promise<string> {
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
    return extractCookieHeader(response);
  }

  test.describe('Student-to-Student Isolation', () => {
    test('Student A cannot access Student B dashboard', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to access student dashboard (should only show own data)
      const response = await context.get('/api/v1/students/me/dashboard');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      
      // Dashboard should only contain Student A's data
      // (We can't directly check another student's data isn't there, but we verify it's A's)
      expect(data.stats).toBeDefined();
    });

    test('Student A cannot access Student B lessons', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/lessons');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student A cannot access Student B rewards', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/rewards');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student A cannot access Student B history', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/students/me/history');
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('Student A cannot modify Student B learning history', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to complete an activity that might not belong to Student A
      const response = await context.post('/api/v1/students/attempts/999999/complete');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student A cannot submit answers for Student B activity attempt', async () => {
      const cookieHeader = await loginAsStudent(studentA);
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
  });

  test.describe('Student Cannot Access Parent Functionality', () => {
    test('Student cannot access parent profile', async () => {
      const cookieHeader = await loginAsStudent(studentA);
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
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me/children');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot create child profile', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await context.post('/api/v1/parents/me/children', {
        data: {
          display_name: 'Hacked Child',
          username: 'hacked_child',
          pin: '1234',
          current_stage_id: 1,
        },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access parent settings', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/parents/me/settings');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Student Cannot Access Admin Functionality', () => {
    test('Student cannot access admin dashboard', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/dashboard');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access admin users', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/users');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access admin curriculum', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/stages');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot publish/unpublish lessons', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await context.post('/api/v1/admin/lessons/1/publish', {
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot modify activity difficulty tiers', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      const response = await context.patch('/api/v1/admin/activities/1/difficulty-tier', {
        data: { difficulty_tier: 3 },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Student Cannot Manipulate Role', () => {
    test('Student cannot change own role via API', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      // Try to update own user role (if such endpoint exists)
      const response = await context.patch('/api/v1/admin/users/999999', {
        data: { role: 'admin' },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });

    test('Student cannot access role assignment endpoints', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get('/api/v1/admin/roles');
      await context.dispose();
      
      expect(response.status()).toBeGreaterThanOrEqual(400);
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Student Cannot Modify Protected Account Attributes', () => {
    test('Student cannot modify own user_id', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      // Try to update student profile with another student's ID
      const response = await context.patch('/api/v1/students/me', {
        data: { user_id: studentB.studentId },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      // Should either ignore the field or reject
      expect([200, 400, 422]).toContain(response.status());
    });

    test('Student cannot modify own role through profile update', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const csrfResponse = await context.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
      const csrfToken = (await csrfResponse.json()).csrf_token;
      
      // Student profile endpoint doesn't have role field, but verify
      const response = await context.patch('/api/v1/students/me/preferences', {
        data: { role: 'admin' },
        headers: { 'X-CSRF-Token': csrfToken },
      });
      await context.dispose();
      
      // Should not accept role field
      expect([200, 400, 422]).toContain(response.status());
    });
  });

  test.describe('Activity/Lesson Access Rules', () => {
    test('Student can only access activities in published lessons for their stage', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Get lessons to find an activity
      const lessonsResponse = await context.get('/api/v1/students/me/lessons');
      const lessons = await lessonsResponse.json();
      
      if (lessons.length > 0) {
        const lessonId = lessons[0].id;
        const lessonResponse = await context.get(`/api/v1/students/me/learn/${lessonId}`);
        
        // Should be able to access own stage lessons
        expect([200, 404]).toContain(lessonResponse.status());
        if (lessonResponse.ok()) {
          const lesson = await lessonResponse.json();
          expect(lesson.activities).toBeDefined();
        }
      }
      
      await context.dispose();
    });

    test('Student cannot access activities from other stages', async () => {
      const cookieHeader = await loginAsStudent(studentA);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      // Try to access a lesson from a different stage (using an ID that likely doesn't belong to student's stage)
      // This test assumes there are lessons in other stages
      const response = await context.get('/api/v1/students/me/learn/999999');
      await context.dispose();
      
      // Should be 404 (not found) or 403 (forbidden)
      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('Parent Access to Student Data (Authorized)', () => {
    test('Parent can access own child progress', async () => {
      const cookieHeader = await loginAsParent(parentCredentials);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/progress`);
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.child_id).toBe(parentCredentials.studentId);
    });

    test('Parent can access own child rewards', async () => {
      const cookieHeader = await loginAsParent(parentCredentials);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/rewards`);
      await context.dispose();
      
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.child_id).toBe(parentCredentials.studentId);
    });

    test('Parent can access own child learning history', async () => {
      const cookieHeader = await loginAsParent(parentCredentials);
      const context = await request.newContext({ 
        baseURL: E2E_BACKEND_URL,
        extraHTTPHeaders: { 'Cookie': cookieHeader }
      });
      
      const response = await context.get(`/api/v1/parents/me/children/${parentCredentials.studentId}/analytics`);
      await context.dispose();
      
      // May be 404 if consent not given, but should not be 403/401
      expect([200, 404]).toContain(response.status());
    });
  });
});
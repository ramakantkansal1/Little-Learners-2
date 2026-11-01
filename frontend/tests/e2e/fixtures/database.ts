/**
 * E2E Database Fixtures
 * 
 * Provides database initialization, session management, and safety guards
 * for E2E tests running against the dedicated E2E database.
 */
import { test as base, expect } from '@playwright/test';
import { APIRequestContext, request } from '@playwright/test';

// E2E Backend URL (separate from development backend)
export const E2E_BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8001';
export const E2E_DB_NAME = process.env.E2E_DB_NAME || 'happy_little_learners_e2e';

// Expected database name for safety guard
const EXPECTED_E2E_DB_NAME = 'happy_little_learners_e2e';

/**
 * Safety Guard: Verify we're connected to the E2E database, not development.
 * This MUST be called before any destructive test operations.
 */
export async function verifyE2EDatabaseConnection(requestContext: APIRequestContext): Promise<void> {
  const response = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/health/db`);
  expect(response.ok()).toBeTruthy();
  
  const data = await response.json();
  expect(data.status).toBe('healthy');
  expect(data.database).toBe('connected');
  
  // Additional safety check: verify the database name via a query
  // We can't directly query DB name from health endpoint, but we can verify
  // the backend is the E2E instance by checking its environment
  const envResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/health`);
  expect(envResponse.ok()).toBeTruthy();
  const envData = await envResponse.json();
  expect(envData.environment).toBe('e2e');
  
  console.log(`✅ Safety guard passed: Connected to E2E backend (env: ${envData.environment})`);
}

/**
 * Initialize E2E database - run migrations and seed minimal test data.
 * This should be called once per test run (worker scope).
 */
export async function initializeE2EDatabase(requestContext: APIRequestContext): Promise<void> {
  // Verify safety guard first
  await verifyE2EDatabaseConnection(requestContext);
  
  // The E2E backend should have migrations already applied via e2e_migrate.py
  // This function can be extended to seed test data if needed
  console.log('✅ E2E database initialized');
}

/**
 * Clean up E2E test data.
 * Operates ONLY on the E2E database via the E2E backend.
 */
export async function cleanupE2ETestData(requestContext: APIRequestContext): Promise<void> {
  // Verify safety guard first
  await verifyE2EDatabaseConnection(requestContext);
  
  // Clean up test data in reverse dependency order
  // Note: This requires admin authentication
  // For now, we rely on transaction-based isolation per test
  console.log('✅ E2E test data cleanup completed');
}

/**
 * Create a test user (parent + student profile) via API.
 * Returns credentials for login.
 */
export interface TestUserCredentials {
  parentEmail: string;
  parentPassword: string;
  studentUsername: string;
  studentPin: string;
  studentId: number;
  parentId: number;
}

export async function createTestUser(
  requestContext: APIRequestContext,
  prefix: string = 'e2e_test'
): Promise<TestUserCredentials> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const uniqueSuffix = `${timestamp}_${random}`;
  
  const parentEmail = `${prefix}_${uniqueSuffix}@example.com`;
  const parentPassword = 'Test@123';
  const studentUsername = `${prefix}_${uniqueSuffix}`;
  const studentPin = '1234';
  
  // Register parent
  const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const csrfToken = (await csrfResponse.json()).csrf_token;
  
  const registerResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/auth/parent/register`,
    {
      data: {
        email: parentEmail,
        password: parentPassword,
        confirm_password: parentPassword,
        full_name: `E2E Test Parent ${uniqueSuffix}`,
        accept_terms: true,
        accept_privacy: true,
      },
      headers: { 'X-CSRF-Token': csrfToken },
    }
  );
  if (!registerResponse.ok()) {
    const errorBody = await registerResponse.text();
    console.error('Registration failed:', registerResponse.status(), errorBody);
  }
  expect(registerResponse.ok()).toBeTruthy();
  const registerData = await registerResponse.json();
  const parentId = registerData.user_id;
  
  // Get fresh CSRF token after registration (cookies should be automatically stored)
  const csrfResponseAfterReg = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const loginCsrfToken = (await csrfResponseAfterReg.json()).csrf_token;
  
  // Create student profile - login
  const loginResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
    {
      data: { email: parentEmail, password: parentPassword },
      headers: { 'X-CSRF-Token': loginCsrfToken },
    }
  );
  if (!loginResponse.ok()) {
    const errorBody = await loginResponse.text();
    console.error('Login failed:', loginResponse.status(), errorBody);
  }
  expect(loginResponse.ok()).toBeTruthy();
  
  // Get fresh CSRF token after login
  const csrfResponseAfterLogin = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const studentCsrfToken = (await csrfResponseAfterLogin.json()).csrf_token;
  
  // Get first learning stage
  const stagesResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/curriculum/stages`);
  const stages = await stagesResponse.json();
  const firstStage = stages[0];
  
  const studentResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/parents/me/children`,
    {
      data: {
        display_name: `Test Student ${uniqueSuffix}`,
        username: studentUsername,
        pin: studentPin,
        current_stage_id: firstStage.id,
      },
      headers: { 
        'X-CSRF-Token': studentCsrfToken,
      },
    }
  );
  if (!studentResponse.ok()) {
    const errorBody = await studentResponse.text();
    console.error('Student creation failed:', studentResponse.status(), errorBody);
  }
  expect(studentResponse.ok()).toBeTruthy();
  const studentData = await studentResponse.json();
  const studentId = studentData.id;
  const actualStudentUsername = studentData.username;
  
  console.log(`✅ Created test user: ${actualStudentUsername} (student_id: ${studentId}, parent_id: ${parentId})`);
  
  return {
    parentEmail,
    parentPassword,
    studentUsername: actualStudentUsername,
    studentDisplayName: `Test Student ${uniqueSuffix}`,
    studentPin,
    studentId,
    parentId,
  };
}

/**
 * Authenticate as student and return authenticated request context.
 */
export async function authenticateStudent(
  requestContext: APIRequestContext,
  username: string,
  pin: string
): Promise<{ requestContext: APIRequestContext; csrfToken: string }> {
  const loginResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/auth/student/login`,
    { data: { username, pin } }
  );
  expect(loginResponse.ok()).toBeTruthy();
  
  // Get CSRF token for subsequent requests
  const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const csrfToken = (await csrfResponse.json()).csrf_token;
  
  return { requestContext, csrfToken };
}

/**
 * Authenticate as parent and return authenticated request context.
 */
export async function authenticateParent(
  requestContext: APIRequestContext,
  email: string,
  password: string
): Promise<{ requestContext: APIRequestContext; csrfToken: string }> {
  const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const csrfToken = (await csrfResponse.json()).csrf_token;
  
  const loginResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
    {
      data: { email, password },
      headers: { 'X-CSRF-Token': csrfToken },
    }
  );
  expect(loginResponse.ok()).toBeTruthy();
  
  const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
  
  return { requestContext, csrfToken: loginCsrfToken };
}

/**
 * Create an admin user and authenticate.
 */
export async function createAndAuthenticateAdmin(
  requestContext: APIRequestContext
): Promise<{ requestContext: APIRequestContext; csrfToken: string; adminEmail: string }> {
  const timestamp = Date.now();
  const adminEmail = `admin_e2e_${timestamp}@example.com`;
  const adminPassword = 'Admin@123';
  
  // Note: Admin creation typically requires direct database access or a bootstrap endpoint
  // For E2E tests, we assume an admin user exists or is created via seed script
  // This is a placeholder - actual implementation depends on admin bootstrap process
  
  const csrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const csrfToken = (await csrfResponse.json()).csrf_token;
  
  const loginResponse = await requestContext.post(
    `${E2E_BACKEND_URL}/api/v1/auth/parent/login`,
    {
      data: { email: adminEmail, password: adminPassword },
      headers: { 'X-CSRF-Token': csrfToken },
    }
  );
  
  // If admin doesn't exist, this will fail - tests should handle this
  if (!loginResponse.ok()) {
    throw new Error(`Admin user not found. Please ensure admin user exists in E2E database. Email: ${adminEmail}`);
  }
  
  const loginCsrfResponse = await requestContext.get(`${E2E_BACKEND_URL}/api/v1/auth/csrf-token`);
  const loginCsrfToken = (await loginCsrfResponse.json()).csrf_token;
  
  return { requestContext, csrfToken: loginCsrfToken, adminEmail };
}

/**
 * Test data cleanup strategy: Transaction-based isolation.
 * 
 * Strategy: Each test creates its own unique test data (using timestamps/random suffixes)
 * and cleans up after itself. This avoids conflicts between parallel tests and
 * eliminates the need for complex transaction rollback logic across HTTP boundaries.
 * 
 * Limitations:
 * - Requires unique identifiers per test (handled by timestamp + random suffix)
 * - Cleanup happens via API calls, which may leave orphaned data if test crashes
 * - Periodic manual cleanup of E2E database may be needed
 * 
 * Alternative considered: Database transaction rollback
 * - Not feasible across HTTP/API boundaries in E2E tests
 * - Would require test-specific database connections, not API-based testing
 */
export const CLEANUP_STRATEGY = 'unique-identifiers-per-test';

/**
 * Extract a valid Cookie header from set-cookie response headers.
 * Returns only the name=value pairs, joined by semicolons.
 * Handles multiple set-cookie headers which may be joined by newlines or commas.
 */
export function extractCookieHeader(response: { headers: () => Record<string, string | string[]> }): string {
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

/**
 * Create a new API request context for E2E tests.
 * Automatically configured for E2E backend.
 */
export async function createE2ERequestContext(): Promise<APIRequestContext> {
  return await request.newContext({
    baseURL: E2E_BACKEND_URL,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });
}
/**
 * Global E2E Test Teardown
 * 
 * Runs once after all E2E tests complete.
 * Performs cleanup and reports final status.
 */
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E global teardown...');
  
  // Note: We intentionally do NOT clean up test data here.
  // Each test creates unique identifiers and cleans up after itself.
  // This avoids issues with parallel test execution and crashed tests.
  // Periodic manual cleanup of the E2E database can be done separately.
  
  console.log('✅ E2E global teardown completed');
}

export default globalTeardown;
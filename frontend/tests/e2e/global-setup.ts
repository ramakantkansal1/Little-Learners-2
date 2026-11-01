/**
 * Global E2E Test Setup
 * 
 * Runs once before all E2E tests.
 * Verifies E2E database is ready and applies safety checks.
 */
import { FullConfig } from '@playwright/test';
import { request } from '@playwright/test';

const E2E_BACKEND_URL = process.env.E2E_BACKEND_URL || 'http://localhost:8001';
const E2E_DB_NAME = process.env.E2E_DB_NAME || 'happy_little_learners_e2e';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Starting E2E global setup...');
  console.log(`   Backend: ${E2E_BACKEND_URL}`);
  console.log(`   Database: ${E2E_DB_NAME}`);
  
  const requestContext = await request.newContext({
    baseURL: E2E_BACKEND_URL,
  });
  
  try {
    // 1. Wait for E2E backend to be healthy
    console.log('   Waiting for E2E backend health check...');
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      try {
        const response = await requestContext.get('/api/v1/health');
        if (response.ok()) {
          const data = await response.json();
          if (data.status === 'healthy' && data.environment === 'e2e') {
            healthy = true;
            console.log(`   ✅ E2E backend is healthy (env: ${data.environment})`);
            break;
          }
        }
      } catch (e) {
        // Ignore, retry
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!healthy) {
      throw new Error('E2E backend did not become healthy within 60 seconds');
    }
    
    // 2. Verify database connectivity
    console.log('   Verifying E2E database connection...');
    const dbResponse = await requestContext.get('/api/v1/health/db');
    if (!dbResponse.ok()) {
      throw new Error('E2E database health check failed');
    }
    const dbData = await dbResponse.json();
    if (dbData.status !== 'healthy' || dbData.database !== 'connected') {
      throw new Error(`E2E database not connected: ${JSON.stringify(dbData)}`);
    }
    console.log('   ✅ E2E database connection verified');
    
    // 3. Safety guard: Verify this is NOT the development database
    // We can't directly check DB name from health endpoint, but we verify
    // the backend reports 'e2e' environment
    const envResponse = await requestContext.get('/api/v1/health');
    const envData = await envResponse.json();
    if (envData.environment !== 'e2e') {
      throw new Error(`SAFETY VIOLATION: Backend environment is '${envData.environment}', expected 'e2e'. Refusing to run tests against non-E2E database.`);
    }
    console.log('   ✅ Safety guard passed: Confirmed E2E environment');
    
    // 4. Verify we can access curriculum data (basic schema check)
    const stagesResponse = await requestContext.get('/api/v1/curriculum/stages');
    if (!stagesResponse.ok()) {
      throw new Error('Failed to fetch curriculum stages - migrations may not be applied');
    }
    const stages = await stagesResponse.json();
    if (!Array.isArray(stages) || stages.length === 0) {
      throw new Error('No learning stages found - database may not be properly seeded');
    }
    console.log(`   ✅ Curriculum data verified: ${stages.length} stages found`);
    
    console.log('✅ E2E global setup completed successfully');
    
  } finally {
    await requestContext.dispose();
  }
}

export default globalSetup;
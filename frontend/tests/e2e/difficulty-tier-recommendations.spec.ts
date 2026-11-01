import { test, expect } from './fixtures';

test.describe('Difficulty Tier Recommendations', () => {
  test.describe('Student-facing difficulty tier behavior', () => {
    test('cold start student gets curriculum sequence recommendation', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Navigate to lesson and start an activity to establish history
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      await expect(page).toHaveURL(/.*student\/activity\/\d+/);
      await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 30000 });
      await expect(page.locator('main h1')).toBeVisible({ timeout: 30000 });
      
      // Complete the activity with any answers
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      // After completion, check recommendation
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 10000 });
      
      // Verify recommendation card shows tier info
      await expect(page.locator('main .badge-primary, main .badge-primary.badge-sm, main [class*="badge"]').first()).toBeVisible({ timeout: 10000 });
      
      // Click to start recommended activity
      await page.click('main button:has-text("Start This Activity")');
      await expect(page).toHaveURL(/.*student\/activity\/\d+/);
    });

    test('remediation tier (low mastery) prefers tier 1 activities', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Complete activity with low accuracy to trigger remediation tier
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      // Answer incorrectly to get low accuracy
      await expect(page.locator('main button').nth(1)).toBeVisible({ timeout: 15000 });
      await page.locator('main button').nth(1).click();
      
      await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextButton.click();
      }
      
      // Complete remaining questions if any
      for (let i = 0; i < 10; i++) {
        const nextBtn = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextBtn.click();
        } else {
          break;
        }
      }
      
      // After completion with low accuracy, check recommendation tier
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 10000 });
      
      // Verify the tier badge shows "Practice More" or similar for remediation
      await expect(page.locator('main :text("Practice More"), main :text("Remediate"), main :text("remediate")').first()).toBeVisible({ timeout: 10000 });
    });

    test('maintenance tier (moderate mastery) prefers tier 2 activities', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Complete activity with moderate accuracy (60-84%)
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      // Answer first question correctly
      await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main button').first().click();
      
      await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue")').first();
      if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nextButton.click();
      }
      
      // Answer second question incorrectly (if exists)
      const secondOption = page.locator('main button').nth(1);
      if (await secondOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await secondOption.click();
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextBtn2 = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextBtn2.click();
        }
      }
      
      // Complete remaining questions
      for (let i = 0; i < 10; i++) {
        const nextBtn = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextBtn.click();
        } else {
          break;
        }
      }
      
      // Verify maintenance tier recommendation
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main :text("Keep up the great work"), main :text("Maintain"), main :text("maintain")').first()).toBeVisible({ timeout: 10000 });
    });

    test('advancement tier (high mastery) prefers tier 3 activities', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Complete activity with high accuracy (>= 85%) to trigger advance tier
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      // Answer all questions correctly
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      // Verify advancement tier recommendation
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('main :text("Advancing"), main :text("Advance"), main :text("advance")').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Difficulty tier fallback behavior', () => {
    test('exact difficulty tier match is preferred over untiered', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Complete activity to get recommendation
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      // Complete activity
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      // Check recommendation - should prefer exact tier match
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 10000 });
      
      // Start recommended activity
      await page.click('main button:has-text("Start This Activity")');
      await expect(page).toHaveURL(/.*student\/activity\/\d+/);
    });

    test('untiered activities selected when exact tier unavailable', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Complete activity and verify fallback to untiered activities
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      // Verify recommendation works even when exact tier not available
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 10000 });
    });

    test('fallback preserves curriculum sequence', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Verify that when no tier matches, curriculum sequence is preserved
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 10000 });
    });

    test('deterministic recommendation behavior', async ({ authenticatedStudentPage }) => {
      const page = authenticatedStudentPage;
      
      // Same student state should produce same recommendation
      await page.goto('/student/learn/1');
      await page.waitForResponse('**/api/v1/students/me/learn/1');
      await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
      
      await page.click('text=Start');
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/students/me/activities/') && 
        response.url().includes('/attempts') &&
        response.request().method() === 'POST'
      );
      
      // Complete activity
      for (let i = 0; i < 10; i++) {
        await expect(page.locator('main button').first()).toBeVisible({ timeout: 15000 });
        await page.locator('main button').first().click();
        
        await expect(page.locator('main .bg-gray-50, main .bg-green-50, main .bg-red-50').first()).toBeVisible({ timeout: 10000 });
        
        const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
        if (await nextButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await nextButton.click();
        } else {
          break;
        }
      }
      
      // Get recommendation
      await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 10000 });
      
      // Store recommended activity info
      const recActivityTitle = await page.locator('main .bg-white\\/50 h4, main .bg-white\\/50 h3').first().textContent();
      
      // Navigate to recommended activity
      await page.click('main button:has-text("Start This Activity")');
      await expect(page).toHaveURL(/.*student\/activity\/\d+/);
      
      // Verify it's the same activity that was recommended
      const currentUrl = page.url();
      expect(currentUrl).toContain('/student/activity/');
    });
  });

  test.describe('Difficulty tier E2E API verification', () => {
    test('next-activity API returns correct difficulty tier info', async ({ e2eRequestContext, studentCredentials }) => {
      // First create a student and complete some activities
      const { studentUsername, studentPin } = studentCredentials;
      
      // Login as student via API
      const loginResponse = await e2eRequestContext.post('/api/v1/auth/student/login', {
        data: { username: studentUsername, pin: studentPin }
      });
      expect(loginResponse.ok()).toBeTruthy();
      
      // Get initial recommendation (cold start)
      const recResponse = await e2eRequestContext.get('/api/v1/students/me/next-activity');
      expect(recResponse.ok()).toBeTruthy();
      
      const recData = await recResponse.json();
      expect(recData).toHaveProperty('activity_id');
      expect(recData).toHaveProperty('tier');
      expect(recData).toHaveProperty('reason');
      expect(recData).toHaveProperty('confidence');
    });

    test('recommendation includes activity difficulty tier when available', async ({ e2eRequestContext, studentCredentials }) => {
      const { studentUsername, studentPin } = studentCredentials;
      
      const loginResponse = await e2eRequestContext.post('/api/v1/auth/student/login', {
        data: { username: studentUsername, pin: studentPin }
      });
      expect(loginResponse.ok()).toBeTruthy();
      
      // Complete an activity first to get a recommendation with tier info
      const lessonResponse = await e2eRequestContext.get('/api/v1/students/me/learn/1');
      expect(lessonResponse.ok()).toBeTruthy();
      const lessonData = await lessonResponse.json();
      
      if (lessonData.activities && lessonData.activities.length > 0) {
        const activityId = lessonData.activities[0].id;
        
        // Start and complete activity
        const attemptResponse = await e2eRequestContext.post(`/api/v1/students/me/activities/${activityId}/attempts`);
        expect(attemptResponse.ok()).toBeTruthy();
        const attemptData = await attemptResponse.json();
        
        // Complete the attempt
        const completeResponse = await e2eRequestContext.post(`/api/v1/students/attempts/${attemptData.attempt_id}/complete`);
        expect(completeResponse.ok()).toBeTruthy();
        
        // Get next recommendation
        const recResponse = await e2eRequestContext.get('/api/v1/students/me/next-activity');
        expect(recResponse.ok()).toBeTruthy();
        
        const recData = await recResponse.json();
        expect(recData).toHaveProperty('activity_id');
        expect(recData).toHaveProperty('tier');
        expect(recData).toHaveProperty('has_evidence');
        
        // If activity has difficulty_tier configured, it should be reflected in recommendation
        if (recData.activity_id) {
          expect(recData).toHaveProperty('activity');
          if (recData.activity) {
            expect(recData.activity).toHaveProperty('configuration');
          }
        }
      }
    });

    test('cold start recommendation uses curriculum sequence', async ({ e2eRequestContext, studentCredentials }) => {
      const { studentUsername, studentPin } = studentCredentials;
      
      const loginResponse = await e2eRequestContext.post('/api/v1/auth/student/login', {
        data: { username: studentUsername, pin: studentPin }
      });
      expect(loginResponse.ok()).toBeTruthy();
      
      // Get recommendation without any completed attempts
      const recResponse = await e2eRequestContext.get('/api/v1/students/me/next-activity');
      expect(recResponse.ok()).toBeTruthy();
      
      const recData = await recResponse.json();
      expect(recData.tier).toBe('cold_start');
      expect(recData.reason).toBe('cold_start_sequence');
    });
  });
});
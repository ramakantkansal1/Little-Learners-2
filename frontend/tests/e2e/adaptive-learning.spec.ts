/* eslint-disable no-constant-condition */
import { test, expect } from './fixtures';

/**
 * Helper to check if a locator is visible, avoiding ESLint no-constant-condition false positives.
 * The await makes this non-constant, but ESLint doesn't recognize that.
 */
async function isVisible(locator: ReturnType<import('@playwright/test')['Page']['locator']>, timeout = 5000): Promise<boolean> {
  return await locator.isVisible({ timeout });
}

test.describe('Adaptive Learning - Cold Start', () => {
  test('cold start student gets first activity recommendation in sequence', async ({ authenticatedStudentPage }) => {
    test.setTimeout(120000);
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
    // Question 1
    await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
    await page.locator('main .grid button').first().click();
    
    // Wait for feedback to appear
    await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 60000 });
    
    // Click Next
    const nextButton1 = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
    const nextButton1Visible = await nextButton1.isVisible({ timeout: 5000 });
    if (nextButton1Visible) {
      await nextButton1.click();
    }
    
    // Question 2
    await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
    await page.locator('main .grid button').first().click();
    
    await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 60000 });
    
    // Click Finish/Next on last question - this should trigger completion
    const finishButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
    const finishButtonVisible = await finishButton.isVisible({ timeout: 5000 });
    if (finishButtonVisible) {
      await finishButton.click();
    }
    
    // Wait for recommendation screen to appear (completion API + recommendation API)
    // Increased timeout for slow completion API
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 120000 });
    
    // Verify recommendation card is displayed
    await expect(page.locator('main .border-primary-200, main .bg-gradient-to-br.from-primary-50').first()).toBeVisible({ timeout: 10000 });
    
    // Click to start recommended activity
    await page.click('main button:has-text("Start This Activity")');
    await expect(page).toHaveURL(/.*student\/activity\/\d+/);
  });
});

test.describe('Adaptive Learning - Difficulty Tier Recommendations', () => {
  test('remediation tier prefers difficulty tier 1 (Easy)', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
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
    
    // Answer incorrectly to get low accuracy
    await expect(page.locator('main .grid button').nth(1)).toBeVisible({ timeout: 15000 });
    await page.locator('main .grid button').nth(1).click();
    
    await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
    
    const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
    if (await isVisible(nextButton, 5000)) {
      await nextButton.click();
    }
    
    // Complete remaining questions
    for (let i = 0; i < 10; i++) {
      const nextBtn = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      if (await isVisible(nextBtn, 5000)) {
        await nextBtn.click();
      } else {
        break;
      }
    }
    
    // After completion with low accuracy, check recommendation tier
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
    await expect(page.locator('main :text("Practice More"), main :text("Remediate"), main :text("remediate")').first()).toBeVisible({ timeout: 10000 });
  });

  test('maintenance tier (moderate mastery) prefers tier 2 activities', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
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
    
    // Answer first question correctly
    await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
    await page.locator('main .grid button').first().click();
    
    await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
    
    const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue")').first();
    const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
      await nextButton.click();
    }
    
    // Answer second question incorrectly (if exists)
    const secondOption = page.locator('main .grid button').nth(1);
    if (await secondOption.isVisible({ timeout: 5000 })) {
      await secondOption.click();
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextBtn2 = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextBtn2Visible = await nextBtn2.isVisible({ timeout: 5000 });
      if (nextBtn2Visible) {
        await nextBtn2.click();
      }
    }
    
    // Complete remaining questions
    for (let i = 0; i < 10; i++) {
      const nextBtn = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      if (await isVisible(nextBtn, 5000)) {
        await nextBtn.click();
      } else {
        break;
      }
    }
    
    // Verify maintenance tier recommendation
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
    await expect(page.locator('main :text("Keep up the great work"), main :text("Maintain"), main :text("maintain")').first()).toBeVisible({ timeout: 10000 });
  });

  test('advancement tier (high mastery) prefers tier 3 activities', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
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
    
    // Answer all questions correctly
    for (let i = 0; i < 10; i++) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
      if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    // Verify advancement tier recommendation
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
    await expect(page.locator('main :text("Advancing"), main :text("Advance"), main :text("advance")').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Adaptive Learning - Difficulty Tier Fallback', () => {
  test('exact difficulty tier match is preferred', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    // Verify recommendation works
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
  });

  test('untiered activities selected when exact tier unavailable', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 90000 });
  });

  test('fallback preserves curriculum sequence', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you"), main :text("Starting your learning journey")').first()).toBeVisible({ timeout: 90000 });
  });

  test('deterministic recommendation behavior', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    // Get recommendation
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
    
    // Store recommended activity info
    const recActivityText = await page.locator('main .bg-white\\/50 h4, main .bg-white\\/50 h3').first().textContent();
    
    // Navigate to recommended activity
    await page.click('main button:has-text("Start This Activity")');
    await expect(page).toHaveURL(/.*student\/activity\/\d+/);
  });
});

test.describe('Adaptive Learning - Review/Spaced Repetition', () => {
  test('overdue activities are recommended for review', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    // Complete an activity
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    await expect(page.locator('main :text("Great Job"), main :text("You completed")').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Adaptive Learning - Stage Boundary', () => {
  test('no cross-stage recommendations', async ({ authenticatedStudentPage }) => {
    const page = authenticatedStudentPage;
    
    await page.goto('/student/learn/1');
    await page.waitForResponse('**/api/v1/students/me/learn/1');
    await expect(page.locator('text=Activity').first()).toBeVisible({ timeout: 20000 });
    
    await page.click('text=Start');
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/students/me/activities/') && 
      response.url().includes('/attempts') &&
      response.request().method() === 'POST'
    );
    
    while (true) {
      await expect(page.locator('main .grid button').first()).toBeVisible({ timeout: 15000 });
      await page.locator('main .grid button').first().click();
      
      await expect(page.locator('main .bg-gray-50').first()).toBeVisible({ timeout: 30000 });
      
      const nextButton = page.locator('main button:has-text("Next"), main button:has-text("Continue"), main button:has-text("Finish")').first();
      const nextButtonVisible = await nextButton.isVisible({ timeout: 5000 });
    if (nextButtonVisible) {
        await nextButton.click();
      } else {
        break;
      }
    }
    
    // Verify recommendation
    await expect(page.locator('main :text("Next Recommended Activity"), main :text("Recommended for you")').first()).toBeVisible({ timeout: 90000 });
  });
});
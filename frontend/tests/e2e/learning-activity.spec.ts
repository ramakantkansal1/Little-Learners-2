import { test, expect } from '@playwright/test';

test.describe('Learning Activity', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/student/login');
    await page.fill('input[name="username"]', 'aarav_1');
    await page.fill('input[name="pin"]', '1234');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*student\/dashboard/);
    await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  });

  test('should open Alphabet A-E lesson (Lesson 22) and show activities', async ({ page }) => {
    // Navigate to lesson
    await page.goto('/student/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
  });

  test('should start activity and submit answer', async ({ page }) => {
    // Go to lesson page
    await page.goto('/student/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Should navigate to activity page
    await expect(page).toHaveURL(/.*student\/activity\/64/);
    
    // Wait for activity content to load (not loading spinner)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    // Use h1 for activity title on activity page
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 20000 });
    
    // Wait for options to load
    await expect(page.locator('text=Option 1').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=Option 1').first().click({ force: true });
    
    // Should show feedback
    await expect(page.locator('text=Correct')).toBeVisible({ timeout: 10000 });
    
    // Click Next to proceed
    await page.click('button:has-text("Next")');
  });

  test('should resume existing attempt on reload', async ({ page }) => {
    // Go to lesson page
    await page.goto('/student/learn/22');
    await expect(page.locator('text=Activity 1')).toBeVisible({ timeout: 20000 });
    
    // Click Start button for the first activity
    await page.click('text=Start');
    
    // Should navigate to activity page
    await expect(page).toHaveURL(/.*student\/activity\/64/);
    
    // Wait for activity content to load
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 20000 });
    
    // Select an option
    await expect(page.locator('text=Option 1').first()).toBeVisible({ timeout: 15000 });
    await page.locator('text=Option 1').first().click({ force: true });
    
    // Reload page
    await page.reload();
    
    // Should still show the activity (attempt should resume)
    await expect(page.locator('text=Loading activity...')).not.toBeVisible({ timeout: 20000 });
    await expect(page.locator('h1:has-text("Activity 1")')).toBeVisible({ timeout: 20000 });
  });
});
import { test, expect } from '@playwright/test';

test.describe('Debug Route', () => {
  test('should check URL', async ({ page }) => {
    await page.goto('/auth/student/login');
    await page.waitForLoadState('networkidle');
    console.log('Current URL:', page.url());
    console.log('Title:', await page.title());
    
    // Check for student login elements
    const usernameLabel = page.locator('label:has-text("Username")');
    const emailLabel = page.locator('label:has-text("Email")');
    console.log('Username label visible:', await usernameLabel.isVisible());
    console.log('Email label visible:', await emailLabel.isVisible());
    
    // Check for student login specific text
    const studentLoginText = page.locator('text=Little Learner Login');
    const parentLoginText = page.locator('text=Sign in to continue learning');
    console.log('Student login text visible:', await studentLoginText.isVisible());
    console.log('Parent login text visible:', await parentLoginText.isVisible());
  });
});
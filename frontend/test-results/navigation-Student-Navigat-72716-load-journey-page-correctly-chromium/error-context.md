# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Student Navigation >> should reload journey page correctly
- Location: tests/e2e/navigation.spec.ts:56:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1:has-text("Learning Journey")')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1:has-text("Learning Journey")') with timeout 30000ms
  - waiting for locator('h1:has-text("Learning Journey")')
  - Test timeout of 30000ms exceeded.

```

```yaml
- complementary "Learning navigation":
  - img
  - text: Happy Learners
  - navigation "Learning navigation":
    - button "Learning Home"
    - button "My Lessons"
    - button "My Rewards"
    - button "My Journey"
  - text: 🐘
  - paragraph: Aarav
  - paragraph: Nursery
  - button "Settings":
    - img
    - text: Settings
  - button "Sign Out":
    - img
    - text: Sign Out
- button "Open settings":
  - img
- complementary "Learning navigation":
  - img
  - text: Happy Learners
  - navigation "Learning navigation":
    - button "Learning Home"
    - button "My Lessons"
    - button "My Rewards"
    - button "My Journey"
  - text: 🐘
  - paragraph: Aarav
  - paragraph: Nursery
  - button "Settings":
    - img
    - text: Settings
  - button "Sign Out":
    - img
    - text: Sign Out
- banner:
  - heading "My Journey" [level=1]
  - text: 🐘
- main:
  - img
  - paragraph: Loading your learning journey...
- button "Open Tanstack query devtools":
  - img
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Student Navigation', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first
  6  |     await page.goto('/auth/student/login');
  7  |     await page.fill('input[name="username"]', 'aarav_1');
  8  |     await page.fill('input[name="pin"]', '1234');
  9  |     await page.click('button[type="submit"]');
  10 |     await expect(page).toHaveURL(/.*student\/dashboard/);
  11 |     await expect(page.locator('text=Aarav').first()).toBeVisible({ timeout: 10000 });
  12 |     
  13 |     // Wait for sidebar to be visible
  14 |     await expect(page.locator('text=Learning Home').first()).toBeVisible({ timeout: 10000 });
  15 |   });
  16 | 
  17 |   test('should navigate to My Journey', async ({ page }) => {
  18 |     // Wait for My Journey to be visible and clickable
  19 |     await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
  20 |     await page.locator('text=My Journey').first().click({ force: true });
  21 |     await expect(page).toHaveURL(/.*student\/history/);
  22 |     // Page title should be "Learning Journey"
  23 |     await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
  24 |   });
  25 | 
  26 |   test('should navigate to My Rewards', async ({ page }) => {
  27 |     await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
  28 |     await page.locator('text=My Rewards').first().click({ force: true });
  29 |     await expect(page).toHaveURL(/.*student\/rewards/);
  30 |     // Page title should be "My Rewards"
  31 |     await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
  32 |   });
  33 | 
  34 |   test('should navigate to History', async ({ page }) => {
  35 |     await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
  36 |     await page.locator('text=My Journey').first().click({ force: true });
  37 |     // Page title should be "My Journey"
  38 |     await expect(page.locator('h1:has-text("My Journey")')).toBeVisible({ timeout: 10000 });
  39 |   });
  40 | 
  41 |   test('should use browser back and forward', async ({ page }) => {
  42 |     // Navigate to journey
  43 |     await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
  44 |     await page.locator('text=My Journey').first().click({ force: true });
  45 |     await expect(page).toHaveURL(/.*student\/history/);
  46 |     
  47 |     // Go back
  48 |     await page.goBack();
  49 |     await expect(page).toHaveURL(/.*student\/dashboard/);
  50 |     
  51 |     // Go forward
  52 |     await page.goForward();
  53 |     await expect(page).toHaveURL(/.*student\/history/);
  54 |   });
  55 | 
  56 |   test('should reload journey page correctly', async ({ page }) => {
  57 |     await expect(page.locator('text=My Journey').first()).toBeVisible({ timeout: 10000 });
  58 |     await page.locator('text=My Journey').first().click({ force: true });
  59 |     await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 10000 });
  60 |     
  61 |     await page.reload();
  62 |     // Increase timeout for reload as auth re-validation and data fetching may take time
> 63 |     await expect(page.locator('h1:has-text("Learning Journey")')).toBeVisible({ timeout: 30000 });
     |                                                                   ^ Error: expect(locator).toBeVisible() failed
  64 |   });
  65 | 
  66 |   test('should reload rewards page correctly', async ({ page }) => {
  67 |     await expect(page.locator('text=My Rewards').first()).toBeVisible({ timeout: 10000 });
  68 |     await page.locator('text=My Rewards').first().click({ force: true });
  69 |     await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 10000 });
  70 |     
  71 |     await page.reload();
  72 |     // Increase timeout for reload as auth re-validation and data fetching may take time
  73 |     await expect(page.locator('h1:has-text("My Rewards")')).toBeVisible({ timeout: 30000 });
  74 |   });
  75 | });
```
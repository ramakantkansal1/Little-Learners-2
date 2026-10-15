# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.ts >> Student Navigation >> should reload rewards page correctly
- Location: tests/e2e/navigation.spec.ts:66:3

# Error details

```
Error: Channel closed
```

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1:has-text("My Rewards")')
Expected: visible
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('h1:has-text("My Rewards")') with timeout 30000ms
  - waiting for locator('h1:has-text("My Rewards")')
  - Target page, context or browser has been closed

```

```yaml
- img
- paragraph: Loading your learning space...
- button "Open Tanstack query devtools":
  - img
```

```
Error: browserContext.close: Target page, context or browser has been closed
```
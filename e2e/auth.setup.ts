import { test as setup, expect } from '@playwright/test';

/**
 * Auth setup — seed a test user session.
 * In CI, this expects a running app with a test database.
 * For local dev, the dev server auto-starts via playwright.config.ts.
 */
setup('seed test session', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // If login page exists, log in with test credentials
  const loginForm = page.locator('form');
  if (await loginForm.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.fill('input[name="email"]', 'test@moots.com');
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  }

  // Store auth state
  await page.context().storageState({ path: 'e2e/.auth-state.json' });
});

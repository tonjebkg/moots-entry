import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('health check endpoint returns ok', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBeDefined();
    expect(body.timestamp).toBeDefined();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page).toHaveTitle(/Moots|Login|Sign/i);
  });

  test('unauthenticated API returns 401', async ({ request }) => {
    const response = await request.get('/api/events');
    // Should be 401 or redirect, not 200
    expect([401, 302, 307]).toContain(response.status());
  });

  test('public RSVP page returns 404 for non-existent event', async ({ request }) => {
    const response = await request.get('/api/rsvp/nonexistent');
    expect([404, 400]).toContain(response.status());
  });
});

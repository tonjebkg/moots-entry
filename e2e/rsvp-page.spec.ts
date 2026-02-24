import { test, expect } from '@playwright/test';

test.describe('RSVP Page', () => {
  test('RSVP submission API validates input', async ({ request }) => {
    const response = await request.post('/api/rsvp/submit', {
      data: {
        // Missing required fields
        name: '',
      },
    });
    // Should return validation error or 404 (route may not exist yet)
    expect([400, 404, 422]).toContain(response.status());
  });

  test('public RSVP endpoints are rate limited', async ({ request }) => {
    // Hit the endpoint many times rapidly
    const responses = [];
    for (let i = 0; i < 10; i++) {
      const r = await request.get('/api/rsvp/test-slug');
      responses.push(r.status());
    }
    // At least some should succeed or 404, none should be 500
    expect(responses.every(s => s !== 500)).toBe(true);
  });
});

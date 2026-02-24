import { test, expect } from '@playwright/test';

test.describe('Check-in API', () => {
  test('GET check-in metrics requires authentication', async ({ request }) => {
    const response = await request.get('/api/events/1/checkin');
    expect([401, 302, 307]).toContain(response.status());
  });

  test('POST walk-in requires authentication', async ({ request }) => {
    const response = await request.post('/api/events/1/checkin', {
      data: {
        full_name: 'Walk In Test',
        email: 'walkin@test.com',
        source: 'WALK_IN',
      },
    });
    expect([401, 302, 307]).toContain(response.status());
  });
});

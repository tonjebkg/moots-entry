import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

import { withErrorHandling, asyncHandler } from '../with-error-handling';
import * as Sentry from '@sentry/nextjs';

describe('withErrorHandling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('passes through successful responses', async () => {
    const handler = withErrorHandling(async () => {
      return NextResponse.json({ ok: true });
    });

    const req = new NextRequest('https://app.moots.com/api/test');
    const response = await handler(req, {});
    const body = await response.json();

    expect(body.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  it('catches errors and returns error response', async () => {
    const handler = withErrorHandling(async () => {
      throw new Error('Something went wrong');
    });

    const req = new NextRequest('https://app.moots.com/api/test');
    const response = await handler(req, {});

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('reports errors to Sentry', async () => {
    const error = new Error('Sentry test');
    const handler = withErrorHandling(async () => {
      throw error;
    });

    const req = new NextRequest('https://app.moots.com/api/test');
    await handler(req, {});

    expect(Sentry.captureException).toHaveBeenCalledWith(
      error,
      expect.objectContaining({
        tags: { method: 'GET' },
      })
    );
  });
});

describe('asyncHandler', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns successful result', async () => {
    const result = await asyncHandler(async () => 42);
    expect(result).toBe(42);
  });

  it('logs and rethrows errors', async () => {
    const error = new Error('async failure');
    await expect(
      asyncHandler(async () => { throw error; }, { op: 'test' })
    ).rejects.toThrow('async failure');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkPublicRateLimit,
  checkAuthRateLimit,
  checkJoinRequestRateLimit,
  checkUploadRateLimit,
  checkRsvpSubmissionRateLimit,
  checkBroadcastSendRateLimit,
  clearRateLimits,
  getClientIdentifier,
  RATE_LIMITS,
} from '../rate-limit';

describe('rate-limit (in-memory fallback)', () => {
  beforeEach(() => {
    // Ensure no Upstash env vars so in-memory is used
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    clearRateLimits();
  });

  it('allows requests within the limit', () => {
    const result = checkPublicRateLimit('test-ip');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.public.maxRequests,
    });
    expect((result as any).remaining).toBe(RATE_LIMITS.public.maxRequests - 1);
  });

  it('blocks requests exceeding the limit', () => {
    const ip = 'flood-ip';
    for (let i = 0; i < RATE_LIMITS.public.maxRequests; i++) {
      checkPublicRateLimit(ip);
    }
    const blocked = checkPublicRateLimit(ip);
    expect(blocked).toMatchObject({ success: false, remaining: 0 });
  });

  it('isolates different identifiers', () => {
    for (let i = 0; i < RATE_LIMITS.public.maxRequests; i++) {
      checkPublicRateLimit('ip-a');
    }
    const resultB = checkPublicRateLimit('ip-b');
    expect(resultB).toMatchObject({ success: true });
  });

  it('auth limiter has correct config', () => {
    const result = checkAuthRateLimit('auth-user');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.auth.maxRequests,
    });
  });

  it('join request limiter has correct config', () => {
    const result = checkJoinRequestRateLimit('join-email');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.joinRequest.maxRequests,
    });
  });

  it('upload limiter has correct config', () => {
    const result = checkUploadRateLimit('upload-user');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.upload.maxRequests,
    });
  });

  it('rsvp submission limiter has correct config', () => {
    const result = checkRsvpSubmissionRateLimit('rsvp-ip');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.rsvpSubmission.maxRequests,
    });
  });

  it('broadcast send limiter has correct config', () => {
    const result = checkBroadcastSendRateLimit('broadcast-user');
    expect(result).toMatchObject({
      success: true,
      limit: RATE_LIMITS.broadcastSend.maxRequests,
    });
  });
});

describe('getClientIdentifier', () => {
  it('extracts x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIdentifier(req)).toBe('1.2.3.4');
  });

  it('extracts x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '9.8.7.6' },
    });
    expect(getClientIdentifier(req)).toBe('9.8.7.6');
  });

  it('falls back to anonymous', () => {
    const req = new Request('http://localhost');
    expect(getClientIdentifier(req)).toBe('anonymous');
  });
});

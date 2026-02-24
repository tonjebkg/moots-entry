/**
 * Rate limiting with Upstash Redis (production) or in-memory fallback (dev).
 *
 * When UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 * uses @upstash/ratelimit with a sliding window. Otherwise falls
 * back to an in-memory LRU limiter (resets on cold start).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── Result type ──────────────────────────────────────────────────────────

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

// ─── Rate limit configs ───────────────────────────────────────────────────

export const RATE_LIMITS = {
  public: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  joinRequest: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  upload: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
  },
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  rsvpSubmission: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  broadcastSend: {
    maxRequests: 3,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;

// ─── In-memory fallback ───────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  check(identifier: string, maxRequests: number, windowMs: number): RateLimitResult {
    const now = Date.now();

    if (this.cache.size > this.maxEntries) {
      this.cleanup(now);
    }

    const entry = this.cache.get(identifier);

    if (!entry || entry.resetAt < now) {
      const resetAt = now + windowMs;
      this.cache.set(identifier, { count: 1, resetAt });
      return { success: true, limit: maxRequests, remaining: maxRequests - 1, reset: resetAt };
    }

    if (entry.count >= maxRequests) {
      return { success: false, limit: maxRequests, remaining: 0, reset: entry.resetAt };
    }

    entry.count++;
    this.cache.set(identifier, entry);
    return { success: true, limit: maxRequests, remaining: maxRequests - entry.count, reset: entry.resetAt };
  }

  private cleanup(now: number) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.resetAt < now) this.cache.delete(key);
    }
  }

  clear() {
    this.cache.clear();
  }
}

// ─── Upstash-backed limiter ──────────────────────────────────────────────

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function createUpstashLimiter(
  prefix: string,
  maxRequests: number,
  windowSec: number
): Ratelimit {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
    prefix: `moots:rl:${prefix}`,
    analytics: true,
  });
}

// ─── Singleton limiters ──────────────────────────────────────────────────

let _upstashLimiters: Record<string, Ratelimit> | null = null;

function getUpstashLimiters(): Record<string, Ratelimit> {
  if (!_upstashLimiters) {
    _upstashLimiters = {
      public: createUpstashLimiter('public', RATE_LIMITS.public.maxRequests, 60),
      joinRequest: createUpstashLimiter('join', RATE_LIMITS.joinRequest.maxRequests, 300),
      upload: createUpstashLimiter('upload', RATE_LIMITS.upload.maxRequests, 60),
      auth: createUpstashLimiter('auth', RATE_LIMITS.auth.maxRequests, 900),
      rsvpSubmission: createUpstashLimiter('rsvp', RATE_LIMITS.rsvpSubmission.maxRequests, 900),
      broadcastSend: createUpstashLimiter('broadcast', RATE_LIMITS.broadcastSend.maxRequests, 60),
    };
  }
  return _upstashLimiters;
}

const inMemoryLimiters = {
  public: new InMemoryRateLimiter(),
  joinRequest: new InMemoryRateLimiter(),
  upload: new InMemoryRateLimiter(),
  auth: new InMemoryRateLimiter(),
  rsvpSubmission: new InMemoryRateLimiter(),
  broadcastSend: new InMemoryRateLimiter(),
};

// ─── Generic check function ──────────────────────────────────────────────

async function checkLimit(
  name: keyof typeof RATE_LIMITS,
  identifier: string
): Promise<RateLimitResult> {
  const cfg = RATE_LIMITS[name];

  if (isUpstashConfigured()) {
    try {
      const limiter = getUpstashLimiters()[name];
      const result = await limiter.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch {
      // Fall through to in-memory on Upstash error
    }
  }

  return inMemoryLimiters[name].check(identifier, cfg.maxRequests, cfg.windowMs);
}

// ─── Exported check functions (sync-compatible wrappers) ─────────────────

export function checkPublicRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('public', identifier);
  return inMemoryLimiters.public.check(identifier, RATE_LIMITS.public.maxRequests, RATE_LIMITS.public.windowMs);
}

export function checkJoinRequestRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('joinRequest', identifier);
  return inMemoryLimiters.joinRequest.check(identifier, RATE_LIMITS.joinRequest.maxRequests, RATE_LIMITS.joinRequest.windowMs);
}

export function checkUploadRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('upload', identifier);
  return inMemoryLimiters.upload.check(identifier, RATE_LIMITS.upload.maxRequests, RATE_LIMITS.upload.windowMs);
}

export function checkAuthRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('auth', identifier);
  return inMemoryLimiters.auth.check(identifier, RATE_LIMITS.auth.maxRequests, RATE_LIMITS.auth.windowMs);
}

export function checkRsvpSubmissionRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('rsvpSubmission', identifier);
  return inMemoryLimiters.rsvpSubmission.check(identifier, RATE_LIMITS.rsvpSubmission.maxRequests, RATE_LIMITS.rsvpSubmission.windowMs);
}

export function checkBroadcastSendRateLimit(identifier: string): RateLimitResult | Promise<RateLimitResult> {
  if (isUpstashConfigured()) return checkLimit('broadcastSend', identifier);
  return inMemoryLimiters.broadcastSend.check(identifier, RATE_LIMITS.broadcastSend.maxRequests, RATE_LIMITS.broadcastSend.windowMs);
}

// ─── Utilities ────────────────────────────────────────────────────────────

export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'anonymous';
}

export function clearRateLimits() {
  Object.values(inMemoryLimiters).forEach(l => l.clear());
}

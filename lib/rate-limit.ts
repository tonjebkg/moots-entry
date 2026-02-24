/**
 * In-memory rate limiter using LRU cache
 *
 * This is a simple, dependency-free rate limiter for serverless environments.
 * For production with multiple instances, consider using Redis or Upstash.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private cache = new Map<string, RateLimitEntry>();
  private maxEntries: number;

  constructor(maxEntries = 1000) {
    this.maxEntries = maxEntries;
  }

  /**
   * Check if request is within rate limit
   *
   * @param identifier Unique identifier for the client (IP, email, etc.)
   * @param maxRequests Maximum requests allowed in the window
   * @param windowMs Time window in milliseconds
   * @returns Object with success status and limit info
   */
  check(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    const key = identifier;

    // Clean up expired entries periodically
    if (this.cache.size > this.maxEntries) {
      this.cleanup(now);
    }

    const entry = this.cache.get(key);

    // No entry or expired - create new entry
    if (!entry || entry.resetAt < now) {
      const resetAt = now + windowMs;
      this.cache.set(key, { count: 1, resetAt });
      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: resetAt,
      };
    }

    // Entry exists and not expired - check limit
    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    this.cache.set(key, entry);

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      reset: entry.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(now: number) {
    for (const [key, entry] of this.cache.entries()) {
      if (entry.resetAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear() {
    this.cache.clear();
  }
}

// Singleton instances for different use cases
const rateLimiters = {
  // General public API rate limiter - 30 requests per minute
  public: new RateLimiter(),

  // Join request rate limiter - 3 requests per 5 minutes per email
  joinRequest: new RateLimiter(),

  // Upload rate limiter - 5 uploads per minute
  upload: new RateLimiter(),

  // Auth rate limiter - 5 attempts per 15 minutes per IP
  auth: new RateLimiter(),
};

/**
 * Rate limit configurations
 */
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
} as const;

/**
 * Check rate limit for public API requests
 */
export function checkPublicRateLimit(identifier: string) {
  return rateLimiters.public.check(
    identifier,
    RATE_LIMITS.public.maxRequests,
    RATE_LIMITS.public.windowMs
  );
}

/**
 * Check rate limit for join request submissions
 */
export function checkJoinRequestRateLimit(identifier: string) {
  return rateLimiters.joinRequest.check(
    identifier,
    RATE_LIMITS.joinRequest.maxRequests,
    RATE_LIMITS.joinRequest.windowMs
  );
}

/**
 * Check rate limit for file uploads
 */
export function checkUploadRateLimit(identifier: string) {
  return rateLimiters.upload.check(
    identifier,
    RATE_LIMITS.upload.maxRequests,
    RATE_LIMITS.upload.windowMs
  );
}

/**
 * Check rate limit for auth attempts (login, magic link, password reset)
 */
export function checkAuthRateLimit(identifier: string) {
  return rateLimiters.auth.check(
    identifier,
    RATE_LIMITS.auth.maxRequests,
    RATE_LIMITS.auth.windowMs
  );
}

/**
 * Get client identifier from request (IP address)
 */
export function getClientIdentifier(request: Request): string {
  // Try to get real IP from headers (Vercel, Cloudflare, etc.)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return "anonymous";
}

/**
 * Clear all rate limit caches (useful for testing)
 */
export function clearRateLimits() {
  rateLimiters.public.clear();
  rateLimiters.joinRequest.clear();
  rateLimiters.upload.clear();
  rateLimiters.auth.clear();
}

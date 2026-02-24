import { NextResponse } from "next/server";

/**
 * Security headers configuration for different environments
 */
const CSP_DIRECTIVES = {
  development: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow inline scripts in dev
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.neon.tech",
      "https://*.supabase.co",
      "ws://localhost:*", // Next.js dev server
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  },
  production: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'"], // Next.js requires unsafe-inline
    "style-src": ["'self'", "'unsafe-inline'"], // Tailwind requires unsafe-inline
    "img-src": ["'self'", "data:", "https:", "blob:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.neon.tech",
      "https://*.supabase.co",
    ],
    "frame-ancestors": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  },
};

/**
 * Build CSP header string from directives
 */
function buildCSP(env: "development" | "production"): string {
  const directives = CSP_DIRECTIVES[env];
  return Object.entries(directives)
    .map(([key, values]) =>
      values.length > 0 ? `${key} ${values.join(" ")}` : key
    )
    .join("; ");
}

/**
 * Add comprehensive security headers to response
 *
 * Headers include:
 * - Content-Security-Policy: Prevents XSS and injection attacks
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - X-XSS-Protection: Legacy XSS protection
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Restricts browser features
 * - Strict-Transport-Security: Enforces HTTPS (production only)
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const env =
    process.env.NODE_ENV === "production" ? "production" : "development";

  // Content Security Policy
  const csp = buildCSP(env);
  response.headers.set("Content-Security-Policy", csp);

  // Prevent clickjacking - deny all framing
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME-sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy, but still good to have)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy - don't leak full URL to other origins
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy - disable unnecessary browser features
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // HSTS - only in production with HTTPS
  if (env === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

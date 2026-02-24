import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { addSecurityHeaders } from '@/lib/security-headers';
import { addCorsHeaders, handleCorsPreflightRequest } from '@/lib/cors';

// Note: Middleware runs in Edge Runtime, so we access env vars directly
const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';

const SESSION_COOKIE_NAME = 'moots_session';

/**
 * Session-based auth middleware for dashboard mode.
 *
 * Protected routes require a session cookie (moots_session).
 * Auth pages (/login, /signup, /reset-password) are public.
 * Public API endpoints for mobile app and guest flows are unchanged.
 */
export function middleware(request: NextRequest) {
  // Skip auth if not in dashboard mode
  if (!isDashboardMode) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const origin = request.headers.get('origin');

  // ─── Public pages (no auth required) ──────────────────────────────
  // Auth pages
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/signup/invite/') ||
    pathname === '/reset-password'
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // RSVP and join landing pages
  if (pathname.startsWith('/rsvp/') || pathname.startsWith('/join/')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Public RSVP pages (/e/[slug])
  if (pathname.startsWith('/e/')) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // ─── Public API endpoints ─────────────────────────────────────────
  const isPublicApiPath =
    /^\/api\/events\/\d+\/join-requests$/.test(pathname) ||
    /^\/api\/events\/\d+\/join-requests\/me$/.test(pathname) ||
    /^\/api\/events\/\d+$/.test(pathname) ||
    /^\/api\/rsvp\//.test(pathname) ||
    /^\/api\/join\//.test(pathname) ||
    /^\/api\/auth\//.test(pathname) || // Auth endpoints are public
    /^\/api\/public\//.test(pathname); // Public API endpoints (RSVP, etc.)

  // Handle CORS preflight for public endpoints
  if (isPublicApiPath && method === 'OPTIONS') {
    const preflightResponse = handleCorsPreflightRequest(request);
    return addSecurityHeaders(preflightResponse);
  }

  // Allow public API endpoints through
  if (isPublicApiPath) {
    // POST to join-requests (mobile app submissions)
    if (method === 'POST' && /^\/api\/events\/\d+\/join-requests$/.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }

    // GET to /me endpoint (mobile app checking own status)
    if (method === 'GET' && /^\/api\/events\/\d+\/join-requests\/me$/.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }

    // GET event details (mobile app viewing events)
    if (method === 'GET' && /^\/api\/events\/\d+$/.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }

    // Public RSVP API endpoints
    if (/^\/api\/rsvp\//.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }

    // Public join API endpoints
    if (/^\/api\/join\//.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }

    // Auth API endpoints (login, signup, etc.)
    if (/^\/api\/auth\//.test(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Public API endpoints (RSVP submissions, etc.)
    if (/^\/api\/public\//.test(pathname)) {
      const response = NextResponse.next();
      addCorsHeaders(response, origin);
      return addSecurityHeaders(response);
    }
  }

  // ─── Protected routes: check session cookie ───────────────────────
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    // API routes → 401 JSON
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Page routes → redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    return addSecurityHeaders(response);
  }

  // Session cookie exists — let the request through.
  // Actual session validation happens in route handlers via requireAuth()
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

/**
 * Matcher configuration — only run middleware on protected + public routes.
 */
export const config = {
  matcher: [
    // Auth pages
    '/login',
    '/signup',
    '/signup/invite/:path*',
    '/reset-password',
    // Protected pages
    '/dashboard/:path*',
    '/checkin/:path*',
    // Public guest pages
    '/rsvp/:path*',
    '/join/:path*',
    '/e/:path*',
    // API routes
    '/api/:path*',
  ],
};

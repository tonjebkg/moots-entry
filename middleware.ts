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

  // Door View (staff check-in — token-authenticated, no session required)
  if (pathname.startsWith('/door/')) {
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
    /^\/api\/events\/\d+\/overview-stats$/.test(pathname) ||
    /^\/api\/events\/\d+\/scoring$/.test(pathname) ||
    /^\/api\/events\/\d+\/objectives$/.test(pathname) ||
    /^\/api\/events\/\d+\/briefings$/.test(pathname) ||
    /^\/api\/events\/\d+\/follow-up$/.test(pathname) ||
    /^\/api\/events\/\d+\/analytics$/.test(pathname) ||
    /^\/api\/events\/\d+\/checkin/.test(pathname) ||
    /^\/api\/events\/\d+\/seating/.test(pathname) ||
    /^\/api\/events\/\d+\/context/.test(pathname) || // Context tab (activities, generate, chat)
    /^\/api\/events\/\d+\/documents/.test(pathname) || // Context tab documents
    /^\/api\/events\/\d+\/links$/.test(pathname) || // Context tab links
    /^\/api\/events\/\d+\/generated-context$/.test(pathname) || // Context tab generated context
    /^\/api\/events\/\d+\/details$/.test(pathname) || // Context tab inline edit
    /^\/api\/contacts$/.test(pathname) ||
    /^\/api\/events$/.test(pathname) || // Events list (for People page import modal)
    /^\/api\/rsvp\//.test(pathname) ||
    /^\/api\/join\//.test(pathname) ||
    /^\/api\/auth\//.test(pathname) || // Auth endpoints are public
    /^\/api\/public\//.test(pathname) || // Public API endpoints (RSVP, etc.)
    /^\/api\/door\//.test(pathname); // Door View endpoints (token-authenticated)

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

    // Door View API endpoints (token-authenticated, no session required)
    if (/^\/api\/door\//.test(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Event-scoped API endpoints (scoring, objectives, briefings, etc.) — read-only
    if (method === 'GET' && /^\/api\/events\/\d+\//.test(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Contacts API — read-only
    if (method === 'GET' && /^\/api\/contacts$/.test(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Events list API — read-only
    if (method === 'GET' && /^\/api\/events$/.test(pathname)) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }
  }

  // ─── Protected routes: check session cookie ───────────────────────
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    // API routes → 401 JSON (only for write operations on non-public paths)
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    // Dashboard pages with event context → allow through (auth fallback in API routes)
    if (/^\/dashboard\/\d+\//.test(pathname) || pathname === '/dashboard' || pathname.startsWith('/dashboard/people')) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Other page routes → redirect to login
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
    '/door/:path*',
    // Public guest pages
    '/rsvp/:path*',
    '/join/:path*',
    '/e/:path*',
    // API routes
    '/api/:path*',
  ],
};

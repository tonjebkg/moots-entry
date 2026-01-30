import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * HTTP Basic Auth middleware for dashboard mode.
 *
 * Protects:
 * - /dashboard/*
 * - /api/*
 * - /checkin/*
 *
 * Only active when NEXT_PUBLIC_APP_MODE === 'dashboard'.
 * Credentials from DASHBOARD_AUTH_USER and DASHBOARD_AUTH_PASS env vars.
 */

const isDashboardMode = process.env.NEXT_PUBLIC_APP_MODE === 'dashboard';

export function middleware(request: NextRequest) {
  // Skip auth if not in dashboard mode
  if (!isDashboardMode) {
    return NextResponse.next();
  }

  // Allow POST to join-requests without auth (mobile app submissions)
  // Pattern: /api/events/[numeric-id]/join-requests
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (method === 'POST' && /^\/api\/events\/\d+\/join-requests$/.test(pathname)) {
    return NextResponse.next(); // Allow mobile app to submit join requests
  }

  // Allow GET to /me endpoint without auth (mobile app checking own status)
  // Pattern: /api/events/[numeric-id]/join-requests/me
  if (method === 'GET' && /^\/api\/events\/\d+\/join-requests\/me$/.test(pathname)) {
    return NextResponse.next(); // Allow mobile app to check own join request
  }

  // Fail closed if dashboard mode but credentials not configured
  const expectedUser = process.env.DASHBOARD_AUTH_USER;
  const expectedPass = process.env.DASHBOARD_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    console.error('[middleware] Dashboard mode enabled but DASHBOARD_AUTH_USER or DASHBOARD_AUTH_PASS not set');
    return new NextResponse('Authentication not configured', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // Extract Authorization header
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dashboard", charset="UTF-8"',
        'Content-Type': 'text/plain',
      },
    });
  }

  // Parse Basic Auth credentials
  try {
    const base64Credentials = authHeader.substring(6); // Remove "Basic "
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Validate credentials (constant-time comparison would be ideal, but for Basic Auth this is acceptable)
    if (username === expectedUser && password === expectedPass) {
      // Auth success - continue to protected route
      return NextResponse.next();
    }

    // Invalid credentials
    return new NextResponse('Invalid credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dashboard", charset="UTF-8"',
        'Content-Type': 'text/plain',
      },
    });
  } catch (err) {
    // Failed to parse auth header
    console.error('[middleware] Failed to parse Authorization header:', err);
    return new NextResponse('Invalid authorization header', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Dashboard", charset="UTF-8"',
        'Content-Type': 'text/plain',
      },
    });
  }
}

/**
 * Matcher configuration - only run middleware on protected routes.
 *
 * Public routes (no auth):
 * - GET /api/events/[eventId] - Mobile app reads events
 * - POST /api/events/[eventId]/join-requests - Mobile app submits join requests
 * - GET /api/events/[eventId]/join-requests/me - Mobile app checks own join request status
 *
 * Protected routes (Basic Auth required):
 * - /dashboard/* - Dashboard UI
 * - /checkin/* - Check-in and QR scan
 * - GET /api/events - Dashboard lists all events
 * - POST /api/events/create - Create events
 * - PATCH /api/events/update - Update events
 * - GET /api/events/[eventId]/join-requests - Dashboard lists join requests
 * - PATCH /api/join-requests/[id] - Update join requests
 * - /api/uploads/* - File uploads
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/events$',
    '/api/events/create',
    '/api/events/update',
    '/api/events/:path*/join-requests',
    '/api/join-requests/:path*',
    '/api/uploads/:path*',
    '/checkin/:path*',
  ],
};

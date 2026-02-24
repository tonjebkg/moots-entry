import { NextRequest, NextResponse } from "next/server";
import { env, isDevelopment } from "./env";

/**
 * CORS configuration
 *
 * Allows cross-origin requests from approved origins.
 * Essential for mobile app API access.
 */

/**
 * Allowed origins for CORS
 */
function getAllowedOrigins(): string[] {
  const origins: string[] = [];

  // Add app URL if configured
  if (env.NEXT_PUBLIC_APP_URL) {
    origins.push(env.NEXT_PUBLIC_APP_URL);
  }

  // Production origins
  origins.push(
    "https://moots.app",
    "https://www.moots.app",
    "https://app.moots.com"
  );

  // Development origins
  if (isDevelopment()) {
    origins.push(
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000"
    );
  }

  return origins;
}

/**
 * Allowed HTTP methods
 */
const ALLOWED_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];

/**
 * Allowed headers
 */
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "X-Requested-With",
  "Accept",
  "Origin",
];

/**
 * Cache duration for preflight requests (24 hours)
 */
const MAX_AGE = 86400;

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests

  const allowedOrigins = getAllowedOrigins();

  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;

  // In development, allow localhost with any port
  if (isDevelopment() && origin.match(/^http:\/\/localhost:\d+$/)) {
    return true;
  }

  // In development, allow 127.0.0.1 with any port
  if (isDevelopment() && origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
    return true;
  }

  return false;
}

/**
 * Add CORS headers to response
 */
export function addCorsHeaders(
  response: NextResponse,
  origin: string | null
): NextResponse {
  // Only add headers if origin is allowed
  if (isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  response.headers.set(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS.join(", ")
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    ALLOWED_HEADERS.join(", ")
  );
  response.headers.set("Access-Control-Max-Age", MAX_AGE.toString());

  return response;
}

/**
 * Handle CORS preflight request (OPTIONS)
 */
export function handleCorsPreflightRequest(
  request: NextRequest
): NextResponse {
  const origin = request.headers.get("origin");

  // Deny if origin not allowed
  if (!isOriginAllowed(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  // Create preflight response
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

/**
 * Wrap handler with CORS support
 *
 * @example
 * export const GET = withCors(async (request, context) => {
 *   // Your handler code
 *   return NextResponse.json({ data: 'hello' });
 * });
 */
export function withCors(
  handler: (request: NextRequest, context: any) => Promise<Response>
) {
  return async (request: NextRequest, context: any) => {
    const origin = request.headers.get("origin");

    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return handleCorsPreflightRequest(request);
    }

    // Execute handler
    const response = await handler(request, context);

    // Add CORS headers to response
    return addCorsHeaders(
      response instanceof NextResponse
        ? response
        : NextResponse.json(response),
      origin
    );
  };
}

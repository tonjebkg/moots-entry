import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { buildErrorResponse } from "./errors";
import { logger } from "./logger";

/**
 * Route handler type
 */
type RouteHandler = (
  request: NextRequest,
  context: any
) => Promise<Response | NextResponse> | Response | NextResponse;

/**
 * Wrap route handler with error handling
 *
 * This wrapper:
 * - Catches all errors thrown in the handler
 * - Logs errors with context
 * - Returns sanitized error responses
 * - Prevents information leakage in production
 *
 * @example
 * export const GET = withErrorHandling(async (request, context) => {
 *   // Your handler code here
 *   // Errors will be caught and handled automatically
 *   const data = await fetchData();
 *   return NextResponse.json(data);
 * });
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: any) => {
    const startTime = Date.now();

    try {
      // Log request
      logger.request(request);

      // Execute handler
      const response = await handler(request, context);

      // Log response
      const durationMs = Date.now() - startTime;
      const status = response.status || 200;
      logger.response(request, status, durationMs);

      return response;
    } catch (error) {
      // Log error with context
      const durationMs = Date.now() - startTime;
      logger.error("Route handler error", error as Error, {
        method: request.method,
        url: request.url,
        params: context?.params,
        durationMs,
      });

      // Report to Sentry
      Sentry.captureException(error, {
        tags: { method: request.method },
        extra: { url: request.url, params: context?.params, durationMs },
      });

      // Build sanitized error response
      return buildErrorResponse(error);
    }
  };
}

/**
 * Async error handler - wraps async functions and handles errors
 *
 * @example
 * const data = await asyncHandler(
 *   async () => await fetchData(),
 *   { context: 'Fetching user data' }
 * );
 */
export async function asyncHandler<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logger.error("Async operation failed", error as Error, context);
    throw error;
  }
}

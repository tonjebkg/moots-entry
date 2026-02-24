/**
 * Custom error classes and error handling utilities
 *
 * These errors provide type-safe, structured error handling
 * and prevent information leakage in production.
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(400, message, "VALIDATION_ERROR", details);
    this.name = "ValidationError";
  }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(403, message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(429, "Too many requests", "RATE_LIMIT_EXCEEDED", { retryAfter });
    this.name = "RateLimitError";
  }
}

/**
 * Internal server error (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, message, "INTERNAL_ERROR");
    this.name = "InternalServerError";
  }
}

/**
 * Database error handler
 * Converts PostgreSQL errors to appropriate AppError types
 */
export function handleDatabaseError(error: any): never {
  // PostgreSQL error codes
  if (error.code === "23505") {
    // Unique violation
    throw new ConflictError("Record already exists");
  }

  if (error.code === "23503") {
    // Foreign key violation
    throw new ConflictError("Referenced record not found");
  }

  if (error.code === "23502") {
    // Not null violation
    throw new ValidationError("Required field missing");
  }

  if (error.code === "23514") {
    // Check constraint violation
    throw new ValidationError("Invalid value provided");
  }

  // Generic database error
  console.error("Database error:", error);
  throw new InternalServerError("Database operation failed");
}

/**
 * Build error response for API routes
 * Sanitizes errors in production to prevent information leakage
 */
export function buildErrorResponse(error: unknown): Response {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Handle known AppError types
  if (error instanceof AppError) {
    const response: any = {
      error: error.message,
      code: error.code,
    };

    // Include details only in development or for validation errors
    if (isDevelopment || error instanceof ValidationError) {
      response.details = error.details;
    }

    // Add retry-after header for rate limit errors
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (error instanceof RateLimitError && error.details?.retryAfter) {
      headers["Retry-After"] = error.details.retryAfter.toString();
    }

    return new Response(JSON.stringify(response), {
      status: error.statusCode,
      headers,
    });
  }

  // Unknown error - log it but don't expose details
  console.error("Unexpected error:", error);

  const response: any = {
    error: "An unexpected error occurred",
    code: "INTERNAL_ERROR",
  };

  // Include error details only in development
  if (isDevelopment && error instanceof Error) {
    response.details = {
      message: error.message,
      stack: error.stack,
    };
  }

  return new Response(JSON.stringify(response), {
    status: 500,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

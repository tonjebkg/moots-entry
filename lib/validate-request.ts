import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: NextResponse };

/**
 * Validate request body against a Zod schema
 *
 * @param request The Next.js request object
 * @param schema Zod schema to validate against
 * @returns Validation result with typed data or error response
 *
 * @example
 * const result = await validateRequest(request, createJoinRequestSchema);
 * if (!result.success) return result.error;
 * const { data } = result; // fully typed!
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return {
        success: false,
        data: null,
        error: NextResponse.json(
          {
            error: "Validation failed",
            details: zodError.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        ),
      };
    }

    // Non-Zod errors (e.g., JSON parse errors)
    return {
      success: false,
      data: null,
      error: NextResponse.json(
        {
          error: "Invalid request body",
          details:
            error instanceof Error ? error.message : "Unable to parse request",
        },
        { status: 400 }
      ),
    };
  }
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param searchParams URLSearchParams from request
 * @param schema Zod schema to validate against
 * @returns Validation result with typed data or error response
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  try {
    // Convert URLSearchParams to plain object
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const data = schema.parse(params);
    return { success: true, data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return {
        success: false,
        data: null,
        error: NextResponse.json(
          {
            error: "Invalid query parameters",
            details: zodError.issues.map((err) => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        ),
      };
    }

    return {
      success: false,
      data: null,
      error: NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 }
      ),
    };
  }
}

/**
 * Sanitize string to prevent XSS
 * Note: This is a basic sanitizer. For production HTML rendering,
 * consider using DOMPurify or similar.
 */
export function sanitizeString(
  input: string | null | undefined
): string | null {
  if (!input) return null;

  return input
    .trim()
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate email format (basic check)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

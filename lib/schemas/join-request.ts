import { z } from "zod";

/**
 * Valid status values for join requests
 */
export const JOIN_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "DRAFT",
] as const;

export type JoinRequestStatus = (typeof JOIN_REQUEST_STATUSES)[number];

/**
 * Validation schema for creating a join request
 */
export const createJoinRequestSchema = z.object({
  owner_id: z
    .string()
    .min(1, "Owner ID is required")
    .max(255, "Owner ID too long")
    .trim(),

  plus_ones: z
    .number()
    .int("Plus ones must be an integer")
    .min(0, "Plus ones cannot be negative")
    .max(10, "Too many plus ones (max 10)")
    .optional()
    .default(0),

  comments: z
    .string()
    .max(1000, "Comments too long (max 1000 characters)")
    .optional()
    .nullable(),

  rsvp_contact: z
    .string()
    .email("Invalid email address")
    .max(255, "Email too long")
    .toLowerCase()
    .trim()
    .optional()
    .nullable(),

  company_website: z
    .string()
    .url("Invalid URL")
    .max(500, "URL too long")
    .optional()
    .nullable(),

  goals: z
    .string()
    .max(1000, "Goals too long (max 1000 characters)")
    .optional()
    .nullable(),

  looking_for: z
    .string()
    .max(1000, "Looking for text too long (max 1000 characters)")
    .optional()
    .nullable(),

  visibility_enabled: z.boolean().optional().default(true),
  notifications_enabled: z.boolean().optional().default(true),
});

export type CreateJoinRequestInput = z.infer<typeof createJoinRequestSchema>;

/**
 * Validation schema for updating a join request
 */
export const updateJoinRequestSchema = z.object({
  status: z.enum(JOIN_REQUEST_STATUSES).optional(),

  plus_ones: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional(),

  comments: z
    .string()
    .max(1000)
    .optional()
    .nullable(),

  rejection_reason: z
    .string()
    .max(500, "Rejection reason too long")
    .optional()
    .nullable(),

  visibility_enabled: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
});

export type UpdateJoinRequestInput = z.infer<typeof updateJoinRequestSchema>;

/**
 * Validate join request status string
 */
export function isValidStatus(status: string): status is JoinRequestStatus {
  return JOIN_REQUEST_STATUSES.includes(status as JoinRequestStatus);
}

/**
 * Validate and return status, or throw error
 */
export function validateStatus(status: string | null): JoinRequestStatus | null {
  if (!status) return null;

  if (!isValidStatus(status)) {
    throw new Error(
      `Invalid status: ${status}. Must be one of: ${JOIN_REQUEST_STATUSES.join(", ")}`
    );
  }

  return status;
}

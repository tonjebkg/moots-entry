import { z } from "zod";

/**
 * Valid event status values
 */
export const EVENT_STATUSES = [
  "DRAFT",
  "PUBLISHED",
  "CANCELLED",
  "COMPLETED",
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

/**
 * Valid approval modes
 */
export const APPROVAL_MODES = ["AUTOMATIC", "MANUAL"] as const;

export type ApprovalMode = (typeof APPROVAL_MODES)[number];

/**
 * Location schema
 */
export const locationSchema = z
  .object({
    venue_name: z.string().max(200).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    coordinates: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  })
  .optional()
  .nullable();

/**
 * Validation schema for creating an event
 */
export const createEventSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title too long (max 200 characters)")
    .trim(),

  description: z
    .string()
    .max(5000, "Description too long (max 5000 characters)")
    .optional()
    .nullable(),

  location: locationSchema,

  start_time: z
    .string()
    .datetime({ message: "Invalid start time format. Must be ISO 8601." }),

  end_time: z
    .string()
    .datetime({ message: "Invalid end time format. Must be ISO 8601." })
    .optional()
    .nullable(),

  timezone: z
    .string()
    .max(100, "Timezone too long")
    .regex(/^[A-Za-z_\/]+$/, "Invalid timezone format")
    .optional()
    .default("UTC"),

  max_attendees: z
    .number()
    .int()
    .min(1, "Must allow at least 1 attendee")
    .max(10000, "Max attendees too high")
    .optional()
    .nullable(),

  approval_mode: z
    .enum(APPROVAL_MODES)
    .optional()
    .default("MANUAL"),

  status: z
    .enum(EVENT_STATUSES)
    .optional()
    .default("PUBLISHED"),

  image_url: z
    .string()
    .url("Invalid image URL")
    .max(1000, "Image URL too long")
    .optional()
    .nullable(),

  hosts: z
    .array(
      z.object({
        name: z.string().max(200),
        role: z.string().max(100).optional(),
      })
    )
    .optional()
    .nullable(),

  sponsors: z
    .array(
      z.object({
        name: z.string().max(200),
        logo_url: z.string().url().max(1000).optional(),
      })
    )
    .optional()
    .nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Validation schema for updating an event
 */
export const updateEventSchema = createEventSchema.partial();

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

/**
 * Validate event status string
 */
export function isValidEventStatus(status: string): status is EventStatus {
  return EVENT_STATUSES.includes(status as EventStatus);
}

/**
 * Validate approval mode string
 */
export function isValidApprovalMode(mode: string): mode is ApprovalMode {
  return APPROVAL_MODES.includes(mode as ApprovalMode);
}

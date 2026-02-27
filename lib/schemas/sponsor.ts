import { z } from 'zod';

/**
 * Schema for creating a sponsor.
 */
export const createSponsorSchema = z.object({
  name: z.string().min(1, 'Sponsor name is required').max(200).trim(),
  tier: z.string().max(50).optional().nullable(),
  logo_url: z.string().url().max(1000).optional().nullable(),
  website_url: z.string().url().max(1000).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  contact_person: z.string().max(200).optional().nullable(),
  contact_email: z.string().email().max(200).optional().nullable(),
  goals: z
    .array(z.string().max(500))
    .max(20)
    .optional()
    .default([]),
  promised_seats: z.number().int().min(0).max(1000).optional().nullable(),
  table_preference: z.string().max(200).optional().nullable(),
  key_attendees: z
    .array(
      z.object({
        name: z.string().max(200),
        title: z.string().max(200).optional(),
      })
    )
    .max(50)
    .optional()
    .default([]),
  notes: z.string().max(5000).optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
});

export type CreateSponsorInput = z.infer<typeof createSponsorSchema>;

/**
 * Schema for updating a sponsor (all fields optional).
 */
export const updateSponsorSchema = createSponsorSchema.partial();

export type UpdateSponsorInput = z.infer<typeof updateSponsorSchema>;

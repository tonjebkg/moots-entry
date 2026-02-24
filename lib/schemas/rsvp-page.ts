import { z } from 'zod';

const customFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'select', 'textarea', 'checkbox']),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  placeholder: z.string().max(200).optional(),
});

export const createRsvpPageSchema = z.object({
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  headline: z.string().min(1).max(500).default("You're Invited"),
  description: z.string().max(2000).optional().nullable(),
  hero_image_url: z.string().url().optional().nullable(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#B8755E'),
  show_location: z.boolean().default(true),
  show_date: z.boolean().default(true),
  show_capacity: z.boolean().default(false),
  custom_fields: z.array(customFieldSchema).max(10).default([]),
  access_code: z.string().min(4).max(50).optional().nullable(),
  max_submissions: z.number().int().min(1).optional().nullable(),
});

export type CreateRsvpPageInput = z.infer<typeof createRsvpPageSchema>;

export const updateRsvpPageSchema = createRsvpPageSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type UpdateRsvpPageInput = z.infer<typeof updateRsvpPageSchema>;

export const publicRsvpSubmissionSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email required'),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  plus_ones: z.number().int().min(0).max(10).default(0),
  custom_responses: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().max(1000).optional().nullable(),
  access_code: z.string().optional(),
});

export type PublicRsvpSubmissionInput = z.infer<typeof publicRsvpSubmissionSchema>;

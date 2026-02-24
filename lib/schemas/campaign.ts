import { z } from 'zod';

// Campaign Status Enum
export const campaignStatusSchema = z.enum([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED',
]);

export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

// Create Campaign Schema
export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  description: z.string().optional(),
  email_subject: z.string().max(200).optional(),
  email_body: z.string().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// Update Campaign Schema
export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: campaignStatusSchema.optional(),
  email_subject: z.string().max(200).optional(),
  email_body: z.string().optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// Campaign Response Schema
export const campaignSchema = z.object({
  id: z.string().uuid(),
  event_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  status: campaignStatusSchema,
  email_subject: z.string().nullable(),
  email_body: z.string().nullable(),
  total_considering: z.number(),
  total_invited: z.number(),
  total_accepted: z.number(),
  total_declined: z.number(),
  total_joined: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Campaign = z.infer<typeof campaignSchema>;

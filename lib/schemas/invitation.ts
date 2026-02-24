import { z } from 'zod';

// Invitation Status Enum
export const invitationStatusSchema = z.enum([
  'CONSIDERING',
  'INVITED',
  'ACCEPTED',
  'DECLINED',
  'WAITLIST',
  'BOUNCED',
  'FAILED',
]);

export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

// Invitation Tier Enum
export const invitationTierSchema = z.enum([
  'TIER_1',
  'TIER_2',
  'TIER_3',
  'WAITLIST',
]);

export type InvitationTier = z.infer<typeof invitationTierSchema>;

// Invitation Priority Enum
export const invitationPrioritySchema = z.enum([
  'VIP',
  'HIGH',
  'NORMAL',
  'LOW',
]);

export type InvitationPriority = z.infer<typeof invitationPrioritySchema>;

// Create Invitation Schema
export const createInvitationSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  email: z.string().email('Invalid email address').max(255),
  tier: invitationTierSchema.optional().default('TIER_2'),
  priority: invitationPrioritySchema.optional().default('NORMAL'),
  expected_plus_ones: z.number().int().min(0).optional().default(0),
  internal_notes: z.string().optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

// Update Invitation Schema
export const updateInvitationSchema = z.object({
  status: invitationStatusSchema.optional(),
  tier: invitationTierSchema.optional(),
  priority: invitationPrioritySchema.optional(),
  expected_plus_ones: z.number().int().min(0).optional(),
  internal_notes: z.string().optional(),
  table_assignment: z.number().int().optional(),
  seat_assignment: z.number().int().optional(),
});

export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>;

// Bulk Update Schema
export const bulkUpdateInvitationsSchema = z.object({
  invitation_ids: z.array(z.string().uuid()).min(1, 'At least one invitation ID is required'),
  updates: z.object({
    status: invitationStatusSchema.optional(),
    tier: invitationTierSchema.optional(),
    priority: invitationPrioritySchema.optional(),
  }),
});

export type BulkUpdateInvitationsInput = z.infer<typeof bulkUpdateInvitationsSchema>;

// CSV Row Schema (for upload validation)
export const csvInvitationRowSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  tier: invitationTierSchema.optional(),
  priority: invitationPrioritySchema.optional(),
  expected_plus_ones: z.coerce.number().int().min(0).optional(),
  internal_notes: z.string().optional(),
});

export type CsvInvitationRow = z.infer<typeof csvInvitationRowSchema>;

// RSVP Response Schema
export const rsvpResponseSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  message: z.string().max(1000).optional(),
  plus_ones: z.number().int().min(0).max(10).optional(),
});

export type RsvpResponseInput = z.infer<typeof rsvpResponseSchema>;

// Join Request Schema
export const joinRequestSchema = z.object({
  message: z.string().max(1000).optional(),
});

export type JoinRequestInput = z.infer<typeof joinRequestSchema>;

// Invitation Response Schema
export const invitationSchema = z.object({
  id: z.string().uuid(),
  campaign_id: z.string().uuid(),
  event_id: z.number(),
  full_name: z.string(),
  email: z.string(),
  status: invitationStatusSchema,
  tier: invitationTierSchema,
  priority: invitationPrioritySchema,
  internal_notes: z.string().nullable(),
  expected_plus_ones: z.number(),
  invitation_token: z.string().nullable(),
  token_expires_at: z.string().nullable(),
  rsvp_email_sent_at: z.string().nullable(),
  rsvp_responded_at: z.string().nullable(),
  rsvp_response_message: z.string().nullable(),
  join_token: z.string().nullable(),
  join_link_sent_at: z.string().nullable(),
  join_completed_at: z.string().nullable(),
  join_request_id: z.number().nullable(),
  table_assignment: z.number().nullable(),
  seat_assignment: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Invitation = z.infer<typeof invitationSchema>;

// Send RSVP Schema
export const sendRsvpSchema = z.object({
  invitation_ids: z.array(z.string().uuid()).optional(),
  tier: invitationTierSchema.optional(),
}).refine(
  (data) => data.invitation_ids || data.tier,
  { message: 'Either invitation_ids or tier must be provided' }
);

export type SendRsvpInput = z.infer<typeof sendRsvpSchema>;

// Send Join Links Schema
export const sendJoinLinksSchema = z.object({
  invitation_ids: z.array(z.string().uuid()).min(1, 'At least one invitation ID is required'),
});

export type SendJoinLinksInput = z.infer<typeof sendJoinLinksSchema>;

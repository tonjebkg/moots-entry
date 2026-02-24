import { z } from 'zod';

export const configureFollowUpSchema = z.object({
  contact_ids: z.array(z.string().uuid()).min(1).max(500).optional(),
  subject_template: z.string().max(500).optional(),
  content_template: z.string().max(10000).optional(),
  auto_generate: z.boolean().default(true),
});

export type ConfigureFollowUpInput = z.infer<typeof configureFollowUpSchema>;

export const updateFollowUpStatusSchema = z.object({
  status: z.enum(['PENDING', 'SENT', 'OPENED', 'REPLIED', 'MEETING_BOOKED', 'FAILED']),
});

export type UpdateFollowUpStatusInput = z.infer<typeof updateFollowUpStatusSchema>;

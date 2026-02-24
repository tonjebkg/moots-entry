import { z } from 'zod';

export const createBroadcastSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(500),
  content: z.string().min(1, 'Content is required').max(50000),
  recipient_filter: z.record(z.string(), z.unknown()).default({}),
  scheduled_at: z.string().datetime().optional().nullable(),
});

export type CreateBroadcastInput = z.infer<typeof createBroadcastSchema>;

export const updateBroadcastSchema = z.object({
  subject: z.string().min(1).max(500).optional(),
  content: z.string().min(1).max(50000).optional(),
  recipient_filter: z.record(z.string(), z.unknown()).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'CANCELLED']).optional(),
});

export type UpdateBroadcastInput = z.infer<typeof updateBroadcastSchema>;

import { z } from 'zod';

/**
 * Schema for seating move analysis request.
 * Used by POST /api/events/[eventId]/seating/analyze-move
 */
export const analyzeMoveSchema = z.object({
  contact_id: z.string().uuid('contact_id must be a valid UUID'),
  from_table: z.number().int().min(0, 'from_table must be >= 0'),
  to_table: z.number().int().min(1, 'to_table must be >= 1'),
});

export type AnalyzeMoveInput = z.infer<typeof analyzeMoveSchema>;

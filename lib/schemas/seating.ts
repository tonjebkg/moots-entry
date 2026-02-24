import { z } from 'zod';

export const assignTableSchema = z.object({
  contact_id: z.string().uuid(),
  table_number: z.number().int().min(1),
  seat_number: z.number().int().min(1).optional().nullable(),
});

export type AssignTableInput = z.infer<typeof assignTableSchema>;

export const bulkAssignSchema = z.object({
  assignments: z.array(z.object({
    contact_id: z.string().uuid(),
    table_number: z.number().int().min(1),
    seat_number: z.number().int().min(1).optional().nullable(),
  })).min(1).max(500),
});

export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;

export const generateSeatingSchema = z.object({
  strategy: z.enum(['MIXED_INTERESTS', 'SIMILAR_INTERESTS', 'SCORE_BALANCED']).default('MIXED_INTERESTS'),
  max_per_table: z.number().int().min(2).max(20).optional(),
});

export type GenerateSeatingInput = z.infer<typeof generateSeatingSchema>;

export const generateIntroductionsSchema = z.object({
  max_pairings: z.number().int().min(1).max(100).default(20),
});

export type GenerateIntroductionsInput = z.infer<typeof generateIntroductionsSchema>;

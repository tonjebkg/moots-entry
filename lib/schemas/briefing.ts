import { z } from 'zod';

export const generateBriefingSchema = z.object({
  briefing_type: z.enum(['MORNING', 'END_OF_DAY', 'PRE_EVENT', 'CUSTOM']).default('PRE_EVENT'),
  title: z.string().min(1).max(200).optional(),
  generated_for: z.string().uuid().optional(), // defaults to current user
});

export type GenerateBriefingInput = z.infer<typeof generateBriefingSchema>;

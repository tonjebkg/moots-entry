import { z } from 'zod';

export const triggerScoringSchema = z.object({
  contact_ids: z.array(z.string().uuid()).optional(), // omit to score all workspace contacts
});

export const triggerEnrichmentSchema = z.object({
  contact_ids: z.array(z.string().uuid()).min(1).max(100),
});

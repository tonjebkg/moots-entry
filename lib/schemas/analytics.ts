import { z } from 'zod';

export const analyticsQuerySchema = z.object({
  compare_event_id: z.string().optional(),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;

export const analyticsExportSchema = z.object({
  format: z.enum(['csv', 'json']).default('csv'),
});

export type AnalyticsExportInput = z.infer<typeof analyticsExportSchema>;

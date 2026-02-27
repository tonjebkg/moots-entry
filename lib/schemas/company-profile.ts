import { z } from 'zod';

/**
 * Schema for updating a workspace's company profile.
 */
export const updateCompanyProfileSchema = z.object({
  company_website: z.string().url().max(500).optional().nullable(),
  company_description: z.string().max(5000).optional().nullable(),
  industry: z.string().max(200).optional().nullable(),
  market_position: z.string().max(5000).optional().nullable(),
  key_leadership: z
    .array(
      z.object({
        name: z.string().max(200),
        title: z.string().max(200),
      })
    )
    .max(50)
    .optional()
    .nullable(),
  strategic_priorities: z
    .array(z.string().max(500))
    .max(20)
    .optional()
    .nullable(),
  competitors: z
    .array(z.string().max(200))
    .max(20)
    .optional()
    .nullable(),
  brand_voice: z.string().max(2000).optional().nullable(),
});

export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;

/**
 * Schema for triggering company research.
 */
export const researchCompanySchema = z.object({
  action: z.literal('research'),
  company_name: z.string().min(1).max(200),
  company_website: z.string().url().max(500).optional(),
});

export type ResearchCompanyInput = z.infer<typeof researchCompanySchema>;

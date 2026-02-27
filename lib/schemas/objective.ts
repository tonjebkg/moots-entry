import { z } from 'zod';

export const createObjectiveSchema = z.object({
  objective_text: z.string().min(1).max(1000),
  weight: z.number().min(0).max(10).default(1.0),
  criteria_config: z.record(z.string(), z.unknown()).optional().default({}),
  sort_order: z.number().int().min(0).optional().default(0),
  ai_interpretation: z.string().optional(),
  ai_questions: z.array(z.string()).optional(),
  qualifying_count: z.number().int().min(0).optional(),
});

export const updateObjectiveSchema = z.object({
  objective_text: z.string().min(1).max(1000).optional(),
  weight: z.number().min(0).max(10).optional(),
  criteria_config: z.record(z.string(), z.unknown()).optional(),
  sort_order: z.number().int().min(0).optional(),
  ai_interpretation: z.string().optional(),
  ai_questions: z.array(z.string()).optional(),
  qualifying_count: z.number().int().min(0).optional(),
});

export const bulkObjectivesSchema = z.object({
  objectives: z.array(z.object({
    id: z.string().uuid().optional(), // omit for new
    objective_text: z.string().min(1).max(1000),
    weight: z.number().min(0).max(10).default(1.0),
    criteria_config: z.record(z.string(), z.unknown()).optional().default({}),
    sort_order: z.number().int().min(0).default(0),
    ai_interpretation: z.string().optional(),
    ai_questions: z.array(z.string()).optional(),
    qualifying_count: z.number().int().min(0).optional(),
  })).min(1).max(20),
});

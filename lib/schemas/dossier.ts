import { z } from 'zod';

export const teamAssignmentSchema = z.object({
  contact_id: z.string().uuid(),
  assigned_to: z.string().uuid(),
  role: z.string().max(100).default('PRIMARY'),
  notes: z.string().max(1000).optional().nullable(),
});

export type TeamAssignmentInput = z.infer<typeof teamAssignmentSchema>;

export const bulkTeamAssignmentSchema = z.object({
  assignments: z.array(teamAssignmentSchema).min(1).max(100),
});

export type BulkTeamAssignmentInput = z.infer<typeof bulkTeamAssignmentSchema>;

export const updateTeamAssignmentSchema = z.object({
  role: z.string().max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

export type UpdateTeamAssignmentInput = z.infer<typeof updateTeamAssignmentSchema>;

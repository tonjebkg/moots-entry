import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(200).trim(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').transform(v => v.toLowerCase().trim()),
  role: z.enum(['ADMIN', 'TEAM_MEMBER', 'EXTERNAL_PARTNER', 'VIEWER']),
  event_ids: z.array(z.string().uuid()).nullable().optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'TEAM_MEMBER', 'EXTERNAL_PARTNER', 'VIEWER']).optional(),
  event_ids: z.array(z.string().uuid()).nullable().optional(),
});

export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const switchWorkspaceSchema = z.object({
  workspace_id: z.string().uuid('Invalid workspace ID'),
});

export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;

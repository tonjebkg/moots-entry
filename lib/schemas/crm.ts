import { z } from 'zod';

export const crmConnectionSchema = z.object({
  provider: z.enum(['SALESFORCE', 'HUBSPOT']),
  name: z.string().min(1).max(200),
  credentials: z.object({
    api_key: z.string().optional(),
    access_token: z.string().optional(),
    instance_url: z.string().url().optional(),
    refresh_token: z.string().optional(),
  }),
  sync_direction: z.enum(['PUSH', 'PULL', 'BIDIRECTIONAL']).default('PUSH'),
});

export type CrmConnectionInput = z.infer<typeof crmConnectionSchema>;

export const crmConnectionUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  credentials: z.object({
    api_key: z.string().optional(),
    access_token: z.string().optional(),
    instance_url: z.string().url().optional(),
    refresh_token: z.string().optional(),
  }).optional(),
  sync_direction: z.enum(['PUSH', 'PULL', 'BIDIRECTIONAL']).optional(),
  is_active: z.boolean().optional(),
});

export type CrmConnectionUpdateInput = z.infer<typeof crmConnectionUpdateSchema>;

export const crmFieldMappingSchema = z.object({
  contact_fields: z.array(z.object({
    moots_field: z.string().min(1),
    crm_field: z.string().min(1),
  })),
  follow_up_fields: z.array(z.object({
    moots_field: z.string().min(1),
    crm_field: z.string().min(1),
  })).optional(),
});

export type CrmFieldMappingInput = z.infer<typeof crmFieldMappingSchema>;

export const triggerSyncSchema = z.object({
  entity_type: z.enum(['contacts', 'follow_ups']).default('contacts'),
  contact_ids: z.array(z.string().uuid()).optional(),
  event_id: z.number().int().optional(),
});

export type TriggerSyncInput = z.infer<typeof triggerSyncSchema>;

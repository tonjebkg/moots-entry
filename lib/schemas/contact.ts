import { z } from 'zod';

const contactEmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(['work', 'personal', 'other']).optional(),
  primary: z.boolean().optional(),
});

const contactPhoneSchema = z.object({
  phone: z.string().min(1).max(50),
  type: z.enum(['mobile', 'work', 'home', 'other']).optional(),
  primary: z.boolean().optional(),
});

export const createContactSchema = z.object({
  full_name: z.string().min(1).max(200),
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  photo_url: z.string().url().max(1000).optional().nullable(),
  emails: z.array(contactEmailSchema).optional().default([]),
  phones: z.array(contactPhoneSchema).optional().default([]),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  role_seniority: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  twitter_url: z.string().url().max(500).optional().nullable(),
  net_worth_range: z.string().max(100).optional().nullable(),
  board_affiliations: z.array(z.string()).optional().default([]),
  tags: z.array(z.string().max(50)).optional().default([]),
  internal_notes: z.string().max(5000).optional().nullable(),
  source: z.enum(['MANUAL', 'CSV_IMPORT', 'EVENT_IMPORT', 'API', 'ENRICHMENT']).optional().default('MANUAL'),
  source_detail: z.string().max(500).optional().nullable(),
});

export const updateContactSchema = z.object({
  full_name: z.string().min(1).max(200).optional(),
  first_name: z.string().max(100).optional().nullable(),
  last_name: z.string().max(100).optional().nullable(),
  photo_url: z.string().url().max(1000).optional().nullable(),
  emails: z.array(contactEmailSchema).optional(),
  phones: z.array(contactPhoneSchema).optional(),
  company: z.string().max(200).optional().nullable(),
  title: z.string().max(200).optional().nullable(),
  role_seniority: z.string().max(100).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  linkedin_url: z.string().url().max(500).optional().nullable(),
  twitter_url: z.string().url().max(500).optional().nullable(),
  net_worth_range: z.string().max(100).optional().nullable(),
  board_affiliations: z.array(z.string()).optional(),
  tags: z.array(z.string().max(50)).optional(),
  internal_notes: z.string().max(5000).optional().nullable(),
});

export const contactSearchSchema = z.object({
  q: z.string().optional().default(''),
  tags: z.string().optional(), // comma-separated
  enrichment_status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'STALE']).optional(),
  source: z.enum(['MANUAL', 'CSV_IMPORT', 'EVENT_IMPORT', 'API', 'ENRICHMENT']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(['full_name', 'company', 'created_at', 'updated_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const csvContactRowSchema = z.object({
  full_name: z.string().min(1),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  linkedin_url: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  notes: z.string().optional(),
});

export const bulkTagSchema = z.object({
  contact_ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(['add', 'remove']),
  tags: z.array(z.string().max(50)).min(1).max(20),
});

export const importFromEventSchema = z.object({
  event_id: z.coerce.number().int().min(1),
  campaign_id: z.string().uuid().optional(),
});

export const mergeContactsSchema = z.object({
  primary_id: z.string().uuid(),
  duplicate_ids: z.array(z.string().uuid()).min(1).max(10),
});

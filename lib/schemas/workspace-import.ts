import { z } from 'zod';

export const airtableImportSchema = z.object({
  api_key: z.string().min(1, 'Airtable API key is required'),
  base_id: z.string().min(1, 'Base ID is required'),
  table_id: z.string().min(1, 'Table ID is required'),
  field_mapping: z.array(z.object({
    source_field: z.string().min(1),
    target_field: z.enum([
      'full_name', 'first_name', 'last_name', 'email',
      'company', 'title', 'phone', 'linkedin_url',
      'tags', 'notes', 'skip',
    ]),
  })),
  tags: z.array(z.string()).optional(),
});

export type AirtableImportInput = z.infer<typeof airtableImportSchema>;

export const airtablePreviewSchema = z.object({
  api_key: z.string().min(1),
  base_id: z.string().min(1),
  table_id: z.string().min(1),
});

export type AirtablePreviewInput = z.infer<typeof airtablePreviewSchema>;

export const notionImportSchema = z.object({
  api_key: z.string().min(1, 'Notion API key is required'),
  database_id: z.string().min(1, 'Database ID is required'),
  field_mapping: z.array(z.object({
    source_field: z.string().min(1),
    target_field: z.enum([
      'full_name', 'first_name', 'last_name', 'email',
      'company', 'title', 'phone', 'linkedin_url',
      'tags', 'notes', 'skip',
    ]),
  })),
  tags: z.array(z.string()).optional(),
});

export type NotionImportInput = z.infer<typeof notionImportSchema>;

export const notionPreviewSchema = z.object({
  api_key: z.string().min(1),
  database_id: z.string().min(1),
});

export type NotionPreviewInput = z.infer<typeof notionPreviewSchema>;

export const fieldMappingSchema = z.object({
  mappings: z.array(z.object({
    source_field: z.string().min(1),
    target_field: z.enum([
      'full_name', 'first_name', 'last_name', 'email',
      'company', 'title', 'phone', 'linkedin_url',
      'tags', 'notes', 'skip',
    ]),
  })),
});

export type FieldMappingInput = z.infer<typeof fieldMappingSchema>;

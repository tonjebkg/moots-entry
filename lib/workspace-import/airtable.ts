import { logger } from '@/lib/logger';

export interface AirtableBase {
  id: string;
  name: string;
  tables: { id: string; name: string }[];
}

export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
}

/**
 * Fetch Airtable bases accessible with the given API key.
 */
export async function fetchAirtableBases(apiKey: string): Promise<AirtableBase[]> {
  const res = await fetch('https://api.airtable.com/v0/meta/bases', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable API error: ${err}`);
  }

  const data = await res.json();
  return (data.bases || []).map((base: any) => ({
    id: base.id,
    name: base.name,
    tables: [],
  }));
}

/**
 * Fetch tables in an Airtable base.
 */
export async function fetchAirtableTables(
  apiKey: string,
  baseId: string
): Promise<{ id: string; name: string; fields: AirtableField[] }[]> {
  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable API error: ${err}`);
  }

  const data = await res.json();
  return (data.tables || []).map((table: any) => ({
    id: table.id,
    name: table.name,
    fields: (table.fields || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      type: f.type,
    })),
  }));
}

/**
 * Fetch records from an Airtable table (with pagination).
 */
export async function fetchAirtableRecords(
  apiKey: string,
  baseId: string,
  tableId: string,
  maxRecords: number = 1000
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  while (records.length < maxRecords) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable API error: ${err}`);
    }

    const data = await res.json();
    for (const record of data.records || []) {
      records.push({ id: record.id, fields: record.fields || {} });
    }

    offset = data.offset;
    if (!offset) break;
  }

  return records.slice(0, maxRecords);
}

/**
 * Auto-detect field mapping from Airtable field names.
 */
export function autoDetectAirtableFieldMapping(
  fields: AirtableField[]
): { source_field: string; target_field: string }[] {
  const mapping: { source_field: string; target_field: string }[] = [];

  const detectionRules: { patterns: RegExp[]; target: string }[] = [
    { patterns: [/^name$/i, /^full.?name$/i, /^contact.?name$/i], target: 'full_name' },
    { patterns: [/^first.?name$/i, /^fname$/i], target: 'first_name' },
    { patterns: [/^last.?name$/i, /^lname$/i, /^surname$/i], target: 'last_name' },
    { patterns: [/^email$/i, /^e.?mail$/i, /^email.?address$/i], target: 'email' },
    { patterns: [/^company$/i, /^organization$/i, /^org$/i, /^employer$/i], target: 'company' },
    { patterns: [/^title$/i, /^job.?title$/i, /^role$/i, /^position$/i], target: 'title' },
    { patterns: [/^phone$/i, /^telephone$/i, /^mobile$/i, /^cell$/i], target: 'phone' },
    { patterns: [/^linkedin$/i, /^linkedin.?url$/i, /^linkedin.?profile$/i], target: 'linkedin_url' },
    { patterns: [/^tags$/i, /^labels$/i, /^categories$/i], target: 'tags' },
    { patterns: [/^notes$/i, /^comments$/i, /^description$/i], target: 'notes' },
  ];

  for (const field of fields) {
    let matched = false;
    for (const rule of detectionRules) {
      if (rule.patterns.some(p => p.test(field.name))) {
        mapping.push({ source_field: field.name, target_field: rule.target });
        matched = true;
        break;
      }
    }
    if (!matched) {
      mapping.push({ source_field: field.name, target_field: 'skip' });
    }
  }

  return mapping;
}

/**
 * Map Airtable records to Moots contact format using field mapping.
 */
export function mapAirtableRecords(
  records: AirtableRecord[],
  fieldMapping: { source_field: string; target_field: string }[]
): Record<string, any>[] {
  return records.map(record => {
    const contact: Record<string, any> = {};
    for (const mapping of fieldMapping) {
      if (mapping.target_field === 'skip') continue;
      const value = record.fields[mapping.source_field];
      if (value !== undefined && value !== null && value !== '') {
        if (mapping.target_field === 'tags' && typeof value === 'string') {
          contact.tags = value.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (mapping.target_field === 'email') {
          contact.emails = [{ address: String(value), type: 'work' }];
        } else {
          contact[mapping.target_field] = String(value);
        }
      }
    }
    return contact;
  }).filter(c => c.full_name || (c.first_name && c.last_name) || c.emails);
}

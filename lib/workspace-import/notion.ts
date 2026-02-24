import { logger } from '@/lib/logger';

export interface NotionDatabase {
  id: string;
  title: string;
  properties: NotionProperty[];
}

export interface NotionProperty {
  id: string;
  name: string;
  type: string;
}

export interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

/**
 * Fetch Notion databases accessible via the integration.
 */
export async function fetchNotionDatabases(apiKey: string): Promise<NotionDatabase[]> {
  const res = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: { value: 'database', property: 'object' },
      page_size: 100,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error: ${err}`);
  }

  const data = await res.json();
  return (data.results || []).map((db: any) => ({
    id: db.id,
    title: db.title?.[0]?.plain_text || 'Untitled',
    properties: Object.entries(db.properties || {}).map(([name, prop]: [string, any]) => ({
      id: prop.id,
      name,
      type: prop.type,
    })),
  }));
}

/**
 * Fetch pages from a Notion database (with pagination).
 */
export async function fetchNotionPages(
  apiKey: string,
  databaseId: string,
  maxPages: number = 1000
): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;

  while (pages.length < maxPages) {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API error: ${err}`);
    }

    const data = await res.json();
    for (const page of data.results || []) {
      pages.push({ id: page.id, properties: page.properties || {} });
    }

    cursor = data.next_cursor;
    if (!data.has_more || !cursor) break;
  }

  return pages.slice(0, maxPages);
}

/**
 * Extract a text value from a Notion property.
 */
function extractNotionValue(property: any): string | null {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || null;
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || null;
    case 'email':
      return property.email || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'url':
      return property.url || null;
    case 'number':
      return property.number != null ? String(property.number) : null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return (property.multi_select || []).map((s: any) => s.name).join(', ') || null;
    case 'people':
      return property.people?.[0]?.name || null;
    default:
      return null;
  }
}

/**
 * Auto-detect field mapping from Notion property names.
 */
export function autoDetectNotionFieldMapping(
  properties: NotionProperty[]
): { source_field: string; target_field: string }[] {
  const mapping: { source_field: string; target_field: string }[] = [];

  const detectionRules: { patterns: RegExp[]; target: string }[] = [
    { patterns: [/^name$/i, /^full.?name$/i, /^contact.?name$/i], target: 'full_name' },
    { patterns: [/^first.?name$/i], target: 'first_name' },
    { patterns: [/^last.?name$/i, /^surname$/i], target: 'last_name' },
    { patterns: [/^email$/i, /^e.?mail$/i], target: 'email' },
    { patterns: [/^company$/i, /^organization$/i, /^org$/i], target: 'company' },
    { patterns: [/^title$/i, /^job.?title$/i, /^role$/i, /^position$/i], target: 'title' },
    { patterns: [/^phone$/i, /^telephone$/i, /^mobile$/i], target: 'phone' },
    { patterns: [/^linkedin$/i, /^linkedin.?url$/i], target: 'linkedin_url' },
    { patterns: [/^tags$/i, /^labels$/i], target: 'tags' },
    { patterns: [/^notes$/i, /^description$/i], target: 'notes' },
  ];

  for (const prop of properties) {
    let matched = false;
    for (const rule of detectionRules) {
      if (rule.patterns.some(p => p.test(prop.name))) {
        mapping.push({ source_field: prop.name, target_field: rule.target });
        matched = true;
        break;
      }
    }
    if (!matched) {
      mapping.push({ source_field: prop.name, target_field: 'skip' });
    }
  }

  return mapping;
}

/**
 * Map Notion pages to Moots contact format using field mapping.
 */
export function mapNotionPages(
  pages: NotionPage[],
  fieldMapping: { source_field: string; target_field: string }[]
): Record<string, any>[] {
  return pages.map(page => {
    const contact: Record<string, any> = {};

    for (const mapping of fieldMapping) {
      if (mapping.target_field === 'skip') continue;
      const prop = page.properties[mapping.source_field];
      const value = extractNotionValue(prop);

      if (value) {
        if (mapping.target_field === 'tags') {
          contact.tags = value.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (mapping.target_field === 'email') {
          contact.emails = [{ address: value, type: 'work' }];
        } else {
          contact[mapping.target_field] = value;
        }
      }
    }

    return contact;
  }).filter(c => c.full_name || (c.first_name && c.last_name) || c.emails);
}

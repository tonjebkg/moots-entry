import { getDb } from '@/lib/db';
import { computeDedupKey } from './dedup';

interface CsvContactRow {
  full_name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedin_url?: string;
  tags?: string;
  notes?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; error: string; data?: unknown }[];
}

/**
 * Import validated CSV rows into contacts table.
 * Skips duplicates based on email within workspace.
 */
export async function importCsvRows(
  workspaceId: string,
  rows: CsvContactRow[]
): Promise<ImportResult> {
  const db = getDb();
  const errors: ImportResult['errors'] = [];
  let imported = 0;
  let skipped = 0;

  // Get existing emails in workspace for dedup
  const existingContacts = await db`
    SELECT emails FROM people_contacts WHERE workspace_id = ${workspaceId}
  `;
  const existingEmails = new Set<string>();
  for (const c of existingContacts) {
    const emails = Array.isArray(c.emails) ? c.emails : [];
    for (const e of emails) {
      if (e.email) existingEmails.add(e.email.toLowerCase());
    }
  }

  const emailsInBatch = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const email = row.email.toLowerCase().trim();

    if (existingEmails.has(email) || emailsInBatch.has(email)) {
      skipped++;
      continue;
    }

    emailsInBatch.add(email);

    const emails = JSON.stringify([{ email, type: 'work', primary: true }]);
    const phones = row.phone
      ? JSON.stringify([{ phone: row.phone, type: 'mobile', primary: true }])
      : '[]';
    const tags = row.tags
      ? row.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [];
    const dedupKey = computeDedupKey(row.full_name, [{ email }]);

    try {
      await db`
        INSERT INTO people_contacts (
          workspace_id, full_name, first_name, last_name,
          emails, phones, company, title, linkedin_url,
          tags, internal_notes, source, source_detail, dedup_key
        ) VALUES (
          ${workspaceId},
          ${row.full_name},
          ${row.first_name || null},
          ${row.last_name || null},
          ${emails}::jsonb,
          ${phones}::jsonb,
          ${row.company || null},
          ${row.title || null},
          ${row.linkedin_url || null},
          ${tags},
          ${row.notes || null},
          'CSV_IMPORT'::contact_source,
          'CSV upload',
          ${dedupKey}
        )
      `;
      imported++;
    } catch (error: any) {
      errors.push({ row: i + 2, error: error.message });
    }
  }

  return { imported, skipped, errors };
}

/**
 * Import guests from campaign_invitations into contacts.
 * Links back via contact_id on campaign_invitations.
 */
export async function importFromEvent(
  workspaceId: string,
  eventId: number,
  campaignId?: string
): Promise<ImportResult> {
  const db = getDb();
  const errors: ImportResult['errors'] = [];
  let imported = 0;
  let skipped = 0;

  // Get invitations that don't already have a contact_id
  const invitations = await db`
    SELECT ci.id, ci.full_name, ci.email, ci.internal_notes, ci.tier, ci.priority
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ci.event_id = ${eventId}
      AND ic.workspace_id = ${workspaceId}
      ${campaignId ? db`AND ci.campaign_id = ${campaignId}` : db``}
      AND ci.contact_id IS NULL
  `;

  for (const inv of invitations) {
    const email = inv.email?.toLowerCase()?.trim();
    if (!email) {
      skipped++;
      continue;
    }

    // Check for existing contact with same email
    const existing = await db`
      SELECT id FROM people_contacts
      WHERE workspace_id = ${workspaceId}
        AND emails @> ${JSON.stringify([{ email }])}::jsonb
      LIMIT 1
    `;

    let contactId: string;

    if (existing.length > 0) {
      contactId = existing[0].id;
      skipped++;
    } else {
      const emails = JSON.stringify([{ email, type: 'work', primary: true }]);
      const dedupKey = computeDedupKey(inv.full_name, [{ email }]);
      const nameParts = inv.full_name?.split(' ') || [];

      const newContact = await db`
        INSERT INTO people_contacts (
          workspace_id, full_name, first_name, last_name,
          emails, source, source_detail, dedup_key,
          internal_notes, tags
        ) VALUES (
          ${workspaceId},
          ${inv.full_name},
          ${nameParts[0] || null},
          ${nameParts.slice(1).join(' ') || null},
          ${emails}::jsonb,
          'EVENT_IMPORT'::contact_source,
          ${`Event ${eventId}`},
          ${dedupKey},
          ${inv.internal_notes || null},
          ${inv.tier ? [inv.tier] : []}
        )
        RETURNING id
      `;
      contactId = newContact[0].id;
      imported++;
    }

    // Link invitation to contact
    await db`
      UPDATE campaign_invitations SET contact_id = ${contactId}
      WHERE id = ${inv.id}
    `;
  }

  return { imported, skipped, errors };
}

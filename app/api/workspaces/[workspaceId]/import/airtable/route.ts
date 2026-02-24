import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { airtableImportSchema } from '@/lib/schemas/workspace-import';
import { fetchAirtableBases, fetchAirtableTables, fetchAirtableRecords, mapAirtableRecords } from '@/lib/workspace-import/airtable';
import { getDb } from '@/lib/db';
import { computeDedupKey } from '@/lib/contacts/dedup';

export const runtime = 'nodejs';

/**
 * GET /api/workspaces/[workspaceId]/import/airtable?api_key=... — List bases
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { workspaceId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const apiKey = url.searchParams.get('api_key');
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key parameter required' }, { status: 400 });
  }

  const bases = await fetchAirtableBases(apiKey);

  // Fetch tables for each base
  const basesWithTables = await Promise.all(
    bases.map(async (base) => {
      try {
        const tables = await fetchAirtableTables(apiKey, base.id);
        return { ...base, tables };
      } catch {
        return { ...base, tables: [] };
      }
    })
  );

  return NextResponse.json({ bases: basesWithTables });
});

/**
 * POST /api/workspaces/[workspaceId]/import/airtable — Import records
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { workspaceId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, airtableImportSchema);
  if (!validation.success) return validation.error;

  const { api_key, base_id, table_id, field_mapping, tags: extraTags } = validation.data;

  // Fetch records from Airtable
  const records = await fetchAirtableRecords(api_key, base_id, table_id);
  const contacts = mapAirtableRecords(records, field_mapping);

  // Import into people_contacts with dedup
  const db = getDb();
  let imported = 0;
  let skipped = 0;

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

  for (const contact of contacts) {
    const primaryEmail = contact.emails?.[0]?.address?.toLowerCase();

    if (primaryEmail && existingEmails.has(primaryEmail)) {
      skipped++;
      continue;
    }

    if (primaryEmail) existingEmails.add(primaryEmail);

    const fullName = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    const emailsJson = contact.emails ? JSON.stringify(contact.emails) : '[]';
    const tags = [...(contact.tags || []), ...(extraTags || [])];
    const dedupKey = computeDedupKey(fullName, contact.emails || []);

    try {
      await db`
        INSERT INTO people_contacts (
          workspace_id, full_name, first_name, last_name,
          emails, company, title, phone, linkedin_url,
          tags, internal_notes, source, source_detail, dedup_key
        ) VALUES (
          ${workspaceId},
          ${fullName},
          ${contact.first_name || null},
          ${contact.last_name || null},
          ${emailsJson}::jsonb,
          ${contact.company || null},
          ${contact.title || null},
          ${contact.phone || null},
          ${contact.linkedin_url || null},
          ${tags},
          ${contact.notes || null},
          'AIRTABLE_IMPORT'::contact_source,
          ${`Airtable: ${base_id}/${table_id}`},
          ${dedupKey}
        )
      `;
      imported++;
    } catch {
      skipped++;
    }
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'import.airtable_completed',
    entityType: 'people_contact',
    metadata: { base_id, table_id, total_records: records.length, imported, skipped },
  });

  return NextResponse.json({ imported, skipped, total: records.length });
});

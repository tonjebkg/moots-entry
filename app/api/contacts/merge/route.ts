import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { NotFoundError } from '@/lib/errors';
import { mergeContactsSchema } from '@/lib/schemas/contact';

/**
 * POST /api/contacts/merge — Merge duplicate contacts into a primary contact
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const result = await validateRequest(request, mergeContactsSchema);
  if (!result.success) return result.error;
  const { primary_id, duplicate_ids } = result.data;

  const db = getDb();

  // Fetch primary contact
  const primary = await db`
    SELECT * FROM people_contacts
    WHERE id = ${primary_id} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;
  if (primary.length === 0) {
    throw new NotFoundError('Primary contact');
  }

  // Fetch duplicates
  const duplicates = await db`
    SELECT * FROM people_contacts
    WHERE id = ANY(${duplicate_ids}::uuid[])
      AND workspace_id = ${auth.workspace.id}
  `;

  if (duplicates.length === 0) {
    throw new NotFoundError('Duplicate contacts');
  }

  const primaryContact = primary[0];

  // Merge emails: combine unique emails
  const allEmails = [...(primaryContact.emails || [])];
  const emailSet = new Set(allEmails.map((e: any) => e.email?.toLowerCase()));
  for (const dup of duplicates) {
    for (const e of (dup.emails || [])) {
      if (!emailSet.has(e.email?.toLowerCase())) {
        allEmails.push(e);
        emailSet.add(e.email?.toLowerCase());
      }
    }
  }

  // Merge tags: combine unique tags
  const tagSet = new Set(primaryContact.tags || []);
  for (const dup of duplicates) {
    for (const t of (dup.tags || [])) {
      tagSet.add(t);
    }
  }

  // Merge notes
  const allNotes = [primaryContact.internal_notes, ...duplicates.map((d: any) => d.internal_notes)]
    .filter(Boolean)
    .join('\n---\n');

  // Update primary contact with merged data
  await db`
    UPDATE people_contacts SET
      emails = ${JSON.stringify(allEmails)}::jsonb,
      tags = ${Array.from(tagSet)},
      internal_notes = ${allNotes || null},
      company = COALESCE(${primaryContact.company}, ${duplicates[0]?.company || null}),
      title = COALESCE(${primaryContact.title}, ${duplicates[0]?.title || null}),
      linkedin_url = COALESCE(${primaryContact.linkedin_url}, ${duplicates[0]?.linkedin_url || null})
    WHERE id = ${primary_id}
  `;

  // Reassign campaign_invitations from duplicates to primary
  await db`
    UPDATE campaign_invitations
    SET contact_id = ${primary_id}
    WHERE contact_id = ANY(${duplicate_ids}::uuid[])
  `;

  // Reassign guest_scores from duplicates to primary (delete conflicts)
  await db`
    DELETE FROM guest_scores
    WHERE contact_id = ANY(${duplicate_ids}::uuid[])
      AND event_id IN (
        SELECT event_id FROM guest_scores WHERE contact_id = ${primary_id}
      )
  `;
  await db`
    UPDATE guest_scores
    SET contact_id = ${primary_id}
    WHERE contact_id = ANY(${duplicate_ids}::uuid[])
  `;

  // Delete duplicate contacts
  await db`
    DELETE FROM people_contacts
    WHERE id = ANY(${duplicate_ids}::uuid[])
      AND workspace_id = ${auth.workspace.id}
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.merged',
    entityType: 'contact',
    entityId: primary_id,
    metadata: {
      merged_ids: duplicate_ids,
      merged_count: duplicates.length,
    },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({
    success: true,
    primary_id,
    merged_count: duplicates.length,
    message: `Merged ${duplicates.length} duplicate(s) into primary contact`,
  });
});

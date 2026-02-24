import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { NotFoundError } from '@/lib/errors';
import { updateContactSchema } from '@/lib/schemas/contact';
import { computeDedupKey } from '@/lib/contacts/dedup';

type RouteParams = { params: Promise<{ contactId: string }> };

/**
 * GET /api/contacts/[contactId] — Get contact detail with scores across events
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { contactId } = await params;
  const db = getDb();

  const contact = await db`
    SELECT * FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (contact.length === 0) {
    throw new NotFoundError('Contact');
  }

  // Fetch scores across all events
  const scores = await db`
    SELECT gs.*, e.title as event_title
    FROM guest_scores gs
    JOIN events e ON e.id = gs.event_id
    WHERE gs.contact_id = ${contactId}
      AND gs.workspace_id = ${auth.workspace.id}
    ORDER BY gs.scored_at DESC
  `;

  return NextResponse.json({
    ...contact[0],
    scores,
  });
});

/**
 * PATCH /api/contacts/[contactId] — Update a contact
 */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { contactId } = await params;

  const result = await validateRequest(request, updateContactSchema);
  if (!result.success) return result.error;
  const { data } = result;

  const db = getDb();

  // Verify contact exists and belongs to workspace
  const existing = await db`
    SELECT id, full_name, emails FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (existing.length === 0) {
    throw new NotFoundError('Contact');
  }

  // Build update fields dynamically
  const updates: Record<string, unknown> = {};
  if (data.full_name !== undefined) updates.full_name = data.full_name;
  if (data.first_name !== undefined) updates.first_name = data.first_name;
  if (data.last_name !== undefined) updates.last_name = data.last_name;
  if (data.photo_url !== undefined) updates.photo_url = data.photo_url;
  if (data.company !== undefined) updates.company = data.company;
  if (data.title !== undefined) updates.title = data.title;
  if (data.role_seniority !== undefined) updates.role_seniority = data.role_seniority;
  if (data.industry !== undefined) updates.industry = data.industry;
  if (data.linkedin_url !== undefined) updates.linkedin_url = data.linkedin_url;
  if (data.twitter_url !== undefined) updates.twitter_url = data.twitter_url;
  if (data.net_worth_range !== undefined) updates.net_worth_range = data.net_worth_range;
  if (data.internal_notes !== undefined) updates.internal_notes = data.internal_notes;

  // Recompute dedup key if name or emails changed
  const newName = data.full_name ?? existing[0].full_name;
  const newEmails = data.emails ?? existing[0].emails;
  const dedupKey = computeDedupKey(newName, Array.isArray(newEmails) ? newEmails : []);

  const updated = await db`
    UPDATE people_contacts SET
      full_name = COALESCE(${data.full_name ?? null}, full_name),
      first_name = ${data.first_name !== undefined ? data.first_name : null},
      last_name = ${data.last_name !== undefined ? data.last_name : null},
      photo_url = ${data.photo_url !== undefined ? data.photo_url : null},
      emails = ${data.emails ? JSON.stringify(data.emails) : null}::jsonb,
      phones = ${data.phones ? JSON.stringify(data.phones) : null}::jsonb,
      company = ${data.company !== undefined ? data.company : null},
      title = ${data.title !== undefined ? data.title : null},
      role_seniority = ${data.role_seniority !== undefined ? data.role_seniority : null},
      industry = ${data.industry !== undefined ? data.industry : null},
      linkedin_url = ${data.linkedin_url !== undefined ? data.linkedin_url : null},
      twitter_url = ${data.twitter_url !== undefined ? data.twitter_url : null},
      net_worth_range = ${data.net_worth_range !== undefined ? data.net_worth_range : null},
      board_affiliations = ${data.board_affiliations ? JSON.stringify(data.board_affiliations) : null}::jsonb,
      tags = ${data.tags ?? null},
      internal_notes = ${data.internal_notes !== undefined ? data.internal_notes : null},
      dedup_key = ${dedupKey}
    WHERE id = ${contactId} AND workspace_id = ${auth.workspace.id}
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.updated',
    entityType: 'contact',
    entityId: contactId,
    previousValue: { full_name: existing[0].full_name },
    newValue: data,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json(updated[0]);
});

/**
 * DELETE /api/contacts/[contactId] — Delete a contact
 */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { contactId } = await params;
  const db = getDb();

  const deleted = await db`
    DELETE FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${auth.workspace.id}
    RETURNING id, full_name
  `;

  if (deleted.length === 0) {
    throw new NotFoundError('Contact');
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.deleted',
    entityType: 'contact',
    entityId: contactId,
    previousValue: { full_name: deleted[0].full_name },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true, deleted: deleted[0] });
});

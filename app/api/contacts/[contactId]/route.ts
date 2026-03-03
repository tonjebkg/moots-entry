import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole, tryAuthOrWorkspaceFallback } from '@/lib/auth';
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
  const { workspaceId } = await tryAuthOrWorkspaceFallback();

  const { contactId } = await params;
  const db = getDb();

  const contact = await db`
    SELECT * FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${workspaceId}
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
      AND gs.workspace_id = ${workspaceId}
    ORDER BY gs.scored_at DESC
  `;

  // Build full event history with check-in, assignments, and notes
  const eventHistory = await db`
    SELECT
      e.id AS event_id,
      e.title AS event_title,
      e.start_date AS event_date,
      gs.relevance_score,
      gs.score_rationale,
      gs.scored_at,
      ec.source AS checkin_status,
      ec.created_at AS checked_in_at,
      (SELECT u.full_name FROM guest_team_assignments gta
       JOIN users u ON u.id = gta.assigned_to
       WHERE gta.contact_id = ${contactId} AND gta.event_id = e.id
       LIMIT 1
      ) AS assigned_to_name
    FROM events e
    LEFT JOIN guest_scores gs ON gs.event_id = e.id AND gs.contact_id = ${contactId}
    LEFT JOIN event_checkins ec ON ec.event_id = e.id AND ec.contact_id = ${contactId}
    WHERE (gs.contact_id IS NOT NULL OR ec.contact_id IS NOT NULL)
      AND e.id IN (
        SELECT event_id FROM guest_scores WHERE contact_id = ${contactId}
        UNION
        SELECT event_id FROM event_checkins WHERE contact_id = ${contactId}
      )
    ORDER BY e.start_date DESC NULLS LAST
  `;

  // Fetch event notes for each event
  let eventNotes: any[] = [];
  try {
    eventNotes = await db`
      SELECT id, event_id, note_text, author_name, created_at
      FROM event_notes
      WHERE contact_id = ${contactId} AND workspace_id = ${workspaceId}
      ORDER BY created_at DESC
    `;
  } catch {
    // event_notes table may not exist yet
  }

  // Merge notes into event history
  const historyWithNotes = eventHistory.map((ev: any) => ({
    ...ev,
    event_notes: eventNotes.filter((n: any) => n.event_id === ev.event_id),
  }));

  return NextResponse.json({
    ...contact[0],
    scores,
    event_history: historyWithNotes,
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

  // Build SET clauses dynamically — only touch fields present in the request
  // so that omitted fields keep their existing DB values.
  const setClauses: string[] = [];
  const values: unknown[] = [];

  const textFields = [
    'full_name', 'first_name', 'last_name', 'photo_url', 'company', 'title',
    'role_seniority', 'industry', 'linkedin_url', 'twitter_url', 'address',
    'net_worth_range', 'internal_notes', 'guest_role', 'guest_priority',
  ] as const;

  for (const field of textFields) {
    if ((data as Record<string, unknown>)[field] !== undefined) {
      setClauses.push(`${field} = $${values.length + 1}`);
      values.push((data as Record<string, unknown>)[field]);
    }
  }

  if (data.emails !== undefined) {
    setClauses.push(`emails = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(data.emails));
  }
  if (data.phones !== undefined) {
    setClauses.push(`phones = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(data.phones));
  }
  if (data.board_affiliations !== undefined) {
    setClauses.push(`board_affiliations = $${values.length + 1}::jsonb`);
    values.push(JSON.stringify(data.board_affiliations));
  }
  if (data.tags !== undefined) {
    setClauses.push(`tags = $${values.length + 1}`);
    values.push(data.tags);
  }

  // Recompute dedup key if name or emails changed
  const newName = data.full_name ?? existing[0].full_name;
  const newEmails = data.emails ?? existing[0].emails;
  const dedupKey = computeDedupKey(newName, Array.isArray(newEmails) ? newEmails : []);
  setClauses.push(`dedup_key = $${values.length + 1}`);
  values.push(dedupKey);

  // Always bump updated_at
  setClauses.push('updated_at = NOW()');

  const updated = await db.query(
    `UPDATE people_contacts SET ${setClauses.join(', ')}
     WHERE id = $${values.length + 1} AND workspace_id = $${values.length + 2}
     RETURNING *`,
    [...values, contactId, auth.workspace.id],
  );

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

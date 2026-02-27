import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { updateSponsorSchema } from '@/lib/schemas/sponsor';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ eventId: string; sponsorId: string }> };

/**
 * GET /api/events/[eventId]/sponsors/[sponsorId]
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  const { sponsorId } = await context.params;
  const db = getDb();

  const result = await db`
    SELECT id, name, tier, logo_url, website_url, description,
           contact_person, contact_email, goals, promised_seats,
           table_preference, key_attendees, notes, sort_order,
           created_at, updated_at
    FROM event_sponsors
    WHERE id = ${sponsorId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new NotFoundError('Sponsor');
  }

  return NextResponse.json({ sponsor: result[0] });
});

/**
 * PATCH /api/events/[eventId]/sponsors/[sponsorId]
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { sponsorId } = await context.params;
  const validation = await validateRequest(request, updateSponsorSchema);
  if (!validation.success) return validation.error;
  const updates = validation.data;

  const db = getDb();

  // Verify exists
  const current = await db`
    SELECT id, name FROM event_sponsors
    WHERE id = ${sponsorId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;
  if (current.length === 0) {
    throw new NotFoundError('Sponsor');
  }

  // Apply updates individually
  if (updates.name !== undefined) {
    await db`UPDATE event_sponsors SET name = ${updates.name} WHERE id = ${sponsorId}`;
  }
  if (updates.tier !== undefined) {
    await db`UPDATE event_sponsors SET tier = ${updates.tier} WHERE id = ${sponsorId}`;
  }
  if (updates.logo_url !== undefined) {
    await db`UPDATE event_sponsors SET logo_url = ${updates.logo_url} WHERE id = ${sponsorId}`;
  }
  if (updates.website_url !== undefined) {
    await db`UPDATE event_sponsors SET website_url = ${updates.website_url} WHERE id = ${sponsorId}`;
  }
  if (updates.description !== undefined) {
    await db`UPDATE event_sponsors SET description = ${updates.description} WHERE id = ${sponsorId}`;
  }
  if (updates.contact_person !== undefined) {
    await db`UPDATE event_sponsors SET contact_person = ${updates.contact_person} WHERE id = ${sponsorId}`;
  }
  if (updates.contact_email !== undefined) {
    await db`UPDATE event_sponsors SET contact_email = ${updates.contact_email} WHERE id = ${sponsorId}`;
  }
  if (updates.goals !== undefined) {
    const json = JSON.stringify(updates.goals || []);
    await db`UPDATE event_sponsors SET goals = ${json}::jsonb WHERE id = ${sponsorId}`;
  }
  if (updates.promised_seats !== undefined) {
    await db`UPDATE event_sponsors SET promised_seats = ${updates.promised_seats} WHERE id = ${sponsorId}`;
  }
  if (updates.table_preference !== undefined) {
    await db`UPDATE event_sponsors SET table_preference = ${updates.table_preference} WHERE id = ${sponsorId}`;
  }
  if (updates.key_attendees !== undefined) {
    const json = JSON.stringify(updates.key_attendees || []);
    await db`UPDATE event_sponsors SET key_attendees = ${json}::jsonb WHERE id = ${sponsorId}`;
  }
  if (updates.notes !== undefined) {
    await db`UPDATE event_sponsors SET notes = ${updates.notes} WHERE id = ${sponsorId}`;
  }
  if (updates.sort_order !== undefined) {
    await db`UPDATE event_sponsors SET sort_order = ${updates.sort_order} WHERE id = ${sponsorId}`;
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'sponsor.updated',
    entityType: 'event_sponsor',
    entityId: sponsorId,
    previousValue: { name: current[0].name },
    newValue: updates,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true, message: 'Sponsor updated' });
});

/**
 * DELETE /api/events/[eventId]/sponsors/[sponsorId]
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { sponsorId } = await context.params;
  const db = getDb();

  const current = await db`
    SELECT id, name FROM event_sponsors
    WHERE id = ${sponsorId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;
  if (current.length === 0) {
    throw new NotFoundError('Sponsor');
  }

  await db`DELETE FROM event_sponsors WHERE id = ${sponsorId}`;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'sponsor.deleted',
    entityType: 'event_sponsor',
    entityId: sponsorId,
    previousValue: { name: current[0].name },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true, message: 'Sponsor deleted' });
});

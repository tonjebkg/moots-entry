import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { checkInGuest, getCheckinMetrics } from '@/lib/checkin/manager';
import { checkInGuestSchema } from '@/lib/schemas/checkin';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/checkin — Get check-in metrics and list
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);

  const metrics = await getCheckinMetrics(eventIdNum, auth.workspace.id);

  return NextResponse.json(metrics);
});

/**
 * POST /api/events/[eventId]/checkin — Check in a guest
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, checkInGuestSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { contact_id, invitation_id, source, notes } = validation.data;

  // Check for duplicate check-in
  const db = getDb();
  if (contact_id) {
    const existing = await db`
      SELECT id FROM event_checkins
      WHERE event_id = ${eventIdNum} AND contact_id = ${contact_id}
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Guest already checked in', checkin_id: existing[0].id },
        { status: 409 }
      );
    }
  }

  const checkin = await checkInGuest({
    eventId: eventIdNum,
    workspaceId: auth.workspace.id,
    contactId: contact_id,
    invitationId: invitation_id,
    source: source || 'INVITATION',
    checkedInBy: auth.user.id,
    notes,
  });

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'checkin.guest_checked_in',
    entityType: 'event_checkin',
    entityId: checkin.id,
    newValue: { event_id: eventIdNum, source, contact_id, invitation_id },
  });

  return NextResponse.json(checkin, { status: 201 });
});

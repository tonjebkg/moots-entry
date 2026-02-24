import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getSeatingAssignments, applySeatingAssignment } from '@/lib/seating/optimizer';
import { assignTableSchema } from '@/lib/schemas/seating';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/seating — Get current seating assignments
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);

  const assignments = await getSeatingAssignments(eventIdNum, auth.workspace.id);

  return NextResponse.json({ assignments });
});

/**
 * POST /api/events/[eventId]/seating — Assign a guest to a table
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, assignTableSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { contact_id, table_number, seat_number } = validation.data;

  await applySeatingAssignment(eventIdNum, auth.workspace.id, contact_id, table_number, seat_number);

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'seating.assign_table',
    entityType: 'campaign_invitation',
    entityId: contact_id,
    newValue: { event_id: eventIdNum, table_number, seat_number },
  });

  return NextResponse.json({ success: true, table_number, seat_number });
});

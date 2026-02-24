import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { onboardWalkIn } from '@/lib/checkin/manager';
import { walkInSchema } from '@/lib/schemas/checkin';
import { sendWalkInWelcomeEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * POST /api/events/[eventId]/checkin/walk-in — Onboard a walk-in guest
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, walkInSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);

  const checkin = await onboardWalkIn({
    eventId: eventIdNum,
    workspaceId: auth.workspace.id,
    fullName: validation.data.full_name,
    email: validation.data.email,
    company: validation.data.company,
    title: validation.data.title,
    phone: validation.data.phone,
    checkedInBy: auth.user.id,
    notes: validation.data.notes,
  });

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'checkin.walk_in_onboarded',
    entityType: 'event_checkin',
    entityId: checkin.id,
    newValue: { event_id: eventIdNum, full_name: validation.data.full_name },
  });

  // Send welcome email if email provided
  if (validation.data.email) {
    sendWalkInWelcomeEmail({
      to: validation.data.email,
      recipientName: validation.data.full_name,
      eventTitle: `Event #${eventId}`,
    }).catch(() => {}); // Fire and forget
  }

  return NextResponse.json(checkin, { status: 201 });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { configureFollowUpSchema } from '@/lib/schemas/follow-up';
import { triggerFollowUps } from '@/lib/follow-up/generator';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/follow-up — List follow-up sequences
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const followUps = await db`
    SELECT fu.*,
      pc.full_name AS contact_name,
      pc.emails AS contact_emails,
      pc.company AS contact_company
    FROM follow_up_sequences fu
    JOIN people_contacts pc ON pc.id = fu.contact_id
    WHERE fu.event_id = ${eventIdNum} AND fu.workspace_id = ${auth.workspace.id}
    ORDER BY fu.created_at DESC
  `;

  // Compute summary stats
  const stats = {
    total: followUps.length,
    pending: followUps.filter((f: any) => f.status === 'PENDING').length,
    sent: followUps.filter((f: any) => f.status === 'SENT').length,
    opened: followUps.filter((f: any) => f.status === 'OPENED').length,
    replied: followUps.filter((f: any) => f.status === 'REPLIED').length,
    meeting_booked: followUps.filter((f: any) => f.status === 'MEETING_BOOKED').length,
    failed: followUps.filter((f: any) => f.status === 'FAILED').length,
  };

  return NextResponse.json({ follow_ups: followUps, stats });
});

/**
 * POST /api/events/[eventId]/follow-up — Trigger follow-ups
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const validation = await validateRequest(request, configureFollowUpSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const d = validation.data;

  const result = await triggerFollowUps(
    eventIdNum,
    auth.workspace.id,
    d.contact_ids,
    { subject: d.subject_template, content: d.content_template },
    d.auto_generate
  );

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'follow_up.triggered',
    entityType: 'follow_up_sequence',
    metadata: { event_id: eventIdNum, ...result },
  });

  return NextResponse.json(result, { status: 201 });
});

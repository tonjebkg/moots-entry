import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { updateFollowUpStatusSchema } from '@/lib/schemas/follow-up';
import { sendFollowUpEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/follow-up/[followUpId]
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { followUpId } = await context.params;
  const db = getDb();

  const result = await db`
    SELECT fu.*, pc.full_name AS contact_name, pc.emails AS contact_emails, pc.company AS contact_company
    FROM follow_up_sequences fu
    JOIN people_contacts pc ON pc.id = fu.contact_id
    WHERE fu.id = ${followUpId} AND fu.workspace_id = ${auth.workspace.id}
  `;

  if (result.length === 0) throw new NotFoundError('Follow-up');

  return NextResponse.json(result[0]);
});

/**
 * PATCH /api/events/[eventId]/follow-up/[followUpId] — Update status or send
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { followUpId } = await context.params;
  const validation = await validateRequest(request, updateFollowUpStatusSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const { status } = validation.data;

  const existing = await db`
    SELECT fu.*, pc.full_name AS contact_name, pc.emails AS contact_emails
    FROM follow_up_sequences fu
    JOIN people_contacts pc ON pc.id = fu.contact_id
    WHERE fu.id = ${followUpId} AND fu.workspace_id = ${auth.workspace.id}
  `;

  if (existing.length === 0) throw new NotFoundError('Follow-up');

  const followUp = existing[0];

  // If transitioning to SENT, actually send the email
  if (status === 'SENT' && followUp.status === 'PENDING') {
    const email = followUp.contact_emails?.[0];
    if (email) {
      const events = await db`SELECT title FROM events WHERE id = ${followUp.event_id}`;
      const eventTitle = events[0]?.title || 'Event';

      const emailResult = await sendFollowUpEmail({
        to: email,
        recipientName: followUp.contact_name,
        subject: followUp.subject,
        content: followUp.content,
        eventTitle,
      });

      if (emailResult.success) {
        await db`
          UPDATE follow_up_sequences SET
            status = 'SENT'::follow_up_status,
            sent_at = NOW(),
            email_service_id = ${emailResult.emailServiceId || null}
          WHERE id = ${followUpId}
          RETURNING *
        `;
      } else {
        await db`
          UPDATE follow_up_sequences SET status = 'FAILED'::follow_up_status
          WHERE id = ${followUpId}
        `;
        return NextResponse.json({ error: 'Email sending failed', details: emailResult.error }, { status: 500 });
      }
    }
  } else {
    // Update timestamp columns based on status
    const timestampCol = status === 'OPENED' ? 'opened_at'
      : status === 'REPLIED' ? 'replied_at'
      : status === 'MEETING_BOOKED' ? 'meeting_booked_at'
      : null;

    if (timestampCol) {
      await db`
        UPDATE follow_up_sequences SET
          status = ${status}::follow_up_status,
          ${db.unsafe(`${timestampCol} = NOW()`)}
        WHERE id = ${followUpId}
      `;
    } else {
      await db`
        UPDATE follow_up_sequences SET status = ${status}::follow_up_status
        WHERE id = ${followUpId}
      `;
    }
  }

  const result = await db`SELECT * FROM follow_up_sequences WHERE id = ${followUpId}`;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'follow_up.status_updated',
    entityType: 'follow_up_sequence',
    entityId: followUpId,
    previousValue: { status: followUp.status },
    newValue: { status },
  });

  return NextResponse.json(result[0]);
});

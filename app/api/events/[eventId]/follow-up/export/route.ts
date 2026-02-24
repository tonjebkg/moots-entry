import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/follow-up/export — Download follow-ups as CSV
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const followUps = await db`
    SELECT fu.status, fu.subject, fu.sent_at, fu.opened_at, fu.replied_at, fu.meeting_booked_at,
      pc.full_name AS contact_name, pc.emails AS contact_emails, pc.company AS contact_company
    FROM follow_up_sequences fu
    JOIN people_contacts pc ON pc.id = fu.contact_id
    WHERE fu.event_id = ${eventIdNum} AND fu.workspace_id = ${auth.workspace.id}
    ORDER BY pc.full_name
  `;

  // Build CSV
  const headers = ['Name', 'Email', 'Company', 'Status', 'Subject', 'Sent At', 'Opened At', 'Replied At', 'Meeting Booked At'];
  const rows = followUps.map((fu: any) => [
    fu.contact_name,
    fu.contact_emails?.[0] || '',
    fu.contact_company || '',
    fu.status,
    `"${(fu.subject || '').replace(/"/g, '""')}"`,
    fu.sent_at || '',
    fu.opened_at || '',
    fu.replied_at || '',
    fu.meeting_booked_at || '',
  ]);

  const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="follow-up-export-event-${eventId}.csv"`,
    },
  });
});

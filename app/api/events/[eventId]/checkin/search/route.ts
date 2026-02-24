import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/checkin/search?q=... — Search guests for check-in
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const q = request.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const db = getDb();
  const searchPattern = `%${q}%`;

  // Search invitations for this event
  const results = await db`
    SELECT
      ci.id AS invitation_id,
      ci.first_name,
      ci.last_name,
      ci.email,
      ci.company,
      ci.title,
      ci.status,
      ci.checked_in,
      ci.checked_in_at,
      ci.contact_id,
      ec.id AS checkin_id
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    LEFT JOIN event_checkins ec ON ec.invitation_id = ci.id AND ec.event_id = ${eventIdNum}
    WHERE ic.event_id = ${eventIdNum}
      AND (
        ci.first_name ILIKE ${searchPattern}
        OR ci.last_name ILIKE ${searchPattern}
        OR ci.email ILIKE ${searchPattern}
        OR ci.company ILIKE ${searchPattern}
        OR CONCAT(ci.first_name, ' ', ci.last_name) ILIKE ${searchPattern}
      )
    ORDER BY ci.last_name, ci.first_name
    LIMIT 20
  `;

  return NextResponse.json({ results });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/checkin/search?q=... — Search guests for check-in
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const q = request.nextUrl.searchParams.get('q')?.trim();

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const db = getDb();
  const searchPattern = `%${q}%`;

  // Search invitations for this event, joining contacts for name/company details
  const results = await db`
    SELECT
      ci.id AS invitation_id,
      COALESCE(pc.first_name, SPLIT_PART(ci.full_name, ' ', 1)) AS first_name,
      COALESCE(pc.last_name, NULLIF(SUBSTRING(ci.full_name FROM POSITION(' ' IN ci.full_name) + 1), '')) AS last_name,
      ci.email,
      pc.company,
      pc.title,
      ci.status,
      COALESCE(ci.checked_in, FALSE) AS checked_in,
      ci.checked_in_at,
      ci.contact_id,
      ec.id AS checkin_id
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    LEFT JOIN people_contacts pc ON pc.id = ci.contact_id
    LEFT JOIN event_checkins ec ON ec.invitation_id = ci.id AND ec.event_id = ${eventIdNum}
    WHERE ic.event_id = ${eventIdNum}
      AND (
        ci.full_name ILIKE ${searchPattern}
        OR ci.email ILIKE ${searchPattern}
        OR pc.company ILIKE ${searchPattern}
        OR pc.first_name ILIKE ${searchPattern}
        OR pc.last_name ILIKE ${searchPattern}
      )
    ORDER BY ci.full_name
    LIMIT 20
  `;

  return NextResponse.json({ results });
});

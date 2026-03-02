import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateCheckinToken } from '@/lib/checkin-token';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/door/[token]/search?q=... — Search guests from Door View
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { token } = await context.params;

  const validated = await validateCheckinToken(token);
  if (!validated) {
    return NextResponse.json(
      { error: 'Invalid or expired check-in link' },
      { status: 401 }
    );
  }

  const q = request.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const db = getDb();
  const searchPattern = `%${q}%`;

  const results = await db`
    SELECT
      ci.id AS invitation_id,
      ci.full_name,
      ci.email,
      ci.contact_id,
      pc.company,
      pc.title,
      ci.status,
      ci.table_assignment,
      COALESCE(ci.checked_in, FALSE) AS checked_in,
      ci.checked_in_at,
      ec.id AS checkin_id
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    LEFT JOIN people_contacts pc ON pc.id = ci.contact_id
    LEFT JOIN event_checkins ec ON ec.invitation_id = ci.id AND ec.event_id = ${validated.event_id}
    WHERE ic.event_id = ${validated.event_id}
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

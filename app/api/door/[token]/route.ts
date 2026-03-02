import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateCheckinToken } from '@/lib/checkin-token';
import { getCheckinMetrics } from '@/lib/checkin/manager';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/door/[token] — Get event info + check-in data for Door View
 * No session required — validated via checkin token.
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: any) => {
  const { token } = await context.params;

  const validated = await validateCheckinToken(token);
  if (!validated) {
    return NextResponse.json(
      { error: 'Invalid or expired check-in link' },
      { status: 401 }
    );
  }

  const db = getDb();

  // Fetch event info
  const events = await db`
    SELECT id, title, start_date, end_date, location, seating_format, tables_config
    FROM events
    WHERE id = ${validated.event_id} AND workspace_id = ${validated.workspace_id}
  `;

  if (events.length === 0) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const event = events[0];

  // Reuse the standard metrics fetcher
  const metrics = await getCheckinMetrics(validated.event_id, validated.workspace_id);

  return NextResponse.json({
    event: {
      id: event.id,
      title: event.title,
      start_date: event.start_date,
      end_date: event.end_date,
      location: event.location,
      seating_format: event.seating_format,
      tables_config: event.tables_config,
    },
    metrics,
    has_pin: !!validated.pin_code,
  });
});

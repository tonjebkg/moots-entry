import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withErrorHandling } from '@/lib/with-error-handling';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

/**
 * GET /api/events/[eventId]/capacity-status
 * Get event capacity statistics
 *
 * Returns:
 * - total_capacity: Maximum number of attendees
 * - seats_filled: Count of ACCEPTED invitations
 * - seats_remaining: Remaining capacity
 * - over_capacity: Boolean indicating if over capacity
 * - seating_format: Event seating format
 * - tables: Array of table statistics (if SEATED)
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
    const { eventId } = await params;

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);

    // Get database client
    const db = getDb();

    // Get event capacity settings
    const eventResult = await db`
      SELECT
        id,
        title,
        total_capacity,
        seating_format,
        tables_config
      FROM events
      WHERE id = ${eventIdNum}
      LIMIT 1
    `;

    if (!eventResult || eventResult.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const event = eventResult[0];

    // Count accepted invitations (seats filled)
    // This includes invitations from all campaigns for this event
    const countResult = await db`
      SELECT COUNT(*) as count
      FROM campaign_invitations
      WHERE event_id = ${eventIdNum}
        AND status = 'ACCEPTED'
    `;

    const seatsFilled = Number(countResult[0]?.count || 0);
    const totalCapacity = event.total_capacity || 0;
    const seatsRemaining = Math.max(0, totalCapacity - seatsFilled);
    const overCapacity = seatsFilled > totalCapacity;

    // Calculate table statistics if SEATED format
    let tables = null;
    if (event.seating_format === 'SEATED' && event.tables_config) {
      const tablesConfig = event.tables_config as {
        tables: Array<{ number: number; seats: number }>;
      };

      // Get table assignments count
      const tableAssignmentsResult = await db`
        SELECT
          table_assignment,
          COUNT(*) as filled
        FROM campaign_invitations
        WHERE event_id = ${eventIdNum}
          AND status = 'ACCEPTED'
          AND table_assignment IS NOT NULL
        GROUP BY table_assignment
      `;

      const assignmentMap = new Map(
        tableAssignmentsResult.map((row) => [row.table_assignment, Number(row.filled)])
      );

      tables = tablesConfig.tables.map((table) => ({
        number: table.number,
        seats: table.seats,
        filled: assignmentMap.get(table.number) || 0,
        remaining: Math.max(0, table.seats - (assignmentMap.get(table.number) || 0)),
      }));
    }

    return NextResponse.json({
      total_capacity: totalCapacity,
      seats_filled: seatsFilled,
      seats_remaining: seatsRemaining,
      over_capacity: overCapacity,
      seating_format: event.seating_format,
      tables,
    });
  }
);

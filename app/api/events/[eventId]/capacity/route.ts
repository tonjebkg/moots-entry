import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { z } from 'zod';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

// Seating format enum
const seatingFormatSchema = z.enum(['STANDING', 'SEATED', 'MIXED']);

// Table configuration schema
const tableConfigSchema = z.object({
  tables: z.array(
    z.object({
      number: z.number().int().positive(),
      seats: z.number().int().positive(),
    })
  ),
});

// Update capacity schema
const updateCapacitySchema = z.object({
  total_capacity: z.number().int().positive().optional(),
  seating_format: seatingFormatSchema.optional(),
  tables_config: tableConfigSchema.optional(),
});

/**
 * PATCH /api/events/[eventId]/capacity
 * Update event capacity settings
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const { eventId } = await params;

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);

    // Parse and validate request body
    const validation = await validateRequest(req, updateCapacitySchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Validate: if seating_format is SEATED, tables_config should be provided
    if (body.seating_format === 'SEATED' && !body.tables_config) {
      return NextResponse.json(
        { error: 'tables_config is required when seating_format is SEATED' },
        { status: 400 }
      );
    }

    // Get database client
    const db = getDb();

    // Check if event exists
    const event = await db`
      SELECT id, title, total_capacity, seating_format, tables_config
      FROM events
      WHERE id = ${eventIdNum}
      LIMIT 1
    `;

    if (!event || event.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Update event (build query based on what fields are provided)
    let result;

    if (body.total_capacity !== undefined && body.seating_format !== undefined && body.tables_config !== undefined) {
      result = await db`
        UPDATE events
        SET
          total_capacity = ${body.total_capacity},
          seating_format = ${body.seating_format}::seating_format,
          tables_config = ${JSON.stringify(body.tables_config)}::jsonb
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.total_capacity !== undefined && body.seating_format !== undefined) {
      result = await db`
        UPDATE events
        SET
          total_capacity = ${body.total_capacity},
          seating_format = ${body.seating_format}::seating_format
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.total_capacity !== undefined && body.tables_config !== undefined) {
      result = await db`
        UPDATE events
        SET
          total_capacity = ${body.total_capacity},
          tables_config = ${JSON.stringify(body.tables_config)}::jsonb
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.seating_format !== undefined && body.tables_config !== undefined) {
      result = await db`
        UPDATE events
        SET
          seating_format = ${body.seating_format}::seating_format,
          tables_config = ${JSON.stringify(body.tables_config)}::jsonb
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.total_capacity !== undefined) {
      result = await db`
        UPDATE events
        SET total_capacity = ${body.total_capacity}
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.seating_format !== undefined) {
      result = await db`
        UPDATE events
        SET seating_format = ${body.seating_format}::seating_format
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else if (body.tables_config !== undefined) {
      result = await db`
        UPDATE events
        SET tables_config = ${JSON.stringify(body.tables_config)}::jsonb
        WHERE id = ${eventIdNum}
        RETURNING id, title, total_capacity, seating_format, tables_config, updated_at
      `;
    } else {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Post-update cleanup: unassign guests from removed tables or over-limit
    if (body.tables_config) {
      const newTableNumbers = body.tables_config.tables.map((t: any) => t.number);
      const newTableSeats: Record<number, number> = {};
      body.tables_config.tables.forEach((t: any) => { newTableSeats[t.number] = t.seats; });

      // Unassign guests from removed tables
      if (newTableNumbers.length > 0) {
        await db`
          UPDATE campaign_invitations
          SET table_assignment = NULL, seat_assignment = NULL
          WHERE event_id = ${eventIdNum}
            AND table_assignment IS NOT NULL
            AND table_assignment != ALL(${newTableNumbers}::int[])
        `;
      }

      // Unassign excess guests from tables that shrunk
      for (const [tableNum, maxSeats] of Object.entries(newTableSeats)) {
        const currentAssignments = await db`
          SELECT id FROM campaign_invitations
          WHERE event_id = ${eventIdNum} AND table_assignment = ${Number(tableNum)}
          ORDER BY id
        `;
        if (currentAssignments.length > maxSeats) {
          const idsToRemove = currentAssignments.slice(maxSeats).map((r: any) => r.id);
          if (idsToRemove.length > 0) {
            await db`
              UPDATE campaign_invitations
              SET table_assignment = NULL, seat_assignment = NULL
              WHERE id = ANY(${idsToRemove}::uuid[])
            `;
          }
        }
      }
    }

    return NextResponse.json({
      event: result[0],
      message: 'Event capacity updated successfully',
    });
  }
);

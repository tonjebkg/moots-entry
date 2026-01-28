import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Query event from Neon
    const result = await db`
      SELECT
        id,
        title,
        location,
        start_date,
        end_date,
        timezone,
        image_url,
        event_url,
        hosts,
        is_private,
        approve_mode,
        status,
        created_at,
        updated_at
      FROM events
      WHERE id = ${Number(eventId)}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = result[0];

    // Map Neon schema to dashboard-expected format
    // (Dashboard expects Supabase field names for backward compatibility)
    const mappedEvent = {
      id: event.id.toString(),
      name: event.title, // title → name
      city: event.location?.city || null, // extract city from location jsonb
      starts_at: event.start_date, // start_date → starts_at
      timezone: event.timezone,
      capacity: null, // Not in Neon schema yet (Phase 1)
      image_url: event.image_url,
      event_url: event.event_url,
      hosts: event.hosts || [],
      edit_token: null, // Not in Neon schema (auth not implemented in Phase 1)
      // Additional fields for context
      end_date: event.end_date,
      is_private: event.is_private,
      approve_mode: event.approve_mode,
      status: event.status,
    };

    return NextResponse.json(mappedEvent);
  } catch (err: any) {
    console.error(`[GET /api/events/${(await params).eventId}] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

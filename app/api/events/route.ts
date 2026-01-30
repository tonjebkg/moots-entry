import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events
 * List all events (dashboard mode only)
 * Returns events with both Neon schema fields and legacy field names for backward compatibility
 */
export async function GET(_req: Request) {
  try {
    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Query all events from Neon
    const events = await db`
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
        sponsors,
        is_private,
        approve_mode,
        status,
        created_at,
        updated_at
      FROM events
      ORDER BY start_date DESC
    `;

    // Map Neon schema to include both new and legacy field names
    const mappedEvents = events.map(event => ({
      // Neon fields (new schema)
      id: event.id,
      title: event.title,
      location: event.location, // JSONB object
      start_date: event.start_date,
      end_date: event.end_date,
      timezone: event.timezone,
      image_url: event.image_url,
      event_url: event.event_url,
      hosts: event.hosts || [],
      sponsors: event.sponsors || [],
      is_private: event.is_private,
      approve_mode: event.approve_mode,
      status: event.status,
      created_at: event.created_at,
      updated_at: event.updated_at,
      // Legacy fields for backward compatibility
      name: event.title, // title → name
      city: event.location?.city || null, // extract city from location jsonb
      starts_at: event.start_date, // start_date → starts_at
    }));

    return NextResponse.json({
      events: mappedEvents,
      total: events.length,
    });
  } catch (err: any) {
    console.error('[GET /api/events] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // ✅ IMPORTANT
export const revalidate = 0;            // ✅ IMPORTANT

export async function GET(_req: Request) {
  try {
    const db = getDb();

    // Cast JSONB to text to prevent automatic parsing/filtering
    const events = await db`
      SELECT
        id,
        title,
        location::text as location_raw,
        start_date,
        end_date,
        timezone,
        image_url,
        event_url,
        hosts::text as hosts_raw,
        sponsors::text as sponsors_raw,
        is_private,
        approve_mode,
        status,
        created_at,
        updated_at
      FROM events
      ORDER BY start_date DESC
    `;

    const mappedEvents = events.map(event => {
      // Manually parse JSONB text to preserve all fields and array order
      const location = event.location_raw ? JSON.parse(event.location_raw) : null;
      const hosts = event.hosts_raw ? JSON.parse(event.hosts_raw) : [];
      const sponsors = event.sponsors_raw ? JSON.parse(event.sponsors_raw) : [];

      return {
        id: event.id,
        title: event.title,
        location: location,
        start_date: event.start_date,
        end_date: event.end_date,
        timezone: event.timezone,
        image_url: event.image_url,
        event_url: event.event_url,
        hosts: hosts,
        sponsors: sponsors,
        is_private: event.is_private,
        approve_mode: event.approve_mode,
        status: event.status,
        created_at: event.created_at,
        updated_at: event.updated_at,

        // legacy
        name: event.title,
        city: location?.city || null,
        starts_at: event.start_date,
      };
    });

    return NextResponse.json(
      { events: mappedEvents, total: events.length },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0', // ✅ IMPORTANT
        },
      }
    );
  } catch (err: any) {
    console.error('[GET /api/events] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}


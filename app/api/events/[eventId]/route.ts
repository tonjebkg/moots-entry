import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    // Cast JSONB to text to prevent automatic parsing/filtering
    const result = await db`
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

    // Manually parse JSONB text to preserve all fields and array order
    const location = event.location_raw ? JSON.parse(event.location_raw) : null;
    const hosts = event.hosts_raw ? JSON.parse(event.hosts_raw) : [];
    const sponsors = event.sponsors_raw ? JSON.parse(event.sponsors_raw) : [];

    // DEBUG: Log what was read from DB
    console.log('[GET EVENT] Event ID:', event.id);
    console.log('[GET EVENT] Sponsors from DB (raw):', event.sponsors_raw);
    console.log('[GET EVENT] Sponsors from DB (parsed):', JSON.stringify(sponsors, null, 2));
    console.log('[GET EVENT] Hosts from DB (raw):', event.hosts_raw);
    console.log('[GET EVENT] Hosts from DB (parsed):', JSON.stringify(hosts, null, 2));

    // Map Neon schema to dashboard-expected format
    // (Dashboard expects both Neon and legacy field names for backward compatibility)
    const mappedEvent = {
      // Neon fields (new schema)
      id: event.id,
      title: event.title,
      location: location, // JSONB object
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
      // Legacy fields for backward compatibility
      name: event.title, // title → name
      city: location?.city || null, // extract city from location jsonb
      starts_at: event.start_date, // start_date → starts_at
      edit_token: null, // Not in Neon schema (auth not implemented)
    };

    return NextResponse.json(mappedEvent, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err: any) {
    console.error(`[GET /api/events/${(await params).eventId}] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

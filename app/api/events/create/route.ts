import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';

type Host = { name: string; url?: string | null };

type CreateEventPayload = {
  event: {
    title: string;
    city?: string | null;
    start_date: string; // ISO 8601 timestamp
    end_date?: string | null; // ISO 8601 timestamp
    timezone?: string | null;
    event_url?: string | null;
    image_url?: string | null;
    hosts?: Host[];
  };
};

export async function POST(req: Request) {
  try {
    const body: CreateEventPayload = await req.json();
    const { event } = body;

    // Validate required fields
    if (!event.title || !event.start_date) {
      return NextResponse.json(
        { error: 'title and start_date are required' },
        { status: 400 }
      );
    }

    // Map city to location jsonb
    const location = event.city ? { city: event.city } : null;

    // Default end_date to 3 hours after start_date if not provided
    const startDate = new Date(event.start_date);
    const endDate = event.end_date
      ? new Date(event.end_date)
      : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    // Prepare jsonb fields
    const hostsJson = event.hosts && event.hosts.length > 0
      ? JSON.stringify(event.hosts)
      : null;
    const locationJson = location ? JSON.stringify(location) : null;

    // Insert event into Neon
    const result = await db`
      INSERT INTO events (
        title,
        hosts,
        location,
        start_date,
        end_date,
        timezone,
        event_url,
        image_url,
        is_private,
        approve_mode,
        status
      ) VALUES (
        ${event.title},
        ${hostsJson}::jsonb,
        ${locationJson}::jsonb,
        ${startDate.toISOString()},
        ${endDate.toISOString()},
        ${event.timezone || 'UTC'},
        ${event.event_url || null},
        ${event.image_url || null},
        ${false},
        ${'MANUAL'},
        ${'DRAFT'}
      ) RETURNING id
    `;

    if (!result || result.length === 0) {
      throw new Error('Failed to create event - no ID returned');
    }

    const eventId = result[0].id;

    return NextResponse.json({
      event_id: eventId,
      message: 'Event created successfully'
    });

  } catch (err: any) {
    console.error('[POST /api/events/create] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}

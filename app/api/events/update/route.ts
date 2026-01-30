import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

type Host = { name: string; url?: string | null };
type Sponsor = {
  title: string;
  subtitle?: string;
  logo_url?: string;
  description?: string;
};
type Location = {
  venue_name?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  country?: string;
};

type UpdateEventPayload = {
  id: string | number;
  // Neon schema fields
  title?: string;
  location?: Location | string | null; // Support both object and legacy string
  start_date?: string;
  end_date?: string;
  timezone?: string;
  event_url?: string | null;
  image_url?: string | null;
  hosts?: Host[];
  sponsors?: Sponsor[];
  is_private?: boolean;
  approve_mode?: 'MANUAL' | 'AUTO';
  status?: 'DRAFT' | 'PUBLISHED' | 'COMPLETE' | 'CANCELLED';
  // Legacy field names (backward compatibility)
  name?: string; // Maps to title
  city?: string; // Maps to location.city
  starts_at?: string; // Maps to start_date
};

/**
 * PATCH /api/events/update
 * Updates an existing event with all Retool-compatible fields
 * Supports both Neon schema and legacy field names for backward compatibility
 */
export async function PATCH(req: Request) {
  try {
    const body: UpdateEventPayload = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing event ID' },
        { status: 400 }
      );
    }

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Map legacy field names to Neon schema
    const title = fields.title ?? fields.name;
    const start_date = fields.start_date ?? fields.starts_at;

    // Handle location mapping:
    // - If location is provided as object, use it
    // - If city is provided (legacy), map to { city: "..." }
    // - If location is string (legacy), map to { city: location }
    let location = fields.location;
    if (typeof location === 'string') {
      location = { city: location };
    } else if (fields.city && !location) {
      location = { city: fields.city };
    }

    const now = new Date().toISOString();
    const eventId = Number(id);

    // Update fields individually (Neon's tagged template syntax)
    if (title !== undefined) {
      await db`UPDATE events SET title = ${title}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (location !== undefined) {
      const locationJson = location ? JSON.stringify(location) : null;
      await db`UPDATE events SET location = ${locationJson}::jsonb, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (start_date !== undefined) {
      await db`UPDATE events SET start_date = ${start_date}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.end_date !== undefined) {
      await db`UPDATE events SET end_date = ${fields.end_date}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.timezone !== undefined) {
      await db`UPDATE events SET timezone = ${fields.timezone}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.event_url !== undefined) {
      await db`UPDATE events SET event_url = ${fields.event_url}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.image_url !== undefined) {
      await db`UPDATE events SET image_url = ${fields.image_url}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.hosts !== undefined) {
      const hostsJson = fields.hosts ? JSON.stringify(fields.hosts) : null;
      await db`UPDATE events SET hosts = ${hostsJson}::jsonb, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.sponsors !== undefined) {
      const sponsorsJson = fields.sponsors ? JSON.stringify(fields.sponsors) : null;
      await db`UPDATE events SET sponsors = ${sponsorsJson}::jsonb, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.is_private !== undefined) {
      await db`UPDATE events SET is_private = ${fields.is_private}, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.approve_mode !== undefined) {
      await db`UPDATE events SET approve_mode = ${fields.approve_mode}::approvemode, updated_at = ${now} WHERE id = ${eventId}`;
    }
    if (fields.status !== undefined) {
      await db`UPDATE events SET status = ${fields.status}::eventstatus, updated_at = ${now} WHERE id = ${eventId}`;
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully'
    });

  } catch (err: any) {
    console.error('[PATCH /api/events/update] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events/update
 * (Alias for backward compatibility — accepts the same body as PATCH)
 */
export async function POST(req: Request) {
  return PATCH(req);
}

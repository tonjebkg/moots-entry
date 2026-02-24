import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type Host = { name: string; url?: string | null };
type Sponsor = {
  title: string;
  subtitle?: string | null;
  url?: string | null;
  logo_url?: string | null;
  description?: string | null;
};
type Location = {
  venue_name?: string;
  street_address?: string;
  city?: string;
  state_province?: string;
  country?: string;
};

type CreateEventPayload = {
  event: {
    title: string;
    location?: Location | string | null; // Support both object and legacy string
    start_date: string; // ISO 8601 timestamp
    end_date?: string | null; // ISO 8601 timestamp
    timezone?: string | null;
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
};

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    const body: CreateEventPayload = await req.json();
    const { event } = body;

    // DEBUG: Log incoming sponsors
    console.log('[CREATE] Received sponsors:', JSON.stringify(event.sponsors, null, 2));

    // Verify url field is present (even if null)
    if (event.sponsors) {
      event.sponsors.forEach((s, i) => {
        if (!('url' in s)) {
          console.error(`[CREATE] ⚠️ Sponsor ${i} missing 'url' field:`, s);
        }
      });
    }

    // Map legacy field names to Neon schema
    const title = event.title ?? event.name;
    const start_date = event.start_date ?? event.starts_at;

    // Validate required fields
    if (!title || !start_date) {
      return NextResponse.json(
        { error: 'title and start_date are required' },
        { status: 400 }
      );
    }

    // Handle location mapping:
    // - If location is provided as object, use it
    // - If city is provided (legacy), map to { city: "..." }
    // - If location is string (legacy), map to { city: location }
    let location = event.location;
    if (typeof location === 'string') {
      location = { city: location };
    } else if (event.city && !location) {
      location = { city: event.city };
    }

    // Default end_date to 3 hours after start_date if not provided
    const startDate = new Date(start_date);
    const endDate = event.end_date
      ? new Date(event.end_date)
      : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    // Prepare jsonb fields
    const hostsJson = event.hosts && event.hosts.length > 0
      ? JSON.stringify(event.hosts)
      : null;
    const sponsorsJson = event.sponsors && event.sponsors.length > 0
      ? JSON.stringify(event.sponsors)
      : null;
    const locationJson = location ? JSON.stringify(location) : null;

    // DEBUG: Log what will be written to DB
    console.log('[CREATE] Sponsors JSON for DB:', sponsorsJson);
    console.log('[CREATE] Hosts JSON for DB:', hostsJson);

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Validate approve_mode and status at application layer
    const approveMode = event.approve_mode || 'MANUAL';
    if (approveMode !== 'MANUAL' && approveMode !== 'AUTO') {
      throw new Error('approve_mode must be MANUAL or AUTO');
    }

    const status = event.status || 'DRAFT';
    const validStatuses = ['DRAFT', 'PUBLISHED', 'COMPLETE', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error('status must be DRAFT, PUBLISHED, COMPLETE, or CANCELLED');
    }

    // Insert event into Neon
    const result = await db`
      INSERT INTO events (
        title,
        hosts,
        sponsors,
        location,
        start_date,
        end_date,
        timezone,
        event_url,
        image_url,
        is_private,
        approve_mode,
        status,
        workspace_id
      ) VALUES (
        ${title},
        ${hostsJson}::jsonb,
        ${sponsorsJson}::jsonb,
        ${locationJson}::jsonb,
        ${startDate.toISOString()},
        ${endDate.toISOString()},
        ${event.timezone || 'UTC'},
        ${event.event_url || null},
        ${event.image_url || null},
        ${event.is_private ?? false},
        ${approveMode},
        ${status},
        ${auth.workspace.id}
      ) RETURNING id
    `;

    if (!result || result.length === 0) {
      throw new Error('Failed to create event - no ID returned');
    }

    const eventId = result[0].id;

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'event.created',
      entityType: 'event',
      entityId: String(eventId),
      newValue: { title, status },
      ipAddress: getClientIdentifier(req),
    });

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

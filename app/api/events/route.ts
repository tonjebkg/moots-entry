import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // ✅ IMPORTANT
export const revalidate = 0;            // ✅ IMPORTANT

export async function GET(_req: Request) {
  try {
    const db = getDb();
    const session = await getSession();
    const workspaceId = session?.workspace?.id;

    // Cast JSONB to text to prevent automatic parsing/filtering
    // Filter by workspace_id if authenticated; show all if no workspace (backward compat)
    const events = workspaceId
      ? await db`
          SELECT
            e.id, e.title, e.location::text as location_raw, e.start_date, e.end_date, e.timezone,
            e.image_url, e.event_url, e.hosts::text as hosts_raw, e.sponsors::text as sponsors_raw,
            e.is_private, e.approve_mode, e.status, e.total_capacity, e.created_at, e.updated_at,
            COALESCE(ci.total_count, 0) AS invited_count,
            COALESCE(ci.accepted_count, 0) AS confirmed_count,
            COALESCE(ci.pending_count, 0) AS pending_count
          FROM events e
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted_count,
              COUNT(*) FILTER (WHERE status IN ('CONSIDERING','INVITED'))::int AS pending_count
            FROM campaign_invitations WHERE event_id = e.id
          ) ci ON true
          WHERE e.workspace_id = ${workspaceId} OR e.workspace_id IS NULL
          ORDER BY e.start_date DESC
        `
      : await db`
          SELECT
            e.id, e.title, e.location::text as location_raw, e.start_date, e.end_date, e.timezone,
            e.image_url, e.event_url, e.hosts::text as hosts_raw, e.sponsors::text as sponsors_raw,
            e.is_private, e.approve_mode, e.status, e.total_capacity, e.created_at, e.updated_at,
            COALESCE(ci.total_count, 0) AS invited_count,
            COALESCE(ci.accepted_count, 0) AS confirmed_count,
            COALESCE(ci.pending_count, 0) AS pending_count
          FROM events e
          LEFT JOIN LATERAL (
            SELECT
              COUNT(*)::int AS total_count,
              COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted_count,
              COUNT(*) FILTER (WHERE status IN ('CONSIDERING','INVITED'))::int AS pending_count
            FROM campaign_invitations WHERE event_id = e.id
          ) ci ON true
          ORDER BY e.start_date DESC
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
        total_capacity: event.total_capacity ?? null,
        invited_count: event.invited_count ?? 0,
        confirmed_count: event.confirmed_count ?? 0,
        pending_count: event.pending_count ?? 0,

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


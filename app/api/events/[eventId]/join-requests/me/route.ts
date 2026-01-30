import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

/**
 * GET /api/events/[eventId]/join-requests/me?owner_id=xxx
 * Fetch a single join request for the specified user (mobile app)
 * No auth required - read-only access to own join request status
 */
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;

    // Validate eventId
    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    // Extract owner_id from query params
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('owner_id');

    // Validate owner_id
    if (!ownerId || ownerId.trim() === '') {
      return NextResponse.json(
        { error: 'owner_id is required' },
        { status: 400 }
      );
    }

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Query for the specific join request (read-only, no user_profiles join)
    const result = await db`
      SELECT
        id,
        event_id,
        owner_id,
        status,
        plus_ones,
        comments,
        rsvp_contact,
        created_at,
        updated_at
      FROM event_join_requests
      WHERE event_id = ${Number(eventId)}
        AND owner_id = ${ownerId.trim()}
      LIMIT 1
    `;

    // If not found, return 404
    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      );
    }

    // Return the join request
    return NextResponse.json({
      join_request: result[0]
    });

  } catch (err: any) {
    const { eventId } = await params;
    console.error(`[GET /api/events/${eventId}/join-requests/me] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch join request' },
      { status: 500 }
    );
  }
}

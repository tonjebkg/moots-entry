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

    // Query join requests with user profile data
    const joinRequests = await db`
      SELECT
        ejr.id,
        ejr.event_id,
        ejr.owner_id,
        ejr.status,
        ejr.plus_ones,
        ejr.comments,
        ejr.rejection_reason,
        ejr.rsvp_contact,
        ejr.created_at,
        ejr.updated_at,
        up.first_name,
        up.last_name,
        up.emails,
        up.photo_url
      FROM event_join_requests ejr
      LEFT JOIN user_profiles up ON ejr.owner_id = up.owner_id
      WHERE ejr.event_id = ${Number(eventId)}
      ORDER BY ejr.created_at DESC
    `;

    // Calculate counts
    const approved_count = joinRequests.filter(jr => jr.status === 'APPROVED').length;
    const pending_count = joinRequests.filter(jr => jr.status === 'PENDING').length;
    const rejected_count = joinRequests.filter(jr => jr.status === 'REJECTED').length;
    const cancelled_count = joinRequests.filter(jr => jr.status === 'CANCELLED').length;

    // Map to dashboard-friendly format
    const mappedRequests = joinRequests.map(jr => {
      // Extract primary email from emails jsonb array
      const primaryEmail = Array.isArray(jr.emails) && jr.emails.length > 0
        ? jr.emails[0].email
        : jr.rsvp_contact || 'no-email@moots.app';

      // Combine first_name and last_name
      const full_name = [jr.first_name, jr.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || 'Unknown User';

      return {
        id: jr.id,
        event_id: jr.event_id,
        owner_id: jr.owner_id,
        full_name,
        email: primaryEmail,
        status: jr.status, // Keep Neon enum values: PENDING, APPROVED, REJECTED, CANCELLED, DRAFT
        plus_ones: jr.plus_ones ?? 0,
        comments: jr.comments ?? '',
        photo_url: jr.photo_url ?? null,
        created_at: jr.created_at,
        updated_at: jr.updated_at,
      };
    });

    return NextResponse.json({
      join_requests: mappedRequests,
      counts: {
        total: joinRequests.length,
        approved: approved_count,
        pending: pending_count,
        rejected: rejected_count,
        cancelled: cancelled_count,
      },
    });
  } catch (err: any) {
    const { eventId } = await params;
    console.error(`[GET /api/events/${eventId}/join-requests] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch join requests' },
      { status: 500 }
    );
  }
}

type CreateJoinRequestBody = {
  owner_id: string;
  plus_ones?: number;
  comments?: string;
  rsvp_contact?: string;
};

/**
 * POST /api/events/[eventId]/join-requests
 * Create a new join request for an event (mobile app)
 * No auth required - mobile guests can submit join requests
 */
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;

    // Validate eventId
    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const body: CreateJoinRequestBody = await req.json();

    // Validate required fields
    if (!body.owner_id || typeof body.owner_id !== 'string' || body.owner_id.trim() === '') {
      return NextResponse.json(
        { error: 'owner_id is required' },
        { status: 400 }
      );
    }

    // Validate optional fields
    const plusOnes = body.plus_ones !== undefined ? Number(body.plus_ones) : 0;
    if (!Number.isInteger(plusOnes) || plusOnes < 0) {
      return NextResponse.json(
        { error: 'plus_ones must be a non-negative integer' },
        { status: 400 }
      );
    }

    const ownerId = body.owner_id.trim();
    const comments = body.comments?.trim() || null;
    const rsvpContact = body.rsvp_contact?.trim() || null;

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Check for existing join request (idempotency)
    const existing = await db`
      SELECT id, event_id, owner_id, status, plus_ones, comments,
             rsvp_contact, created_at, updated_at
      FROM event_join_requests
      WHERE event_id = ${Number(eventId)}
        AND owner_id = ${ownerId}
      LIMIT 1
    `;

    // If exists, return existing request instead of creating duplicate
    if (existing && existing.length > 0) {
      return NextResponse.json({
        join_request: existing[0],
        message: 'Join request already exists for this user'
      });
    }

    // Insert new join request
    const now = new Date().toISOString();
    const result = await db`
      INSERT INTO event_join_requests (
        event_id,
        owner_id,
        status,
        plus_ones,
        comments,
        rsvp_contact,
        created_at,
        updated_at
      ) VALUES (
        ${Number(eventId)},
        ${ownerId},
        ${'PENDING'}::eventjoinrequeststatus,
        ${plusOnes},
        ${comments},
        ${rsvpContact},
        ${now},
        ${now}
      ) RETURNING id, event_id, owner_id, status, plus_ones, comments,
                  rsvp_contact, created_at, updated_at
    `;

    if (!result || result.length === 0) {
      throw new Error('Failed to create join request - no record returned');
    }

    return NextResponse.json({
      join_request: result[0],
      message: 'Join request created successfully'
    });

  } catch (err: any) {
    const { eventId } = await params;
    console.error(`[POST /api/events/${eventId}/join-requests] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to create join request' },
      { status: 500 }
    );
  }
}

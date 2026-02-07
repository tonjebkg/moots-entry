import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

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

    // GET MUST REMAIN READ-ONLY — no INSERT/UPDATE/event_ids mutation
    // Query join requests with user profile data (one row per owner_id)
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
        ejr.company_website,
        ejr.goals,
        ejr.looking_for,
        ejr.visibility_enabled,
        ejr.notifications_enabled,
        ejr.created_at,
        ejr.updated_at,
        up.first_name,
        up.last_name,
        up.emails,
        up.photo_url
      FROM event_join_requests ejr
      LEFT JOIN user_profiles up ON up.owner_id = ejr.owner_id
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
        company_website: jr.company_website ?? null,
        goals: jr.goals ?? null,
        looking_for: jr.looking_for ?? null,
        visibility_enabled: jr.visibility_enabled ?? true,
        notifications_enabled: jr.notifications_enabled ?? true,
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

    const db = getDb();
    const now = new Date().toISOString();

    // Step 1: Upsert ONE user_profiles row per owner_id.
    // event_ids[] tracks which events this user belongs to.
    // Uses array union to add eventId without duplicates.
    const profileId = crypto.randomUUID();
    const emailsJson = rsvpContact
      ? JSON.stringify([{ email: rsvpContact }])
      : JSON.stringify([]);

    const profileResult = await db`
      INSERT INTO user_profiles (id, owner_id, event_ids, emails, created_at, updated_at)
      VALUES (
        ${profileId}::uuid,
        ${ownerId},
        ARRAY[${Number(eventId)}],
        ${emailsJson}::jsonb,
        ${now},
        ${now}
      )
      ON CONFLICT (owner_id) DO UPDATE SET
        event_ids = (
          SELECT ARRAY(
            SELECT DISTINCT unnest_val
            FROM unnest(
              COALESCE(user_profiles.event_ids, '{}') || ARRAY[${Number(eventId)}]
            ) AS unnest_val
          )
        ),
        emails = EXCLUDED.emails,
        updated_at = EXCLUDED.updated_at
      RETURNING id
    `;

    if (!profileResult || profileResult.length === 0) {
      throw new Error('Failed to upsert user profile');
    }

    // Step 2: Check for existing join request (idempotency)
    const existing = await db`
      SELECT id, event_id, owner_id, status, plus_ones, comments,
             rsvp_contact, created_at, updated_at
      FROM event_join_requests
      WHERE event_id = ${Number(eventId)}
        AND owner_id = ${ownerId}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json({
        join_request: existing[0],
        message: 'Join request already exists for this user'
      });
    }

    // Step 3: Insert new join request
    // user_profile_id is resolved from user_profiles at approval time, not stored here
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
                  rsvp_contact, visibility_enabled, notifications_enabled,
                  created_at, updated_at
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
type UpdatePayload = {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DRAFT';
  plus_ones?: number;
  comments?: string;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { eventId } = await params;
    const url = new URL(req.url);
    const joinRequestId = url.searchParams.get('id');

    if (!joinRequestId) {
      return NextResponse.json(
        { error: 'Join request ID is required' },
        { status: 400 }
      );
    }

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const body: UpdatePayload = await req.json();
    const updates: Record<string, any> = {};

    const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'DRAFT'];
    
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.plus_ones !== undefined) {
      const plusOnes = Number(body.plus_ones);
      if (!Number.isInteger(plusOnes) || plusOnes < 0) {
        return NextResponse.json(
          { error: 'plus_ones must be a non-negative integer' },
          { status: 400 }
        );
      }
      updates.plus_ones = plusOnes;
    }

    if (body.comments !== undefined) {
      updates.comments = body.comments;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    if (updates.status === 'APPROVED') {
      const attendeeId = crypto.randomUUID();

      const joinRequestData = await db`
        SELECT owner_id, event_id
        FROM event_join_requests
        WHERE id = ${joinRequestId}
          AND event_id = ${Number(eventId)}
        LIMIT 1
      `;

      if (!joinRequestData || joinRequestData.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      const { owner_id: ownerId, event_id: eventIdFromDb } = joinRequestData[0];

      // Resolve user_profile_id: one row per owner_id, event membership via event_ids[]
      const profileResult = await db`
        SELECT id
        FROM user_profiles
        WHERE owner_id = ${ownerId}
          AND ${Number(eventId)} = ANY(event_ids)
        LIMIT 1
      `;

      // Defensive assertion: approval is illegal without an event-scoped profile
      if (!profileResult || profileResult.length === 0) {
        return NextResponse.json(
          {
            error: 'Approval failed: no user_profile found with this event in event_ids[]',
            details: `Cannot approve join request ${joinRequestId}: no user_profile exists for owner_id="${ownerId}" with event_id=${eventIdFromDb} in event_ids[]. Profile must exist and include eventId in event_ids[] before approval. Profile is created at RSVP time (POST /api/events/[eventId]/join-requests).`
          },
          { status: 422 }
        );
      }

      const userProfileId = profileResult[0].id;

      const result = await db`
        WITH updated AS (
          UPDATE event_join_requests
          SET
            status = COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus,
            plus_ones = COALESCE(${updates.plus_ones ?? null}, plus_ones),
            comments = CASE WHEN ${updates.comments !== undefined} THEN ${updates.comments ?? null} ELSE comments END,
            approved_at = NOW(),
            updated_at = ${now}
          WHERE id = ${joinRequestId}
            AND event_id = ${Number(eventId)}
          RETURNING *
        ),
        inserted AS (
          INSERT INTO event_attendees (
            id,
            event_id,
            owner_id,
            user_profile_id,
            join_request_id,
            visibility_enabled,
            notifications_enabled,
            created_at,
            updated_at
          )
          SELECT
            ${attendeeId}::uuid,
            event_id,
            owner_id,
            ${userProfileId}::uuid,
            id,
            true,
            true,
            ${now},
            ${now}
          FROM updated
          WHERE NOT EXISTS (
            SELECT 1 FROM event_attendees
            WHERE join_request_id = updated.id
          )
          RETURNING id
        )
        SELECT * FROM updated
      `;

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        join_request: result[0],
        message: 'Join request updated successfully'
      });
    } else {
      const result = await db`
        UPDATE event_join_requests
        SET
          status = COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus,
          plus_ones = COALESCE(${updates.plus_ones ?? null}, plus_ones),
          comments = CASE WHEN ${updates.comments !== undefined} THEN ${updates.comments ?? null} ELSE comments END,
          updated_at = ${now}
        WHERE id = ${joinRequestId}
          AND event_id = ${Number(eventId)}
        RETURNING *
      `;

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        join_request: result[0],
        message: 'Join request updated successfully'
      });
    }
  } catch (err: any) {
    const { eventId } = await params;
    console.error(`[PATCH /api/events/${eventId}/join-requests] Error:`, err);
    return NextResponse.json(
      {
        error: err.message || 'Failed to update join request',
        details: err.detail || err.hint || ''
      },
      { status: 500 }
    );
  }
}

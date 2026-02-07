import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ id: string }>;
};

// Allowed Neon status enum values
const VALID_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'DRAFT'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

type UpdatePayload = {
  status?: ValidStatus;
  plus_ones?: number;
  comments?: string;
};

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Join request ID is required' },
        { status: 400 }
      );
    }

    const body: UpdatePayload = await req.json();
    const updates: Record<string, any> = {};

    // Validate and prepare status update
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    // Validate and prepare plus_ones update
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

    // Prepare comments update
    if (body.comments !== undefined) {
      updates.comments = body.comments;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Always update the updated_at timestamp
    const now = new Date().toISOString();

    // Use CTE to make UPDATE + INSERT atomic when approving
    if (updates.status === 'APPROVED') {
      const attendeeId = crypto.randomUUID();

      // Fetch join request to get owner_id and event_id
      const joinRequestData = await db`
        SELECT owner_id, event_id
        FROM event_join_requests
        WHERE id = ${id}
        LIMIT 1
      `;

      if (!joinRequestData || joinRequestData.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      const { owner_id: ownerId, event_id: eventId } = joinRequestData[0];

      // Resolve user_profile_id from user_profiles (one row per owner_id).
      // event_join_requests does NOT have a user_profile_id column;
      // it is resolved here at approval time from the global profile.
      const profileLookup = await db`
        SELECT id FROM user_profiles
        WHERE owner_id = ${ownerId}
        LIMIT 1
      `;

      if (!profileLookup || profileLookup.length === 0) {
        return NextResponse.json(
          {
            error: 'Approval failed: user_profile missing for this owner_id',
            details: `Cannot approve join request ${id}: no user_profiles row exists for owner_id="${ownerId}". RSVP must create profile first (POST /api/events/[eventId]/join-requests).`
          },
          { status: 422 }
        );
      }

      const userProfileId = profileLookup[0].id;

      // Defensive assertion: event_id must be in user_profiles.event_ids[]
      const eventLinked = await db`
        SELECT 1 FROM user_profiles
        WHERE owner_id = ${ownerId}
          AND ${eventId} = ANY(event_ids)
        LIMIT 1
      `;

      if (!eventLinked || eventLinked.length === 0) {
        return NextResponse.json(
          {
            error: 'Approval failed: event_id not linked in user_profiles.event_ids[]',
            details: `Profile exists for owner_id="${ownerId}" but event_id=${eventId} is not in event_ids[]. RSVP upsert is broken or was bypassed.`
          },
          { status: 422 }
        );
      }

      // Atomic UPDATE + INSERT: set approved_at, materialize attendee with user_profile_id
      const result = await db`
        WITH updated AS (
          UPDATE event_join_requests
          SET
            status = COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus,
            plus_ones = COALESCE(${updates.plus_ones ?? null}, plus_ones),
            comments = CASE WHEN ${updates.comments !== undefined} THEN ${updates.comments ?? null} ELSE comments END,
            approved_at = NOW(),
            updated_at = ${now}
          WHERE id = ${id}
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
        message: 'Join request approved and attendee created successfully',
      });
    } else {
      // Non-APPROVED status updates: simpler UPDATE without attendee materialization
      const result = await db`
        UPDATE event_join_requests
        SET
          status = COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus,
          plus_ones = COALESCE(${updates.plus_ones ?? null}, plus_ones),
          comments = CASE WHEN ${updates.comments !== undefined} THEN ${updates.comments ?? null} ELSE comments END,
          updated_at = ${now}
        WHERE id = ${id}
        RETURNING *
      `;

      if (!result || result.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      const updatedJoinRequest = result[0];

      return NextResponse.json({
        join_request: updatedJoinRequest,
        message: 'Join request updated successfully',
      });
    }
  } catch (err: any) {
    console.error(`[PATCH /api/join-requests/${(await params).id}] Error:`, err);

    const errorMessage = err.message || 'Failed to update join request';
    const errorDetails = err.detail || err.hint || '';

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        summary: 'Database operation failed. Check that all required fields are present.'
      },
      { status: 500 }
    );
  }
}

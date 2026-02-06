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

    // Fix3: If approving, pre-validate that user_profile_id exists
    if (updates.status === 'APPROVED') {
      const preCheck = await db`
        SELECT user_profile_id FROM event_join_requests WHERE id = ${id}
      `;

      if (preCheck.length === 0) {
        return NextResponse.json(
          { error: 'Join request not found' },
          { status: 404 }
        );
      }

      if (preCheck[0].user_profile_id === null) {
        return NextResponse.json(
          {
            error: 'Cannot approve: join request has no user_profile_id. This join request needs investigation.',
            details: 'The user_profile_id is NULL and must be set before approval can proceed.'
          },
          { status: 422 }
        );
      }
    }

    // Always update the updated_at timestamp
    const now = new Date().toISOString();

    // Fix2: Generate UUID for event_attendees.id (no DB default exists)
    const attendeeId = crypto.randomUUID();

    // Fix3: Use CTE to make UPDATE + INSERT atomic in a single query
    // This ensures we don't end up with status=APPROVED but no attendee row
    if (updates.status === 'APPROVED') {
      const result = await db`
        WITH updated AS (
          UPDATE event_join_requests
          SET
            status = COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus,
            plus_ones = COALESCE(${updates.plus_ones ?? null}, plus_ones),
            comments = CASE WHEN ${updates.comments !== undefined} THEN ${updates.comments ?? null} ELSE comments END,
            approved_at = CASE
              WHEN COALESCE(${updates.status || null}::text, status::text)::eventjoinrequeststatus = 'APPROVED'
              THEN NOW()
              ELSE approved_at
            END,
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
            ${attendeeId},
            event_id,
            owner_id,
            user_profile_id,
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

      const updatedJoinRequest = result[0];

      return NextResponse.json({
        join_request: updatedJoinRequest,
        message: 'Join request updated successfully',
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

    // Provide detailed error information for debugging
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

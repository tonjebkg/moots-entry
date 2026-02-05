import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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

    // Always update the updated_at timestamp
    const now = new Date().toISOString();

    // Get database client (lazy-initialized, dashboard-mode only)
    const db = getDb();

    // Build dynamic update query using conditional updates
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

    // If status was changed to APPROVED, materialize attendee in event_attendees
    if (updates.status === 'APPROVED') {
      await db`
        INSERT INTO event_attendees (
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
          ${updatedJoinRequest.event_id},
          ${updatedJoinRequest.owner_id},
          ${updatedJoinRequest.user_profile_id},
          ${updatedJoinRequest.id},
          true,
          true,
          ${now},
          ${now}
        WHERE NOT EXISTS (
          SELECT 1 FROM event_attendees
          WHERE join_request_id = ${updatedJoinRequest.id}
        )
      `;
    }

    return NextResponse.json({
      join_request: updatedJoinRequest,
      message: 'Join request updated successfully',
    });
  } catch (err: any) {
    console.error(`[PATCH /api/join-requests/${(await params).id}] Error:`, err);
    return NextResponse.json(
      { error: err.message || 'Failed to update join request' },
      { status: 500 }
    );
  }
}

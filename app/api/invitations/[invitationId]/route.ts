import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { updateInvitationSchema } from '@/lib/schemas/invitation';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { checkAndPromoteWaitlist } from '@/lib/waitlist/promoter';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ invitationId: string }>;
};

/**
 * GET /api/invitations/[invitationId]
 * Get invitation details
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
    const { invitationId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitationId)) {
      return NextResponse.json(
        { error: 'Invalid invitation ID format' },
        { status: 400 }
      );
    }

    // Get database client
    const db = getDb();

    // Get invitation
    const result = await db`
      SELECT
        id,
        campaign_id,
        event_id,
        full_name,
        email,
        status,
        tier,
        priority,
        internal_notes,
        expected_plus_ones,
        invitation_token,
        token_expires_at,
        rsvp_email_sent_at,
        rsvp_responded_at,
        rsvp_response_message,
        join_token,
        join_link_sent_at,
        join_completed_at,
        join_request_id,
        table_assignment,
        seat_assignment,
        created_at,
        updated_at
      FROM campaign_invitations
      WHERE id = ${invitationId}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ invitation: result[0] });
  }
);

/**
 * PATCH /api/invitations/[invitationId]
 * Update invitation details
 */
export const PATCH = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { invitationId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitationId)) {
      return NextResponse.json(
        { error: 'Invalid invitation ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const validation = await validateRequest(req, updateInvitationSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Get database client
    const db = getDb();

    // Check if invitation exists
    const existing = await db`
      SELECT id, status, email
      FROM campaign_invitations
      WHERE id = ${invitationId}
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if there are fields to update
    if (
      body.status === undefined &&
      body.tier === undefined &&
      body.priority === undefined &&
      body.expected_plus_ones === undefined &&
      body.internal_notes === undefined &&
      body.table_assignment === undefined &&
      body.seat_assignment === undefined
    ) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update fields individually using template literals
    // Note: We update fields individually since Neon doesn't support parameterized unsafe queries

    if (body.status !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET status = ${body.status}::invitation_status, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.tier !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET tier = ${body.tier}::invitation_tier, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.priority !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET priority = ${body.priority}::invitation_priority, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.expected_plus_ones !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET expected_plus_ones = ${body.expected_plus_ones}, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.internal_notes !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET internal_notes = ${body.internal_notes}, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.table_assignment !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET table_assignment = ${body.table_assignment}, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    if (body.seat_assignment !== undefined) {
      await db`
        UPDATE campaign_invitations
        SET seat_assignment = ${body.seat_assignment}, updated_at = NOW()
        WHERE id = ${invitationId}
      `;
    }

    // Fetch updated invitation
    const result = await db`
      SELECT id, campaign_id, event_id, full_name, email, status, tier, priority,
             internal_notes, expected_plus_ones, invitation_token, token_expires_at,
             rsvp_email_sent_at, rsvp_responded_at, rsvp_response_message,
             join_token, join_link_sent_at, join_completed_at, join_request_id,
             table_assignment, seat_assignment, created_at, updated_at
      FROM campaign_invitations
      WHERE id = ${invitationId}
    `;

    logger.info('Invitation updated', {
      invitationId,
      updates: Object.keys(body),
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'invitation.updated',
      entityType: 'invitation',
      entityId: invitationId,
      previousValue: { status: existing[0].status },
      newValue: body,
      metadata: { updatedFields: Object.keys(body) },
      ipAddress: getClientIdentifier(req),
    });

    // Auto-promote waitlisted guests when an invitation is declined
    if (body.status === 'DECLINED' && result[0]?.event_id) {
      checkAndPromoteWaitlist(result[0].event_id, auth.workspace.id).catch(err => {
        logger.error('Waitlist promotion failed', err as Error, { invitationId });
      });
    }

    return NextResponse.json({
      invitation: result[0],
      message: 'Invitation updated successfully',
    });
  }
);

/**
 * DELETE /api/invitations/[invitationId]
 * Delete an invitation
 */
export const DELETE = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { invitationId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(invitationId)) {
      return NextResponse.json(
        { error: 'Invalid invitation ID format' },
        { status: 400 }
      );
    }

    // Get database client
    const db = getDb();

    // Check if invitation exists
    const existing = await db`
      SELECT id, email
      FROM campaign_invitations
      WHERE id = ${invitationId}
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Delete invitation
    await db`
      DELETE FROM campaign_invitations
      WHERE id = ${invitationId}
    `;

    logger.info('Invitation deleted', {
      invitationId,
      email: existing[0].email,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'invitation.deleted',
      entityType: 'invitation',
      entityId: invitationId,
      previousValue: { email: existing[0].email },
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json({
      message: 'Invitation deleted successfully',
    });
  }
);

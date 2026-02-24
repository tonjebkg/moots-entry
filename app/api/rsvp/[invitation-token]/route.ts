import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { rsvpResponseSchema } from '@/lib/schemas/invitation';
import { validateInvitationToken } from '@/lib/invitation-token';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ 'invitation-token': string }>;
};

/**
 * POST /api/rsvp/[invitation-token]
 * Process RSVP response (Step 1: Attendance Confirmation)
 *
 * Body:
 * - action: 'ACCEPT' | 'DECLINE'
 * - message?: string (optional response message)
 * - plus_ones?: number (expected plus-ones if accepting)
 *
 * Note: Accepting RSVP does NOT create join_request or grant app access.
 * That happens in Step 2 when host sends join link.
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const { 'invitation-token': invitationToken } = await params;

    if (!invitationToken) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const validation = await validateRequest(req, rsvpResponseSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Validate invitation token
    const invitation = await validateInvitationToken(invitationToken);

    if (!invitation) {
      return NextResponse.json(
        {
          error: 'Invalid or expired invitation',
          message:
            'This invitation link is invalid, has expired, or you have already responded.',
        },
        { status: 404 }
      );
    }

    // Get database client
    const db = getDb();

    // Process response based on action
    if (body.action === 'ACCEPT') {
      // Update invitation to ACCEPTED
      await db`
        UPDATE campaign_invitations
        SET
          status = 'ACCEPTED',
          rsvp_responded_at = NOW(),
          rsvp_response_message = ${body.message || null},
          expected_plus_ones = ${body.plus_ones || 0}
        WHERE id = ${invitation.id}
      `;

      logger.info('RSVP accepted', {
        invitationId: invitation.id,
        email: invitation.email,
        plusOnes: body.plus_ones || 0,
      });

      return NextResponse.json({
        success: true,
        status: 'ACCEPTED',
        message: 'Thank you for accepting! The host will send you access to the event room shortly.',
      });
    } else if (body.action === 'DECLINE') {
      // Update invitation to DECLINED
      await db`
        UPDATE campaign_invitations
        SET
          status = 'DECLINED',
          rsvp_responded_at = NOW(),
          rsvp_response_message = ${body.message || null}
        WHERE id = ${invitation.id}
      `;

      logger.info('RSVP declined', {
        invitationId: invitation.id,
        email: invitation.email,
      });

      return NextResponse.json({
        success: true,
        status: 'DECLINED',
        message: 'Thank you for letting us know. We hope to see you at a future event!',
      });
    }

    // Should never reach here due to Zod validation
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  }
);

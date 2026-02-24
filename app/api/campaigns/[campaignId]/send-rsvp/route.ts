import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { sendRsvpSchema } from '@/lib/schemas/invitation';
import {
  generateInvitationToken,
  getTokenExpiration,
} from '@/lib/invitation-token';
import { sendRsvpInvitationEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ campaignId: string }>;
};

// Rate limit: 100 emails per hour per campaign
const RATE_LIMIT_PER_HOUR = 100;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(campaignId: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(campaignId);

  if (!limit || limit.resetAt < now) {
    // Reset or initialize
    rateLimitMap.set(campaignId, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour
    });
    return true;
  }

  if (limit.count >= RATE_LIMIT_PER_HOUR) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}

/**
 * POST /api/campaigns/[campaignId]/send-rsvp
 * Send RSVP invitations (Step 1: Attendance Confirmation)
 *
 * Body:
 * - invitation_ids?: string[] - Specific invitations to send
 * - tier?: 'TIER_1' | 'TIER_2' | 'TIER_3' - Send to all in tier
 *
 * One of invitation_ids or tier must be provided.
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { campaignId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const validation = await validateRequest(req, sendRsvpSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Check rate limit
    if (!checkRateLimit(campaignId)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_PER_HOUR} emails per hour per campaign`,
        },
        { status: 429 }
      );
    }

    // Get database client
    const db = getDb();

    // Check if campaign exists and get event details
    const campaign = await db`
      SELECT
        ic.id,
        ic.event_id,
        ic.name,
        ic.email_subject,
        ic.email_body,
        e.title as event_title,
        e.start_date,
        e.location
      FROM invitation_campaigns ic
      JOIN events e ON e.id = ic.event_id
      WHERE ic.id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaign[0];

    // Get invitations to send
    let invitations;

    if (body.invitation_ids) {
      // Send to specific invitations
      invitations = await db`
        SELECT
          id,
          full_name,
          email,
          status,
          invitation_token,
          rsvp_email_sent_at
        FROM campaign_invitations
        WHERE campaign_id = ${campaignId}
          AND id = ANY(${body.invitation_ids})
          AND status = 'CONSIDERING'
      `;
    } else if (body.tier) {
      // Send to all in tier
      invitations = await db`
        SELECT
          id,
          full_name,
          email,
          status,
          invitation_token,
          rsvp_email_sent_at
        FROM campaign_invitations
        WHERE campaign_id = ${campaignId}
          AND tier = ${body.tier}::invitation_tier
          AND status = 'CONSIDERING'
      `;
    }

    if (!invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: 'No invitations found to send (must be in CONSIDERING status)' },
        { status: 404 }
      );
    }

    // Check capacity warning
    const capacityCheck = await db`
      SELECT
        e.total_capacity,
        (
          SELECT COUNT(*)
          FROM campaign_invitations ci
          WHERE ci.event_id = e.id
            AND ci.status = 'ACCEPTED'
        ) as seats_filled
      FROM events e
      WHERE e.id = ${campaignData.event_id}
      LIMIT 1
    `;

    const totalCapacity = capacityCheck[0]?.total_capacity || 0;
    const seatsFilled = Number(capacityCheck[0]?.seats_filled || 0);
    const overCapacity =
      totalCapacity > 0 &&
      seatsFilled + invitations.length > totalCapacity;

    // Send emails and track results
    const sent: string[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    const tokenExpiration = getTokenExpiration(30); // 30 days

    for (const invitation of invitations) {
      try {
        // Generate or reuse invitation token
        let invitationToken = invitation.invitation_token;

        if (!invitationToken) {
          invitationToken = generateInvitationToken();

          // Update invitation with token
          await db`
            UPDATE campaign_invitations
            SET
              invitation_token = ${invitationToken},
              token_expires_at = ${tokenExpiration.toISOString()}
            WHERE id = ${invitation.id}
          `;
        }

        // Build RSVP URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const rsvpUrl = `${baseUrl}/rsvp/${invitationToken}`;

        // Format event date
        const eventDate = new Date(campaignData.start_date).toLocaleDateString(
          'en-US',
          {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }
        );

        // Send email
        const emailResult = await sendRsvpInvitationEmail({
          to: invitation.email,
          recipientName: invitation.full_name,
          eventTitle: campaignData.event_title,
          eventDate: eventDate,
          eventLocation: campaignData.location || 'TBD',
          rsvpUrl,
          subject: campaignData.email_subject,
          customBody: campaignData.email_body,
        });

        if (emailResult.success) {
          // Update invitation status
          await db`
            UPDATE campaign_invitations
            SET
              status = 'INVITED',
              rsvp_email_sent_at = NOW()
            WHERE id = ${invitation.id}
          `;

          // Log email send
          await db`
            INSERT INTO email_send_log (
              invitation_id,
              campaign_id,
              recipient_email,
              subject,
              email_type,
              status,
              email_service_id,
              sent_at
            ) VALUES (
              ${invitation.id},
              ${campaignId},
              ${invitation.email},
              ${campaignData.email_subject || `You're invited to ${campaignData.event_title}`},
              'RSVP_INVITATION',
              'SENT',
              ${emailResult.emailServiceId || null},
              NOW()
            )
          `;

          sent.push(invitation.id);
        } else {
          failed.push({
            id: invitation.id,
            error: emailResult.error || 'Unknown error',
          });

          // Log failure
          await db`
            INSERT INTO email_send_log (
              invitation_id,
              campaign_id,
              recipient_email,
              subject,
              email_type,
              status,
              error_message
            ) VALUES (
              ${invitation.id},
              ${campaignId},
              ${invitation.email},
              ${campaignData.email_subject || `You're invited to ${campaignData.event_title}`},
              'RSVP_INVITATION',
              'FAILED',
              ${emailResult.error || 'Unknown error'}
            )
          `;
        }
      } catch (error: any) {
        logger.error('Failed to send RSVP email', undefined, {
          invitationId: invitation.id,
          error: error.message,
        });

        failed.push({
          id: invitation.id,
          error: error.message || 'Unknown error',
        });
      }
    }

    logger.info('RSVP emails sent', {
      campaignId,
      sent: sent.length,
      failed: failed.length,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'campaign.emails_sent',
      entityType: 'campaign',
      entityId: campaignId,
      metadata: {
        sent: sent.length,
        failed: failed.length,
        eventId: campaignData.event_id,
      },
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json({
      sent: sent.length,
      failed: failed.length,
      errors: failed,
      message: `Successfully sent ${sent.length} RSVP invitations`,
      warning: overCapacity
        ? 'Sending invitations may exceed event capacity'
        : undefined,
    });
  }
);

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { sendJoinLinksSchema } from '@/lib/schemas/invitation';
import { generateJoinToken } from '@/lib/invitation-token';
import { sendJoinLinkEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

// Rate limit: 100 emails per hour
const RATE_LIMIT_PER_HOUR = 100;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);

  if (!limit || limit.resetAt < now) {
    // Reset or initialize
    rateLimitMap.set(key, {
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
 * POST /api/invitations/bulk-send-join-links
 * Send join links to accepted guests (Step 2: App Access)
 *
 * Body:
 * - invitation_ids: string[] - Array of invitation IDs
 *
 * Only invitations with status ACCEPTED can receive join links.
 */
export const POST = withErrorHandling(async (req: Request) => {
  const auth = await requireAuth();

  // Parse and validate request body
  const validation = await validateRequest(req, sendJoinLinksSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

  const { invitation_ids } = body;

  // Check rate limit (global for join links)
  if (!checkRateLimit('join_links')) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Maximum ${RATE_LIMIT_PER_HOUR} emails per hour`,
      },
      { status: 429 }
    );
  }

  // Get database client
  const db = getDb();

  // Get invitations (must be ACCEPTED status)
  const invitations = await db`
    SELECT
      ci.id,
      ci.campaign_id,
      ci.event_id,
      ci.full_name,
      ci.email,
      ci.status,
      ci.join_token,
      ci.join_link_sent_at,
      e.title as event_title
    FROM campaign_invitations ci
    JOIN events e ON e.id = ci.event_id
    WHERE ci.id = ANY(${invitation_ids})
      AND ci.status = 'ACCEPTED'
  `;

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      {
        error: 'No invitations found to send (must be in ACCEPTED status)',
      },
      { status: 404 }
    );
  }

  // Send join link emails
  const sent: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const invitation of invitations) {
    try {
      // Generate or reuse join token
      let joinToken = invitation.join_token;

      if (!joinToken) {
        joinToken = generateJoinToken();

        // Update invitation with token
        await db`
          UPDATE campaign_invitations
          SET join_token = ${joinToken}
          WHERE id = ${invitation.id}
        `;
      }

      // Build join URL
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const joinUrl = `${baseUrl}/join/${joinToken}`;

      // Send email
      const emailResult = await sendJoinLinkEmail({
        to: invitation.email,
        recipientName: invitation.full_name,
        eventTitle: invitation.event_title,
        joinUrl,
      });

      if (emailResult.success) {
        // Update invitation status
        await db`
          UPDATE campaign_invitations
          SET join_link_sent_at = NOW()
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
            ${invitation.campaign_id},
            ${invitation.email},
            ${'Join the ' + invitation.event_title + ' event room'},
            'JOIN_LINK',
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
            ${invitation.campaign_id},
            ${invitation.email},
            ${'Join the ' + invitation.event_title + ' event room'},
            'JOIN_LINK',
            'FAILED',
            ${emailResult.error || 'Unknown error'}
          )
        `;
      }
    } catch (error: any) {
      logger.error('Failed to send join link email', undefined, {
        invitationId: invitation.id,
        error: error.message,
      });

      failed.push({
        id: invitation.id,
        error: error.message || 'Unknown error',
      });
    }
  }

  logger.info('Join link emails sent', {
    sent: sent.length,
    failed: failed.length,
  });

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'invitation.join_links_sent',
    entityType: 'invitation',
    metadata: {
      sent: sent.length,
      failed: failed.length,
      invitationIds: invitation_ids,
    },
    ipAddress: getClientIdentifier(req),
  });

  return NextResponse.json({
    sent: sent.length,
    failed: failed.length,
    errors: failed,
    message: `Successfully sent ${sent.length} join links`,
  });
});

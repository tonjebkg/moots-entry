import { getDb } from '@/lib/db';
import { sendBroadcastEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';

interface RecipientInfo {
  email: string;
  full_name: string;
}

/**
 * Get broadcast recipients for an event (accepted/confirmed invitations).
 */
export async function getRecipients(
  eventId: number,
  workspaceId: string,
  filter: Record<string, unknown> = {}
): Promise<RecipientInfo[]> {
  const db = getDb();

  const results = await db`
    SELECT DISTINCT ci.email, ci.full_name
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
      AND ci.email IS NOT NULL
    ORDER BY ci.full_name
  `;

  return results as RecipientInfo[];
}

/**
 * Send a broadcast message to all recipients.
 * Updates broadcast status and delivery counts.
 */
export async function sendBroadcast(
  broadcastId: string,
  eventId: number,
  workspaceId: string,
  subject: string,
  content: string,
  eventTitle: string
): Promise<{ delivered: number; failed: number }> {
  const db = getDb();

  // Update status to SENDING
  await db`
    UPDATE broadcast_messages SET status = 'SENDING'::broadcast_status
    WHERE id = ${broadcastId}
  `;

  const recipients = await getRecipients(eventId, workspaceId);
  let delivered = 0;
  let failed = 0;

  for (const r of recipients) {
    try {
      const result = await sendBroadcastEmail({
        to: r.email,
        recipientName: r.full_name,
        subject,
        content,
        eventTitle,
      });

      if (result.success) {
        delivered++;
      } else {
        failed++;
        logger.error('Broadcast email failed', undefined, { email: r.email, error: result.error });
      }
    } catch (err) {
      failed++;
      logger.error('Broadcast email exception', err as Error, { email: r.email });
    }
  }

  // Update broadcast with final counts
  await db`
    UPDATE broadcast_messages SET
      status = ${failed === recipients.length ? 'FAILED' : 'SENT'}::broadcast_status,
      sent_at = NOW(),
      recipient_count = ${recipients.length},
      delivered_count = ${delivered},
      failed_count = ${failed}
    WHERE id = ${broadcastId}
  `;

  return { delivered, failed };
}

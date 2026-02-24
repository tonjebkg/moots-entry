import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

/**
 * Check if capacity opened up and auto-promote the next waitlisted guest.
 * Called after an invitation status changes to DECLINED.
 */
export async function checkAndPromoteWaitlist(
  eventId: number,
  workspaceId: string
): Promise<{ promoted: boolean; promotedInvitationId?: string }> {
  const db = getDb();

  // Get event capacity
  const events = await db`
    SELECT total_capacity FROM events WHERE id = ${eventId}
  `;
  if (events.length === 0) {
    return { promoted: false };
  }

  const capacity = events[0].total_capacity;
  if (!capacity) {
    // No capacity limit — no need to promote
    return { promoted: false };
  }

  // Count current accepted invitations
  const countRows = await db`
    SELECT COUNT(*)::int AS accepted_count
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
  `;
  const acceptedCount = countRows[0]?.accepted_count || 0;

  if (acceptedCount >= capacity) {
    // Still at capacity — no room
    return { promoted: false };
  }

  // Find the next waitlisted invitation, ordered by tier → priority → invited_at
  const waitlisted = await db`
    SELECT ci.id, ci.full_name, ci.email
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${eventId}
      AND ci.status = 'WAITLIST'
    ORDER BY
      CASE ci.tier
        WHEN 'VIP' THEN 1
        WHEN 'GENERAL' THEN 2
        WHEN 'PLUS_ONE' THEN 3
        ELSE 4
      END,
      CASE ci.priority
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'LOW' THEN 3
        ELSE 4
      END,
      ci.created_at ASC
    LIMIT 1
  `;

  if (waitlisted.length === 0) {
    return { promoted: false };
  }

  const invitation = waitlisted[0];

  // Promote: change status from WAITLIST to INVITED
  await db`
    UPDATE campaign_invitations
    SET status = 'INVITED'::invitation_status, updated_at = NOW()
    WHERE id = ${invitation.id}
  `;

  logAction({
    workspaceId,
    actorId: null,
    actorEmail: 'system',
    action: 'invitation.waitlist_promoted',
    entityType: 'invitation',
    entityId: invitation.id,
    previousValue: { status: 'WAITLIST' },
    newValue: { status: 'INVITED' },
    metadata: { eventId, reason: 'capacity_opened' },
  });

  logger.info('Waitlist promotion', {
    invitationId: invitation.id,
    fullName: invitation.full_name,
    eventId,
  });

  return { promoted: true, promotedInvitationId: invitation.id };
}

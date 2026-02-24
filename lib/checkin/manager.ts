import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import type { CheckinMetrics, EventCheckin } from '@/types/phase3';

interface CheckInParams {
  eventId: number;
  workspaceId: string;
  contactId?: string;
  invitationId?: string;
  source: 'INVITATION' | 'WALK_IN' | 'QR_SCAN';
  checkedInBy: string;
  notes?: string;
}

/**
 * Check in a guest by contact_id or invitation_id.
 * Creates event_checkins record and marks campaign_invitations.checked_in if applicable.
 */
export async function checkInGuest(params: CheckInParams): Promise<EventCheckin> {
  const db = getDb();
  const { eventId, workspaceId, contactId, invitationId, source, checkedInBy, notes } = params;

  // Resolve guest name/email from contact or invitation
  let fullName = 'Unknown Guest';
  let email: string | null = null;
  let company: string | null = null;
  let title: string | null = null;

  if (contactId) {
    const contacts = await db`
      SELECT full_name, emails, company, title
      FROM people_contacts
      WHERE id = ${contactId} AND workspace_id = ${workspaceId}
    `;
    if (contacts.length > 0) {
      fullName = contacts[0].full_name;
      email = contacts[0].emails?.[0] || null;
      company = contacts[0].company;
      title = contacts[0].title;
    }
  } else if (invitationId) {
    const invitations = await db`
      SELECT ci.full_name, ci.email, ci.contact_id,
             pc.company, pc.title
      FROM campaign_invitations ci
      LEFT JOIN people_contacts pc ON pc.id = ci.contact_id
      WHERE ci.id = ${invitationId}
    `;
    if (invitations.length > 0) {
      const inv = invitations[0];
      fullName = inv.full_name || 'Unknown';
      email = inv.email;
      company = inv.company || null;
      title = inv.title || null;
    }
  }

  // Create checkin record
  const result = await db`
    INSERT INTO event_checkins (
      event_id, workspace_id, contact_id, invitation_id,
      full_name, email, company, title,
      source, checked_in_by, notes
    ) VALUES (
      ${eventId}, ${workspaceId}, ${contactId || null}, ${invitationId || null},
      ${fullName}, ${email}, ${company}, ${title},
      ${source}::checkin_source, ${checkedInBy}, ${notes || null}
    )
    RETURNING *
  `;

  // Mark invitation as checked in if applicable
  if (invitationId) {
    await db`
      UPDATE campaign_invitations
      SET checked_in = TRUE, checked_in_at = NOW()
      WHERE id = ${invitationId} AND checked_in = FALSE
    `;
  }

  return result[0] as EventCheckin;
}

interface WalkInParams {
  eventId: number;
  workspaceId: string;
  fullName: string;
  email?: string | null;
  company?: string | null;
  title?: string | null;
  phone?: string | null;
  checkedInBy: string;
  notes?: string | null;
}

/**
 * Onboard a walk-in guest. Creates checkin record with WALK_IN source.
 */
export async function onboardWalkIn(params: WalkInParams): Promise<EventCheckin> {
  const db = getDb();

  const result = await db`
    INSERT INTO event_checkins (
      event_id, workspace_id,
      full_name, email, company, title, phone,
      source, checked_in_by, notes
    ) VALUES (
      ${params.eventId}, ${params.workspaceId},
      ${params.fullName}, ${params.email || null}, ${params.company || null},
      ${params.title || null}, ${params.phone || null},
      'WALK_IN'::checkin_source, ${params.checkedInBy}, ${params.notes || null}
    )
    RETURNING *
  `;

  return result[0] as EventCheckin;
}

/**
 * Get check-in metrics and recent check-ins for an event.
 */
export async function getCheckinMetrics(
  eventId: number,
  workspaceId: string
): Promise<CheckinMetrics> {
  const db = getDb();

  // Total expected (approved invitations)
  const expectedResult = await db`
    SELECT COUNT(*)::int AS count
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
  `;

  // Check-in counts
  const checkinStats = await db`
    SELECT
      COUNT(*)::int AS total_checked_in,
      COUNT(*) FILTER (WHERE source = 'WALK_IN')::int AS walk_ins
    FROM event_checkins
    WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
  `;

  // Recent check-ins
  const recentCheckins = await db`
    SELECT *
    FROM event_checkins
    WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT 20
  `;

  const totalExpected = expectedResult[0]?.count || 0;
  const totalCheckedIn = checkinStats[0]?.total_checked_in || 0;

  return {
    total_expected: totalExpected,
    total_checked_in: totalCheckedIn,
    walk_ins: checkinStats[0]?.walk_ins || 0,
    check_in_rate: totalExpected > 0 ? Math.round((totalCheckedIn / totalExpected) * 100) : 0,
    recent_checkins: recentCheckins as EventCheckin[],
  };
}

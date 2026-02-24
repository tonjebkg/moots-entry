import { getDb } from '@/lib/db';
import type { AnalyticsMetrics, FunnelStage, TeamPerformance, EventComparison } from '@/types/phase4';

/**
 * Get full event analytics with funnel, headline metrics, score distribution, and campaign summary.
 */
export async function getEventAnalytics(
  eventId: number,
  workspaceId: string
): Promise<AnalyticsMetrics> {
  const db = getDb();

  // Run all queries in parallel
  const [
    guestPoolRows,
    scoredRows,
    invitationRows,
    checkinRows,
    followUpRows,
    broadcastRows,
    scoreDistRows,
    campaignRows,
  ] = await Promise.all([
    // Guest pool: contacts linked to this event via campaign_invitations
    db`
      SELECT COUNT(DISTINCT ci.contact_id)::int AS count
      FROM campaign_invitations ci
      WHERE ci.event_id = ${eventId}
    `,
    // Scored contacts
    db`
      SELECT COUNT(*)::int AS count
      FROM guest_scores
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    `,
    // Invitation status breakdown
    db`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('INVITED', 'ACCEPTED', 'DECLINED', 'CONSIDERING'))::int AS invited,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'DECLINED')::int AS declined
      FROM campaign_invitations
      WHERE event_id = ${eventId}
    `,
    // Check-ins
    db`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE source = 'WALK_IN')::int AS walk_ins
      FROM event_checkins
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    `,
    // Follow-ups
    db`
      SELECT
        COUNT(*) FILTER (WHERE status != 'PENDING')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'MEETING_BOOKED')::int AS meetings
      FROM follow_up_sequences
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    `,
    // Broadcasts
    db`
      SELECT COUNT(*) FILTER (WHERE status = 'SENT')::int AS sent
      FROM broadcast_messages
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    `,
    // Score distribution
    db`
      SELECT
        CASE
          WHEN relevance_score BETWEEN 0 AND 25 THEN '0-25'
          WHEN relevance_score BETWEEN 26 AND 50 THEN '26-50'
          WHEN relevance_score BETWEEN 51 AND 75 THEN '51-75'
          WHEN relevance_score BETWEEN 76 AND 100 THEN '76-100'
        END AS range,
        COUNT(*)::int AS count
      FROM guest_scores
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
      GROUP BY range
      ORDER BY range
    `,
    // Campaign summary
    db`
      SELECT
        ic.id AS campaign_id,
        ic.name AS campaign_name,
        COALESCE(ic.total_invited, 0)::int AS total_invited,
        COALESCE(ic.total_accepted, 0)::int AS total_accepted,
        COALESCE(ic.total_declined, 0)::int AS total_declined
      FROM invitation_campaigns ic
      WHERE ic.event_id = ${eventId}
      ORDER BY ic.created_at DESC
    `,
  ]);

  const invited = invitationRows[0]?.invited || 0;
  const accepted = invitationRows[0]?.accepted || 0;
  const checkedIn = checkinRows[0]?.total || 0;
  const walkIns = checkinRows[0]?.walk_ins || 0;
  const followUpsSent = followUpRows[0]?.sent || 0;
  const meetingsBooked = followUpRows[0]?.meetings || 0;
  const broadcastsSent = broadcastRows[0]?.sent || 0;
  const scored = scoredRows[0]?.count || 0;
  const guestPool = guestPoolRows[0]?.count || 0;

  // Build funnel
  const funnel: FunnelStage[] = [
    { key: 'pool', label: 'Guest Pool', count: guestPool, color: '#6e6e7e' },
    { key: 'scored', label: 'Scored', count: scored, color: '#0f3460' },
    { key: 'invited', label: 'Invited', count: invited, color: '#2563eb' },
    { key: 'accepted', label: 'Accepted', count: accepted, color: '#059669' },
    { key: 'checked_in', label: 'Checked In', count: checkedIn, color: '#10b981' },
    { key: 'follow_up', label: 'Follow-Up', count: followUpsSent, color: '#8b5cf6' },
    { key: 'meetings', label: 'Meetings', count: meetingsBooked, color: '#f59e0b' },
  ];

  // Score distribution with defaults for missing ranges
  const allRanges = ['0-25', '26-50', '51-75', '76-100'];
  const distMap = new Map(scoreDistRows.map((r: any) => [r.range, r.count]));
  const scoreDistribution = allRanges.map(range => ({
    range,
    count: (distMap.get(range) as number) || 0,
  }));

  // Campaign summary with acceptance rate
  const campaignSummary = campaignRows.map((c: any) => ({
    campaign_id: c.campaign_id,
    campaign_name: c.campaign_name,
    total_invited: c.total_invited,
    total_accepted: c.total_accepted,
    total_declined: c.total_declined,
    acceptance_rate: c.total_invited > 0
      ? Math.round((c.total_accepted / c.total_invited) * 100)
      : 0,
  }));

  return {
    funnel,
    headline: {
      guest_pool: guestPool,
      scored,
      invited,
      accepted,
      checked_in: checkedIn,
      walk_ins: walkIns,
      follow_ups_sent: followUpsSent,
      meetings_booked: meetingsBooked,
      broadcasts_sent: broadcastsSent,
    },
    score_distribution: scoreDistribution,
    campaign_summary: campaignSummary,
  };
}

/**
 * Get team performance metrics for an event.
 */
export async function getTeamPerformance(
  eventId: number,
  workspaceId: string
): Promise<TeamPerformance[]> {
  const db = getDb();

  const rows = await db`
    SELECT
      gta.assigned_to AS user_id,
      u.full_name AS user_name,
      u.email AS user_email,
      COUNT(DISTINCT gta.contact_id)::int AS assigned_guests,
      COUNT(DISTINCT ec.id)::int AS checked_in_guests,
      COUNT(DISTINCT fus.id) FILTER (WHERE fus.status != 'PENDING')::int AS follow_ups_sent,
      COUNT(DISTINCT fus.id) FILTER (WHERE fus.status = 'MEETING_BOOKED')::int AS meetings_booked
    FROM guest_team_assignments gta
    JOIN users u ON u.id = gta.assigned_to
    LEFT JOIN event_checkins ec ON ec.contact_id = gta.contact_id AND ec.event_id = ${eventId}
    LEFT JOIN follow_up_sequences fus ON fus.contact_id = gta.contact_id AND fus.event_id = ${eventId}
    WHERE gta.event_id = ${eventId} AND gta.workspace_id = ${workspaceId}
    GROUP BY gta.assigned_to, u.full_name, u.email
    ORDER BY assigned_guests DESC
  `;

  return rows as TeamPerformance[];
}

/**
 * Get comparison metrics for multiple events.
 */
export async function getEventComparison(
  eventIds: number[],
  workspaceId: string
): Promise<EventComparison[]> {
  const db = getDb();

  const results: EventComparison[] = [];

  for (const eid of eventIds) {
    const eventRows = await db`SELECT title FROM events WHERE id = ${eid}`;
    if (eventRows.length === 0) continue;

    const metricsRows = await db`
      SELECT
        COUNT(*)::int AS invited,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int AS accepted,
        COUNT(*) FILTER (WHERE status = 'DECLINED')::int AS declined
      FROM campaign_invitations WHERE event_id = ${eid}
    `;

    const checkinRows = await db`
      SELECT COUNT(*)::int AS checked_in
      FROM event_checkins WHERE event_id = ${eid} AND workspace_id = ${workspaceId}
    `;

    const followUpRows = await db`
      SELECT COUNT(*) FILTER (WHERE status != 'PENDING')::int AS sent
      FROM follow_up_sequences WHERE event_id = ${eid} AND workspace_id = ${workspaceId}
    `;

    const inv = metricsRows[0]?.invited || 0;
    const acc = metricsRows[0]?.accepted || 0;
    const ci = checkinRows[0]?.checked_in || 0;
    const fu = followUpRows[0]?.sent || 0;

    results.push({
      event_id: eid,
      event_title: eventRows[0].title,
      metrics: {
        invited: inv,
        accepted: acc,
        checked_in: ci,
        acceptance_rate: inv > 0 ? Math.round((acc / inv) * 100) : 0,
        checkin_rate: acc > 0 ? Math.round((ci / acc) * 100) : 0,
        follow_up_rate: ci > 0 ? Math.round((fu / ci) * 100) : 0,
      },
    });
  }

  return results;
}

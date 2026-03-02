import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/with-error-handling'
import { getDb } from '@/lib/db'
import { getAgentActivity } from '@/lib/agent/activity'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/overview-stats
 * Composite endpoint returning vetting-first funnel stats, needs-attention items, and recent activity.
 *
 * Funnel: Pool → Scored → Qualified (60+) → Selected (in campaign) → Confirmed (ACCEPTED)
 */
export const GET = withErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params
  const eventIdNum = parseInt(eventId)

  if (isNaN(eventIdNum)) {
    return NextResponse.json({ error: 'Valid eventId is required' }, { status: 400 })
  }

  const db = getDb()

  // Get workspace_id for this event
  const eventRows = await db`
    SELECT workspace_id, total_capacity, start_date FROM events WHERE id = ${eventIdNum} LIMIT 1
  `
  if (eventRows.length === 0) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  const wsId = eventRows[0].workspace_id
  const totalCapacity = Number(eventRows[0].total_capacity) || 0
  const startDate = eventRows[0].start_date ? new Date(eventRows[0].start_date) : null
  const today = new Date()
  const isEventDay = startDate !== null &&
    startDate.getFullYear() === today.getFullYear() &&
    startDate.getMonth() === today.getMonth() &&
    startDate.getDate() === today.getDate()

  // Run all queries in parallel
  const [
    funnelStats,
    pendingReviewResult,
    highScoreNotInvitedResult,
    unscoredResult,
    awaitingRsvpResult,
    objectiveCount,
    recentActivity,
  ] = await Promise.all([
    // Vetting funnel: Pool → Scored → Qualified → Selected → Confirmed
    db`
      SELECT
        COUNT(DISTINCT c.id)::int AS pool,
        COUNT(DISTINCT gs.id)::int AS scored,
        COUNT(DISTINCT CASE WHEN gs.relevance_score >= 60 THEN gs.id END)::int AS qualified,
        COUNT(DISTINCT ci.id)::int AS selected,
        COUNT(DISTINCT CASE WHEN ci.status = 'ACCEPTED' THEN ci.id END)::int AS confirmed
      FROM people_contacts c
      LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventIdNum}
      LEFT JOIN campaign_invitations ci ON ci.contact_id = c.id AND ci.event_id = ${eventIdNum}
      WHERE c.workspace_id = ${wsId}
    `.catch(() => [{ pool: 0, scored: 0, qualified: 0, selected: 0, confirmed: 0 }]),

    // Pending review: inbound RSVP/join-request contacts with no invitation decision
    db`
      SELECT COUNT(DISTINCT c.id)::int AS count
      FROM people_contacts c
      LEFT JOIN campaign_invitations ci ON ci.contact_id = c.id AND ci.event_id = ${eventIdNum}
      WHERE c.workspace_id = ${wsId}
        AND c.source IN ('RSVP_SUBMISSION', 'JOIN_REQUEST')
        AND ci.id IS NULL
    `.catch(() => [{ count: 0 }]),

    // High-score contacts (70+) not yet in a campaign
    db`
      SELECT COUNT(DISTINCT gs.contact_id)::int AS count
      FROM guest_scores gs
      JOIN people_contacts c ON c.id = gs.contact_id AND c.workspace_id = ${wsId}
      LEFT JOIN campaign_invitations ci ON ci.contact_id = gs.contact_id AND ci.event_id = ${eventIdNum}
      WHERE gs.event_id = ${eventIdNum}
        AND gs.relevance_score >= 70
        AND ci.id IS NULL
    `.catch(() => [{ count: 0 }]),

    // Unscored contacts
    db`
      SELECT COUNT(DISTINCT c.id)::int AS count
      FROM people_contacts c
      LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventIdNum}
      WHERE c.workspace_id = ${wsId}
        AND gs.id IS NULL
    `.catch(() => [{ count: 0 }]),

    // Awaiting RSVP: invitations sent (INVITED) with no response
    db`
      SELECT COUNT(*)::int AS count
      FROM campaign_invitations
      WHERE event_id = ${eventIdNum}
        AND status = 'INVITED'
        AND rsvp_responded_at IS NULL
    `.catch(() => [{ count: 0 }]),

    // Objectives count
    db`
      SELECT COUNT(*)::int AS count FROM event_objectives WHERE event_id = ${eventIdNum}
    `.catch(() => [{ count: 0 }]),

    // Recent activity from audit_logs + campaign_invitations + rsvp_submissions
    db`
      (
        SELECT ci.full_name AS actor,
          ci.contact_id,
          CASE ci.status
            WHEN 'ACCEPTED' THEN 'confirmed attendance'
            WHEN 'DECLINED' THEN 'declined invitation'
            WHEN 'CONSIDERING' THEN 'added to invitation wave'
            WHEN 'INVITED' THEN 'was sent RSVP email'
            ELSE ci.status::text
          END AS action,
          ci.created_at AS timestamp
        FROM campaign_invitations ci
        WHERE ci.event_id = ${eventIdNum}
        ORDER BY ci.created_at DESC
        LIMIT 8
      )
      UNION ALL
      (
        SELECT rs.full_name AS actor,
          rs.contact_id,
          'submitted RSVP' AS action,
          rs.created_at AS timestamp
        FROM rsvp_submissions rs
        WHERE rs.event_id = ${eventIdNum}
        ORDER BY rs.created_at DESC
        LIMIT 7
      )
      ORDER BY timestamp DESC
      LIMIT 15
    `.catch(() => []),
  ])

  const funnel = funnelStats[0] || { pool: 0, scored: 0, qualified: 0, selected: 0, confirmed: 0 }
  const objectives = objectiveCount[0] || { count: 0 }
  const awaitingRsvp = Number(awaitingRsvpResult[0]?.count) || 0

  // Build needs-attention items (ordered by urgency)
  const needsAttention: { type: string; count: number; label: string; action?: string }[] = []

  // Event day: check-in is live
  if (isEventDay && Number(funnel.confirmed) > 0) {
    needsAttention.push({
      type: 'event_day',
      count: Number(funnel.confirmed),
      label: 'guests confirmed — check-in is live',
      action: 'Open Check-in',
    })
  }

  // Over capacity warning
  if (totalCapacity > 0 && Number(funnel.selected) > totalCapacity) {
    needsAttention.push({
      type: 'over_capacity',
      count: Number(funnel.selected) - totalCapacity,
      label: `over event capacity (${funnel.selected} selected for ${totalCapacity} seats)`,
      action: 'Manage Invitations',
    })
  }

  // Awaiting RSVP responses
  if (awaitingRsvp > 0) {
    needsAttention.push({
      type: 'awaiting_rsvp',
      count: awaitingRsvp,
      label: 'invited guests haven\'t responded',
      action: 'View in Campaigns',
    })
  }

  const pendingReview = Number(pendingReviewResult[0]?.count) || 0
  if (pendingReview > 0) {
    needsAttention.push({
      type: 'pending_review',
      count: pendingReview,
      label: 'new RSVP submissions scored. Review them to approve or decline.',
      action: 'Review in Guest Intelligence',
    })
  }

  const highScoreNotInvited = Number(highScoreNotInvitedResult[0]?.count) || 0
  if (highScoreNotInvited > 0) {
    needsAttention.push({
      type: 'high_score_not_invited',
      count: highScoreNotInvited,
      label: 'contacts score 70+ but haven\'t been invited. Strong matches for your objectives.',
      action: 'Review in Guest Intelligence',
    })
  }

  if (Number(objectives.count) === 0) {
    needsAttention.push({
      type: 'no_objectives',
      count: 1,
      label: 'I need targeting criteria to start scoring guests. Define what matters for this event.',
      action: 'Set Targeting',
    })
  }

  const unscoredCount = Number(unscoredResult[0]?.count) || 0
  if (unscoredCount > 0 && Number(objectives.count) > 0) {
    needsAttention.push({
      type: 'unscored_contacts',
      count: unscoredCount,
      label: `contacts are waiting to be scored. I'll match them against your targeting criteria — takes about 2 minutes.`,
      action: 'Score them now',
    })
  }

  // Activity feed
  const activity = recentActivity.map((r: any) => ({
    actor: r.actor || 'Unknown',
    action: r.action || 'updated',
    timestamp: r.timestamp,
    contact_id: r.contact_id || null,
  }))

  // Agent activity (non-blocking — fail gracefully if table doesn't exist yet)
  let agentActivity: any[] = []
  try {
    if (wsId) {
      agentActivity = await getAgentActivity(eventIdNum, wsId, 20)
    }
  } catch {
    // Table may not exist yet — that's fine
  }

  return NextResponse.json({
    funnel,
    needs_attention: needsAttention,
    activity,
    agent_activity: agentActivity,
    meta: {
      total_capacity: totalCapacity,
      has_objectives: Number(objectives.count) > 0,
      has_scored_contacts: Number(funnel.scored) > 0,
      is_event_day: isEventDay,
    },
  })
})

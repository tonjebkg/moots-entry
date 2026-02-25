import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/with-error-handling'
import { getDb } from '@/lib/db'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/overview-stats
 * Composite endpoint returning funnel stats, needs-attention items, and recent activity
 */
export const GET = withErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params
  const eventIdNum = parseInt(eventId)

  if (isNaN(eventIdNum)) {
    return NextResponse.json({ error: 'Valid eventId is required' }, { status: 400 })
  }

  const db = getDb()

  // Run all queries in parallel
  const [
    scoringStats,
    guestCounts,
    capacityResult,
    objectiveCount,
    recentJoinRequests,
  ] = await Promise.all([
    // Scoring funnel stats
    db`
      SELECT
        COUNT(DISTINCT c.id) as total_contacts,
        COUNT(DISTINCT gs.id) as scored_count,
        COUNT(DISTINCT CASE WHEN gs.relevance_score >= 60 THEN gs.id END) as qualified_count
      FROM people_contacts c
      LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventIdNum}
      LEFT JOIN workspaces w ON w.id = c.workspace_id
      WHERE c.workspace_id = (SELECT workspace_id FROM events e2 LEFT JOIN workspaces w2 ON 1=1 LIMIT 1)
    `.catch(() => [{ total_contacts: 0, scored_count: 0, qualified_count: 0 }]),

    // Guest status counts
    db`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
      FROM event_join_requests
      WHERE event_id = ${eventIdNum}
    `.catch(() => [{ total: 0, pending: 0, approved: 0, rejected: 0 }]),

    // Capacity
    db`
      SELECT total_capacity,
        (SELECT COUNT(*) FROM campaign_invitations WHERE event_id = ${eventIdNum} AND status = 'ACCEPTED') as confirmed
      FROM events WHERE id = ${eventIdNum} LIMIT 1
    `.catch(() => [{ total_capacity: 0, confirmed: 0 }]),

    // Objectives count
    db`
      SELECT COUNT(*) as count FROM event_objectives WHERE event_id = ${eventIdNum}
    `.catch(() => [{ count: 0 }]),

    // Recent join requests for activity feed
    db`
      SELECT full_name, status, created_at, updated_at
      FROM event_join_requests
      WHERE event_id = ${eventIdNum}
      ORDER BY COALESCE(updated_at, created_at) DESC
      LIMIT 15
    `.catch(() => []),
  ])

  const scoring = scoringStats[0] || { total_contacts: 0, scored_count: 0, qualified_count: 0 }
  const guests = guestCounts[0] || { total: 0, pending: 0, approved: 0, rejected: 0 }
  const capacity = capacityResult[0] || { total_capacity: 0, confirmed: 0 }
  const objectives = objectiveCount[0] || { count: 0 }

  // Build funnel
  const funnel = {
    evaluated: Number(scoring.total_contacts) || 0,
    qualified: Number(scoring.qualified_count) || 0,
    invited: Number(guests.approved) || 0,
    confirmed: Number(capacity.confirmed) || 0,
  }

  // Build needs-attention items
  const needsAttention: { type: string; count: number; label: string }[] = []

  if (Number(guests.pending) > 0) {
    needsAttention.push({ type: 'pending_approval', count: Number(guests.pending), label: 'guests pending review' })
  }

  if (Number(objectives.count) === 0) {
    needsAttention.push({ type: 'no_objectives', count: 1, label: 'event objectives not set' })
  }

  const highScoreNotInvited = Number(scoring.qualified_count) - Number(guests.approved)
  if (highScoreNotInvited > 0 && Number(scoring.scored_count) > 0) {
    needsAttention.push({ type: 'high_score_not_invited', count: highScoreNotInvited, label: 'high-score matches not yet invited' })
  }

  // Build activity from recent join requests
  const activity = recentJoinRequests.map((r: any) => {
    const actionMap: Record<string, string> = {
      PENDING: 'requested to join',
      APPROVED: 'was approved',
      REJECTED: 'was declined',
      CANCELLED: 'cancelled their request',
    }
    return {
      actor: r.full_name || 'Unknown',
      action: actionMap[r.status] || r.status?.toLowerCase() || 'updated',
      timestamp: r.updated_at || r.created_at,
    }
  })

  return NextResponse.json({
    funnel,
    needs_attention: needsAttention,
    activity,
    meta: {
      total_capacity: Number(capacity.total_capacity) || 0,
      has_objectives: Number(objectives.count) > 0,
      has_scored_contacts: Number(scoring.scored_count) > 0,
      pending_guests: Number(guests.pending) > 0,
    },
  })
})

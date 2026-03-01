import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { triggerScoringSchema } from '@/lib/schemas/scoring';
import { scoreBatchForEvent } from '@/lib/scoring';

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/scoring — Get scored contacts list
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params;
  const eventIdNum = parseInt(eventId);
  const db = getDb();

  // Derive workspace_id from event directly (same pattern as overview-stats)
  const eventRows = await db`SELECT workspace_id FROM events WHERE id = ${eventIdNum} LIMIT 1`;
  if (eventRows.length === 0) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  const workspaceId = eventRows[0].workspace_id;

  const searchParams = request.nextUrl.searchParams;
  const minScore = parseInt(searchParams.get('min_score') || '0');
  const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 1000);
  const offset = parseInt(searchParams.get('offset') || '0');
  const filter = searchParams.get('filter') || '';

  // Build filter clause
  const filterClause =
    filter === 'scored' ? db`AND gs.id IS NOT NULL` :
    filter === 'qualified' ? db`AND gs.relevance_score >= 60` :
    filter === 'selected' ? db`AND ci.id IS NOT NULL` :
    filter === 'confirmed' ? db`AND ci.status = 'ACCEPTED'` :
    filter === 'pending' ? db`AND c.source IN ('RSVP_SUBMISSION','JOIN_REQUEST') AND ci.id IS NULL` :
    filter === 'high_uninvited' ? db`AND gs.relevance_score >= 70 AND ci.id IS NULL` :
    filter === 'unscored' ? db`AND gs.id IS NULL` :
    db``;

  const scoredContacts = await db`
    SELECT
      c.id AS contact_id, c.full_name, c.first_name, c.last_name, c.photo_url,
      c.company, c.title, c.emails, c.tags, c.enrichment_status, c.ai_summary,
      c.source, c.linkedin_url, c.guest_role, c.guest_priority,
      gs.id AS score_id, gs.relevance_score, gs.matched_objectives,
      gs.score_rationale, gs.talking_points, gs.scored_at, gs.model_version,
      ci.id AS invitation_id, ci.status AS invitation_status,
      ci.tier AS invitation_tier, ci.campaign_id, ci.referred_by_name,
      rs.id AS rsvp_submission_id
    FROM people_contacts c
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventIdNum}
    LEFT JOIN campaign_invitations ci ON ci.contact_id = c.id AND ci.event_id = ${eventIdNum}
    LEFT JOIN rsvp_submissions rs ON rs.contact_id = c.id AND rs.event_id = ${eventIdNum}
    WHERE c.workspace_id = ${workspaceId}
      ${minScore > 0 ? db`AND gs.relevance_score >= ${minScore}` : db``}
      ${filterClause}
    ORDER BY
      CASE WHEN gs.relevance_score IS NOT NULL THEN 0 ELSE 1 END,
      gs.relevance_score DESC NULLS LAST,
      CASE WHEN c.enrichment_status = 'COMPLETED' THEN 0 WHEN c.enrichment_status = 'PENDING' THEN 1 ELSE 2 END,
      c.full_name ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  // Fetch event objectives to enrich matched_objectives with objective_text
  const objectives = await db`
    SELECT id, objective_text FROM event_objectives WHERE event_id = ${eventIdNum}
  `;
  const objectiveMap: Record<string, string> = {};
  for (const obj of objectives) {
    objectiveMap[obj.id] = obj.objective_text;
  }

  // Enrich matched_objectives with objective_text
  const enrichedContacts = scoredContacts.map((c: any) => {
    if (c.matched_objectives && Array.isArray(c.matched_objectives)) {
      c.matched_objectives = c.matched_objectives.map((mo: any) => ({
        ...mo,
        objective_text: mo.objective_text || objectiveMap[mo.objective_id] || 'Unknown objective',
      }));
    }
    return c;
  });

  // Get summary stats with vetting funnel
  const stats = await db`
    SELECT
      COUNT(DISTINCT c.id) as total_contacts,
      COUNT(DISTINCT gs.id) as scored_count,
      ROUND(AVG(gs.relevance_score)) as avg_score,
      MAX(gs.relevance_score) as max_score,
      MIN(gs.relevance_score) as min_score,
      COUNT(DISTINCT CASE WHEN gs.relevance_score >= 60 THEN gs.id END) as qualified_count,
      COUNT(DISTINCT CASE WHEN c.source IN ('RSVP_SUBMISSION','JOIN_REQUEST') AND ci.id IS NULL THEN c.id END) as pending_review_count,
      COUNT(DISTINCT ci.id) as selected_count,
      COUNT(DISTINCT CASE WHEN ci.status = 'ACCEPTED' THEN ci.id END) as confirmed_count
    FROM people_contacts c
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventIdNum}
    LEFT JOIN campaign_invitations ci ON ci.contact_id = c.id AND ci.event_id = ${eventIdNum}
    WHERE c.workspace_id = ${workspaceId}
  `;

  // Get active scoring job if any
  const activeJob = await db`
    SELECT id, status, total_contacts, completed_count, failed_count, created_at
    FROM scoring_jobs
    WHERE event_id = ${eventIdNum} AND workspace_id = ${workspaceId}
      AND status IN ('PENDING', 'IN_PROGRESS')
    ORDER BY created_at DESC
    LIMIT 1
  `;

  return NextResponse.json({
    contacts: enrichedContacts,
    stats: stats[0],
    active_job: activeJob[0] || null,
  });
});

/**
 * POST /api/events/[eventId]/scoring — Trigger batch scoring
 */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');
  const { eventId } = await params;
  const eventIdNum = parseInt(eventId);

  const result = await validateRequest(request, triggerScoringSchema);
  if (!result.success) return result.error;
  const { contact_ids } = result.data;

  const db = getDb();

  // Check that objectives exist
  const objectiveCount = await db`
    SELECT COUNT(*) as count FROM event_objectives
    WHERE event_id = ${eventIdNum} AND workspace_id = ${auth.workspace.id}
  `;

  if (parseInt(objectiveCount[0].count) === 0) {
    return NextResponse.json(
      { error: 'No objectives defined. Define event objectives before scoring.' },
      { status: 400 }
    );
  }

  // Count contacts to score
  const contactCount = contact_ids
    ? await db`
        SELECT COUNT(*) as count FROM people_contacts
        WHERE id = ANY(${contact_ids}::uuid[]) AND workspace_id = ${auth.workspace.id}
      `
    : await db`
        SELECT COUNT(*) as count FROM people_contacts
        WHERE workspace_id = ${auth.workspace.id}
      `;

  const total = parseInt(contactCount[0].count);

  if (total === 0) {
    return NextResponse.json({ error: 'No contacts to score' }, { status: 400 });
  }

  // Create scoring job
  const job = await db`
    INSERT INTO scoring_jobs (
      event_id, workspace_id, status, total_contacts
    ) VALUES (
      ${eventIdNum}, ${auth.workspace.id}, 'PENDING'::job_status, ${total}
    )
    RETURNING id
  `;

  const jobId = job[0].id;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'scoring.triggered',
    entityType: 'scoring_job',
    entityId: jobId,
    metadata: { event_id: eventIdNum, contact_count: total },
    ipAddress: getClientIdentifier(request),
  });

  // Run scoring asynchronously
  scoreBatchForEvent(jobId, eventIdNum, auth.workspace.id, contact_ids).catch((error) => {
    console.error('Scoring batch error:', error);
  });

  return NextResponse.json({
    job_id: jobId,
    total_contacts: total,
    message: `Scoring started for ${total} contacts`,
  }, { status: 202 });
});

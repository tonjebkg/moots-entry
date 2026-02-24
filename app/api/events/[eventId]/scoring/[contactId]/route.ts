import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

type RouteParams = { params: Promise<{ eventId: string; contactId: string }> };

/**
 * GET /api/events/[eventId]/scoring/[contactId] — Get single contact score detail
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  const { eventId, contactId } = await params;
  const db = getDb();

  const result = await db`
    SELECT
      c.id AS contact_id, c.full_name, c.first_name, c.last_name, c.photo_url,
      c.company, c.title, c.industry, c.role_seniority, c.ai_summary,
      c.emails, c.tags, c.enrichment_status,
      gs.id AS score_id, gs.relevance_score, gs.matched_objectives,
      gs.score_rationale, gs.talking_points, gs.scored_at, gs.model_version
    FROM people_contacts c
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${parseInt(eventId)}
    WHERE c.id = ${contactId}
      AND c.workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new NotFoundError('Contact');
  }

  return NextResponse.json(result[0]);
});

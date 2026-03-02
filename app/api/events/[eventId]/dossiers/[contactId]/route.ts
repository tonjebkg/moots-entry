import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/dossiers/[contactId] — Get full dossier for a contact
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { eventId, contactId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum);
  const db = getDb();

  // Contact info with invitation data
  const contacts = await db`
    SELECT
      c.id AS contact_id, c.full_name, c.company, c.title, c.photo_url, c.linkedin_url,
      c.emails, c.ai_summary, c.tags, c.enrichment_data, c.enriched_at,
      c.source, c.enrichment_status,
      ci.id AS invitation_id,
      ci.status AS invitation_status,
      ic.name AS campaign_name
    FROM people_contacts c
    LEFT JOIN campaign_invitations ci ON ci.contact_id = c.id AND ci.event_id = ${eventIdNum}
    LEFT JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE c.id = ${contactId} AND c.workspace_id = ${workspaceId}
  `;

  if (contacts.length === 0) {
    throw new NotFoundError('Contact');
  }

  const contact = contacts[0];

  // Scoring data
  const scores = await db`
    SELECT relevance_score, score_rationale, talking_points, matched_objectives
    FROM guest_scores
    WHERE contact_id = ${contactId} AND event_id = ${eventIdNum}
  `;

  // Enrich matched_objectives with objective_text
  const score = scores[0] || {};
  if (score.matched_objectives && Array.isArray(score.matched_objectives)) {
    const objectives = await db`
      SELECT id, objective_text FROM event_objectives WHERE event_id = ${eventIdNum}
    `;
    const objectiveMap: Record<string, string> = {};
    for (const obj of objectives) {
      objectiveMap[obj.id] = obj.objective_text;
    }
    score.matched_objectives = score.matched_objectives.map((mo: any) => ({
      ...mo,
      objective_text: mo.objective_text || objectiveMap[mo.objective_id] || 'Unknown objective',
    }));
  }

  // Team assignments
  const assignments = await db`
    SELECT gta.*, u.full_name AS assigned_to_name, u.email AS assigned_to_email
    FROM guest_team_assignments gta
    JOIN users u ON u.id = gta.assigned_to
    WHERE gta.contact_id = ${contactId}
      AND gta.event_id = ${eventIdNum}
      AND gta.workspace_id = ${workspaceId}
  `;

  const dossier = {
    contact_id: contact.contact_id,
    full_name: contact.full_name,
    company: contact.company,
    title: contact.title,
    photo_url: contact.photo_url,
    linkedin_url: contact.linkedin_url,
    email: contact.emails?.[0]?.email || contact.emails?.[0] || null,
    ai_summary: contact.ai_summary,
    tags: contact.tags || [],
    source: contact.source,
    enrichment_status: contact.enrichment_status,
    relevance_score: score.relevance_score || null,
    score_rationale: score.score_rationale || null,
    talking_points: score.talking_points || [],
    matched_objectives: score.matched_objectives || [],
    invitation_id: contact.invitation_id || null,
    invitation_status: contact.invitation_status || null,
    campaign_name: contact.campaign_name || null,
    team_assignments: assignments,
    enrichment_data: contact.enrichment_data || {},
    enriched_at: contact.enriched_at,
  };

  return NextResponse.json(dossier);
});

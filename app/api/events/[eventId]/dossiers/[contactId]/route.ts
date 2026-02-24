import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/dossiers/[contactId] — Get full dossier for a contact
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId, contactId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  // Contact info
  const contacts = await db`
    SELECT
      id AS contact_id, full_name, company, title, photo_url, linkedin_url,
      emails, ai_summary, tags, enrichment_data, enriched_at
    FROM people_contacts
    WHERE id = ${contactId} AND workspace_id = ${auth.workspace.id}
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

  // Team assignments
  const assignments = await db`
    SELECT gta.*, u.full_name AS assigned_to_name, u.email AS assigned_to_email
    FROM guest_team_assignments gta
    JOIN users u ON u.id = gta.assigned_to
    WHERE gta.contact_id = ${contactId}
      AND gta.event_id = ${eventIdNum}
      AND gta.workspace_id = ${auth.workspace.id}
  `;

  const score = scores[0] || {};

  const dossier = {
    contact_id: contact.contact_id,
    full_name: contact.full_name,
    company: contact.company,
    title: contact.title,
    photo_url: contact.photo_url,
    linkedin_url: contact.linkedin_url,
    email: contact.emails?.[0] || null,
    ai_summary: contact.ai_summary,
    tags: contact.tags || [],
    relevance_score: score.relevance_score || null,
    score_rationale: score.score_rationale || null,
    talking_points: score.talking_points || [],
    matched_objectives: score.matched_objectives || [],
    team_assignments: assignments,
    enrichment_data: contact.enrichment_data || {},
    enriched_at: contact.enriched_at,
  };

  return NextResponse.json(dossier);
});

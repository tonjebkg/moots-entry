import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/dossiers — Get dossier summaries for all scored contacts
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const dossiers = await db`
    SELECT
      pc.id AS contact_id,
      pc.full_name,
      pc.company,
      pc.title,
      pc.photo_url,
      pc.tags,
      gs.relevance_score,
      gs.score_rationale,
      gs.talking_points,
      (
        SELECT json_agg(json_build_object(
          'id', gta.id,
          'assigned_to', gta.assigned_to,
          'assigned_to_name', u.full_name,
          'role', gta.role
        ))
        FROM guest_team_assignments gta
        JOIN users u ON u.id = gta.assigned_to
        WHERE gta.contact_id = pc.id AND gta.event_id = ${eventIdNum}
      ) AS team_assignments
    FROM guest_scores gs
    JOIN people_contacts pc ON pc.id = gs.contact_id
    WHERE gs.event_id = ${eventIdNum}
      AND gs.workspace_id = ${auth.workspace.id}
    ORDER BY gs.relevance_score DESC NULLS LAST
  `;

  return NextResponse.json({ dossiers });
});

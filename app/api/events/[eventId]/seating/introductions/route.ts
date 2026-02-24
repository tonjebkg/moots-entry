import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { generateIntroductionPairings } from '@/lib/seating/optimizer';
import { generateIntroductionsSchema } from '@/lib/schemas/seating';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/seating/introductions — Get existing pairings
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const pairings = await db`
    SELECT
      ip.*,
      ca.full_name AS contact_a_name,
      ca.company AS contact_a_company,
      cb.full_name AS contact_b_name,
      cb.company AS contact_b_company
    FROM introduction_pairings ip
    JOIN people_contacts ca ON ca.id = ip.contact_a_id
    JOIN people_contacts cb ON cb.id = ip.contact_b_id
    WHERE ip.event_id = ${eventIdNum}
      AND ip.workspace_id = ${auth.workspace.id}
    ORDER BY ip.priority ASC, ip.created_at DESC
  `;

  return NextResponse.json({ pairings });
});

/**
 * POST /api/events/[eventId]/seating/introductions — Generate AI introduction pairings
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, generateIntroductionsSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { max_pairings } = validation.data;

  const result = await generateIntroductionPairings(
    eventIdNum,
    auth.workspace.id,
    max_pairings
  );

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'seating.generate_introductions',
    entityType: 'introduction_pairing',
    entityId: result.batchId,
    newValue: { event_id: eventIdNum, pairing_count: result.pairings.length },
  });

  return NextResponse.json({
    batch_id: result.batchId,
    pairings: result.pairings,
    total: result.pairings.length,
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole, tryAuthOrEventFallback } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { logAgentActivity } from '@/lib/agent/activity';
import { generateIntroductionPairings } from '@/lib/seating/optimizer';
import { generateIntroductionsSchema, createManualPairingSchema } from '@/lib/schemas/seating';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/seating/introductions — Get existing pairings
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum);
  const db = getDb();

  const pairings = await db`
    SELECT
      ip.*,
      ca.full_name AS contact_a_name,
      ca.company AS contact_a_company,
      ca.title AS contact_a_title,
      cb.full_name AS contact_b_name,
      cb.company AS contact_b_company,
      cb.title AS contact_b_title
    FROM introduction_pairings ip
    JOIN people_contacts ca ON ca.id = ip.contact_a_id
    JOIN people_contacts cb ON cb.id = ip.contact_b_id
    WHERE ip.event_id = ${eventIdNum}
      AND ip.workspace_id = ${workspaceId}
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

  const mustMeet = result.pairings.filter(p => p.priority === 1).length;
  await logAgentActivity({
    eventId: eventIdNum,
    workspaceId: auth.workspace.id,
    type: 'introduction',
    headline: `Identified ${result.pairings.length} introduction pairings${mustMeet > 0 ? ` — ${mustMeet} are must-meets` : ''}`,
    detail: `Analyzed guest profiles and objectives to find the highest-value connections for your event.`,
    metadata: { batch_id: result.batchId, pairing_count: result.pairings.length, must_meet: mustMeet },
  });

  return NextResponse.json({
    batch_id: result.batchId,
    pairings: result.pairings,
    total: result.pairings.length,
  });
});

/**
 * PUT /api/events/[eventId]/seating/introductions — Create a manual pairing
 */
export const PUT = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, createManualPairingSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { contact_a_id, contact_b_id, reason } = validation.data;
  const db = getDb();

  const [pairing] = await db`
    INSERT INTO introduction_pairings (event_id, workspace_id, contact_a_id, contact_b_id, reason, priority, batch_id)
    VALUES (${eventIdNum}, ${auth.workspace.id}, ${contact_a_id}, ${contact_b_id}, ${reason}, 2, gen_random_uuid())
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'seating.create_manual_pairing',
    entityType: 'introduction_pairing',
    entityId: pairing.id,
    newValue: { event_id: eventIdNum, contact_a_id, contact_b_id, reason },
  });

  return NextResponse.json({ pairing }, { status: 201 });
});

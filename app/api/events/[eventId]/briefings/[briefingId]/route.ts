import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/briefings/[briefingId] — Get briefing detail
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { briefingId } = await context.params;
  const db = getDb();

  const result = await db`
    SELECT bp.*, u.full_name AS generated_for_name, u.email AS generated_for_email
    FROM briefing_packets bp
    JOIN users u ON u.id = bp.generated_for
    WHERE bp.id = ${briefingId} AND bp.workspace_id = ${auth.workspace.id}
  `;

  if (result.length === 0) throw new NotFoundError('Briefing');

  return NextResponse.json(result[0]);
});

/**
 * DELETE /api/events/[eventId]/briefings/[briefingId]
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { briefingId } = await context.params;
  const db = getDb();

  const result = await db`
    DELETE FROM briefing_packets
    WHERE id = ${briefingId} AND workspace_id = ${auth.workspace.id}
    RETURNING id
  `;

  if (result.length === 0) throw new NotFoundError('Briefing');

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'briefing.deleted',
    entityType: 'briefing_packet',
    entityId: briefingId,
  });

  return new Response(null, { status: 204 });
});

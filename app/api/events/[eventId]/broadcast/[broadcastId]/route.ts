import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { updateBroadcastSchema } from '@/lib/schemas/broadcast';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/broadcast/[broadcastId]
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { broadcastId } = await context.params;
  const db = getDb();

  const result = await db`
    SELECT bm.*, u.full_name AS created_by_name
    FROM broadcast_messages bm
    LEFT JOIN users u ON u.id = bm.created_by
    WHERE bm.id = ${broadcastId} AND bm.workspace_id = ${auth.workspace.id}
  `;

  if (result.length === 0) throw new NotFoundError('Broadcast');

  return NextResponse.json(result[0]);
});

/**
 * PATCH /api/events/[eventId]/broadcast/[broadcastId]
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { broadcastId } = await context.params;
  const validation = await validateRequest(request, updateBroadcastSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const d = validation.data;

  // Only allow editing DRAFT or SCHEDULED broadcasts
  const existing = await db`
    SELECT status FROM broadcast_messages
    WHERE id = ${broadcastId} AND workspace_id = ${auth.workspace.id}
  `;

  if (existing.length === 0) throw new NotFoundError('Broadcast');
  if (!['DRAFT', 'SCHEDULED'].includes(existing[0].status)) {
    return NextResponse.json({ error: 'Cannot edit sent broadcasts' }, { status: 400 });
  }

  const filterJson = d.recipient_filter ? JSON.stringify(d.recipient_filter) : undefined;

  const result = await db`
    UPDATE broadcast_messages SET
      subject = COALESCE(${d.subject ?? null}, subject),
      content = COALESCE(${d.content ?? null}, content),
      status = COALESCE(${d.status ?? null}::broadcast_status, status),
      recipient_filter = COALESCE(${filterJson ?? null}::jsonb, recipient_filter),
      scheduled_at = COALESCE(${d.scheduled_at ?? null}, scheduled_at)
    WHERE id = ${broadcastId} AND workspace_id = ${auth.workspace.id}
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'broadcast.updated',
    entityType: 'broadcast_message',
    entityId: broadcastId,
    newValue: d,
  });

  return NextResponse.json(result[0]);
});

/**
 * DELETE /api/events/[eventId]/broadcast/[broadcastId]
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { broadcastId } = await context.params;
  const db = getDb();

  const result = await db`
    DELETE FROM broadcast_messages
    WHERE id = ${broadcastId} AND workspace_id = ${auth.workspace.id}
      AND status IN ('DRAFT', 'SCHEDULED')
    RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Cannot delete sent broadcasts' }, { status: 400 });
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'broadcast.deleted',
    entityType: 'broadcast_message',
    entityId: broadcastId,
  });

  return new Response(null, { status: 204 });
});

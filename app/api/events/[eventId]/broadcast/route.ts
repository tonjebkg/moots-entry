import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { createBroadcastSchema } from '@/lib/schemas/broadcast';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/broadcast — List broadcasts
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const broadcasts = await db`
    SELECT bm.*, u.full_name AS created_by_name
    FROM broadcast_messages bm
    LEFT JOIN users u ON u.id = bm.created_by
    WHERE bm.event_id = ${eventIdNum} AND bm.workspace_id = ${auth.workspace.id}
    ORDER BY bm.created_at DESC
  `;

  return NextResponse.json({ broadcasts });
});

/**
 * POST /api/events/[eventId]/broadcast — Create broadcast
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const validation = await validateRequest(request, createBroadcastSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();
  const d = validation.data;
  const filterJson = JSON.stringify(d.recipient_filter);

  const status = d.scheduled_at ? 'SCHEDULED' : 'DRAFT';

  const result = await db`
    INSERT INTO broadcast_messages (
      event_id, workspace_id, created_by,
      subject, content, status, recipient_filter, scheduled_at
    ) VALUES (
      ${eventIdNum}, ${auth.workspace.id}, ${auth.user.id},
      ${d.subject}, ${d.content}, ${status}::broadcast_status,
      ${filterJson}::jsonb, ${d.scheduled_at || null}
    )
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'broadcast.created',
    entityType: 'broadcast_message',
    entityId: result[0].id,
    newValue: { subject: d.subject, status },
  });

  return NextResponse.json(result[0], { status: 201 });
});

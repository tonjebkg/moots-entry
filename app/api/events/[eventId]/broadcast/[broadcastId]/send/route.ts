import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError, RateLimitError } from '@/lib/errors';
import { sendBroadcast } from '@/lib/broadcast/sender';
import { checkBroadcastSendRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/events/[eventId]/broadcast/[broadcastId]/send — Send broadcast now
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  // Rate limit
  const rateCheck = checkBroadcastSendRateLimit(`broadcast:${auth.user.id}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  const { eventId, broadcastId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  // Verify broadcast exists and is in DRAFT or SCHEDULED status
  const existing = await db`
    SELECT * FROM broadcast_messages
    WHERE id = ${broadcastId} AND workspace_id = ${auth.workspace.id}
  `;

  if (existing.length === 0) throw new NotFoundError('Broadcast');
  if (!['DRAFT', 'SCHEDULED'].includes(existing[0].status)) {
    return NextResponse.json({ error: 'Broadcast already sent' }, { status: 400 });
  }

  // Fetch event title for email
  const events = await db`SELECT title FROM events WHERE id = ${eventIdNum}`;
  const eventTitle = events[0]?.title || `Event #${eventId}`;

  // Send broadcast (this may take a while)
  const result = await sendBroadcast(
    broadcastId,
    eventIdNum,
    auth.workspace.id,
    existing[0].subject,
    existing[0].content,
    eventTitle
  );

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'broadcast.sent',
    entityType: 'broadcast_message',
    entityId: broadcastId,
    newValue: result,
  });

  return NextResponse.json({
    success: true,
    delivered: result.delivered,
    failed: result.failed,
  });
});

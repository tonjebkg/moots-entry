import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * DELETE /api/events/[eventId]/checkin-tokens/[tokenId] — Revoke a check-in token
 */
export const DELETE = withErrorHandling(async (_request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { eventId, tokenId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const result = await db`
    UPDATE checkin_tokens
    SET revoked_at = NOW(), updated_at = NOW()
    WHERE id = ${tokenId}
      AND event_id = ${eventIdNum}
      AND workspace_id = ${auth.workspace.id}
      AND revoked_at IS NULL
    RETURNING id
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Token not found or already revoked' }, { status: 404 });
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'checkin_token.revoked',
    entityType: 'checkin_token',
    entityId: tokenId,
    metadata: { event_id: eventIdNum },
  });

  return NextResponse.json({ success: true });
});

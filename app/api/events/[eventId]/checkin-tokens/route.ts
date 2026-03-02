import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { generateCheckinToken } from '@/lib/checkin-token';

export const runtime = 'nodejs';

const createTokenSchema = z.object({
  pin_code: z.string().min(4).max(8).optional(),
  expires_in_hours: z.number().min(1).max(168).default(24), // max 7 days
});

/**
 * POST /api/events/[eventId]/checkin-tokens — Create a new check-in token
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, createTokenSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  // Verify event belongs to workspace
  const events = await db`
    SELECT id FROM events
    WHERE id = ${eventIdNum} AND workspace_id = ${auth.workspace.id}
  `;
  if (events.length === 0) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const token = generateCheckinToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + validation.data.expires_in_hours);

  const result = await db`
    INSERT INTO checkin_tokens (event_id, workspace_id, token, pin_code, created_by, expires_at)
    VALUES (
      ${eventIdNum},
      ${auth.workspace.id},
      ${token},
      ${validation.data.pin_code || null},
      ${auth.user.id},
      ${expiresAt.toISOString()}
    )
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'checkin_token.created',
    entityType: 'checkin_token',
    entityId: result[0].id,
    newValue: { event_id: eventIdNum, expires_at: expiresAt.toISOString() },
  });

  return NextResponse.json({
    ...result[0],
    url: `${request.nextUrl.origin}/door/${token}`,
  }, { status: 201 });
});

/**
 * GET /api/events/[eventId]/checkin-tokens — List active tokens for this event
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const tokens = await db`
    SELECT ct.*, u.full_name AS created_by_name
    FROM checkin_tokens ct
    LEFT JOIN users u ON u.id = ct.created_by
    WHERE ct.event_id = ${eventIdNum}
      AND ct.workspace_id = ${auth.workspace.id}
      AND ct.revoked_at IS NULL
      AND ct.expires_at > NOW()
    ORDER BY ct.created_at DESC
  `;

  return NextResponse.json({ tokens });
});

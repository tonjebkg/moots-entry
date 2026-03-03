import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { z } from 'zod';

/**
 * GET /api/settings/messaging — List connected messaging channels for current user
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const db = getDb();

  const channels = await db`
    SELECT
      id, channel_type, channel_user_id, display_name,
      is_verified, paired_at, last_message_at, created_at
    FROM team_member_channels
    WHERE user_id = ${auth.user.id}
      AND workspace_id = ${auth.workspace.id}
      AND is_verified = true
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ channels });
});

const pairSchema = z.object({
  code: z
    .string()
    .length(6, 'Pairing code must be 6 digits')
    .regex(/^\d{6}$/, 'Pairing code must be 6 digits'),
});

/**
 * POST /api/settings/messaging — Verify a pairing code and link channel to current user
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const result = await validateRequest(request, pairSchema);
  if (!result.success) return result.error;
  const { code } = result.data;

  const db = getDb();

  // Look up the pairing code
  const pending = await db`
    SELECT id, channel_type, channel_user_id, display_name
    FROM team_member_channels
    WHERE pairing_code = ${code}
      AND pairing_expires_at > NOW()
    LIMIT 1
  `;

  if (!pending.length) {
    return NextResponse.json(
      { error: 'Invalid or expired pairing code' },
      { status: 400 }
    );
  }

  const channel = pending[0];

  // Check if this channel is already verified for another user
  const existingVerified = await db`
    SELECT id FROM team_member_channels
    WHERE channel_type = ${channel.channel_type}
      AND channel_user_id = ${channel.channel_user_id}
      AND is_verified = true
      AND id != ${channel.id}
    LIMIT 1
  `;

  if (existingVerified.length) {
    return NextResponse.json(
      { error: 'This messaging account is already linked to another user' },
      { status: 409 }
    );
  }

  // Verify the pairing: set user_id, workspace_id, mark verified, clear code
  const updated = await db`
    UPDATE team_member_channels
    SET
      user_id = ${auth.user.id},
      workspace_id = ${auth.workspace.id},
      is_verified = true,
      paired_at = NOW(),
      pairing_code = NULL,
      pairing_expires_at = NULL
    WHERE id = ${channel.id}
    RETURNING id, channel_type, channel_user_id, display_name, paired_at
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'messaging.channel_paired',
    entityType: 'team_member_channel',
    entityId: updated[0].id,
    newValue: {
      channel_type: channel.channel_type,
      channel_user_id: channel.channel_user_id,
      display_name: channel.display_name,
    },
  });

  return NextResponse.json({
    message: 'Channel linked successfully',
    channel: updated[0],
  });
});

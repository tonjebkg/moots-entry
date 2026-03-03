import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';

/**
 * DELETE /api/settings/messaging/[channelId] — Disconnect a messaging channel
 */
export const DELETE = withErrorHandling(
  async (
    _request: NextRequest,
    { params }: { params: Promise<{ channelId: string }> }
  ) => {
    const auth = await requireAuth();
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

    const { channelId } = await params;
    const db = getDb();

    // Verify the channel belongs to the current user and workspace
    const existing = await db`
      SELECT id, channel_type, channel_user_id, display_name
      FROM team_member_channels
      WHERE id = ${channelId}
        AND user_id = ${auth.user.id}
        AND workspace_id = ${auth.workspace.id}
      LIMIT 1
    `;

    if (!existing.length) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    const channel = existing[0];

    // Delete the channel
    await db`
      DELETE FROM team_member_channels
      WHERE id = ${channelId}
        AND user_id = ${auth.user.id}
        AND workspace_id = ${auth.workspace.id}
    `;

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'messaging.channel_disconnected',
      entityType: 'team_member_channel',
      entityId: channelId,
      previousValue: {
        channel_type: channel.channel_type,
        channel_user_id: channel.channel_user_id,
        display_name: channel.display_name,
      },
    });

    return NextResponse.json({ message: 'Channel disconnected' });
  }
);

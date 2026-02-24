import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { inviteMemberSchema } from '@/lib/schemas/workspace';
import { requireAuth, requireRole, generateToken } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ForbiddenError, ConflictError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { sendWorkspaceInviteEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/workspaces/[workspaceId]/members — List workspace members
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  const { workspaceId } = await context.params;

  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only view members of your active workspace');
  }

  const db = getDb();

  const result = await db`
    SELECT
      wm.id, wm.workspace_id, wm.user_id, wm.role, wm.event_ids,
      wm.invited_at, wm.accepted_at, wm.last_active_at,
      u.email AS user_email,
      u.full_name AS user_full_name,
      u.avatar_url AS user_avatar_url
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY
      CASE wm.role
        WHEN 'OWNER' THEN 0
        WHEN 'ADMIN' THEN 1
        WHEN 'TEAM_MEMBER' THEN 2
        WHEN 'EXTERNAL_PARTNER' THEN 3
        WHEN 'VIEWER' THEN 4
      END,
      wm.invited_at ASC
  `;

  return NextResponse.json({ members: result });
});

/**
 * POST /api/workspaces/[workspaceId]/members — Invite a member
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId } = await context.params;

  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only invite to your active workspace');
  }

  const validation = await validateRequest(request, inviteMemberSchema);
  if (!validation.success) return validation.error;
  const { email, role, event_ids } = validation.data;

  const db = getDb();

  // Check if already a member
  const existingUser = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existingUser.length > 0) {
    const existingMember = await db`
      SELECT id FROM workspace_members
      WHERE workspace_id = ${workspaceId} AND user_id = ${existingUser[0].id}
      LIMIT 1
    `;
    if (existingMember.length > 0) {
      throw new ConflictError('This user is already a member of this workspace');
    }

    // User exists but not a member — add them directly
    await db`
      INSERT INTO workspace_members (workspace_id, user_id, role, event_ids, accepted_at)
      VALUES (${workspaceId}, ${existingUser[0].id}, ${role}, ${event_ids ?? null}, NOW())
    `;

    logAction({
      workspaceId,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'workspace.member_added',
      entityType: 'workspace_member',
      entityId: existingUser[0].id,
      newValue: { email, role },
      ipAddress: getClientIdentifier(request),
    });

    return NextResponse.json({ message: 'Member added successfully' }, { status: 201 });
  }

  // User doesn't exist — create invitation token
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  await db`
    INSERT INTO verification_tokens (email, token, type, expires_at, metadata)
    VALUES (
      ${email},
      ${token},
      'WORKSPACE_INVITE',
      ${expiresAt}::timestamptz,
      ${JSON.stringify({ workspace_id: workspaceId, role, event_ids })}::jsonb
    )
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/signup/invite/${token}`;

  // Send invite email via Resend
  const emailResult = await sendWorkspaceInviteEmail({
    to: email,
    inviterName: auth.user.full_name || auth.user.email,
    workspaceName: auth.workspace.name,
    role,
    inviteUrl,
  });
  if (!emailResult.success) {
    logger.error('Failed to send workspace invite email', undefined, { email, error: emailResult.error });
  } else {
    logger.info('Workspace invite email sent', { email, workspaceId });
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'workspace.member_invited',
    entityType: 'workspace_member',
    newValue: { email, role },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ message: 'Invitation sent', invite_url: inviteUrl }, { status: 201 });
});

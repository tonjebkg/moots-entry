import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { updateMemberSchema } from '@/lib/schemas/workspace';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string; memberId: string }> };

/**
 * PATCH /api/workspaces/[workspaceId]/members/[memberId] — Update member role
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId, memberId } = await context.params;

  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only manage members of your active workspace');
  }

  const validation = await validateRequest(request, updateMemberSchema);
  if (!validation.success) return validation.error;
  const updates = validation.data;

  const db = getDb();

  // Find member
  const memberResult = await db`
    SELECT wm.id, wm.user_id, wm.role, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.id = ${memberId} AND wm.workspace_id = ${workspaceId}
    LIMIT 1
  `;

  if (memberResult.length === 0) {
    throw new NotFoundError('Member');
  }

  const member = memberResult[0];

  // Cannot change the OWNER role
  if (member.role === 'OWNER') {
    throw new ValidationError('Cannot modify the workspace owner\'s role');
  }

  // Apply updates
  if (updates.role !== undefined) {
    await db`
      UPDATE workspace_members SET role = ${updates.role}
      WHERE id = ${memberId}
    `;
  }
  if (updates.event_ids !== undefined) {
    await db`
      UPDATE workspace_members SET event_ids = ${updates.event_ids}
      WHERE id = ${memberId}
    `;
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'workspace.member_updated',
    entityType: 'workspace_member',
    entityId: memberId,
    previousValue: { role: member.role },
    newValue: updates,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ message: 'Member updated' });
});

/**
 * DELETE /api/workspaces/[workspaceId]/members/[memberId] — Remove member
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId, memberId } = await context.params;

  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only manage members of your active workspace');
  }

  const db = getDb();

  // Find member
  const memberResult = await db`
    SELECT wm.id, wm.user_id, wm.role, u.email
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.id = ${memberId} AND wm.workspace_id = ${workspaceId}
    LIMIT 1
  `;

  if (memberResult.length === 0) {
    throw new NotFoundError('Member');
  }

  const member = memberResult[0];

  // Cannot remove the OWNER
  if (member.role === 'OWNER') {
    throw new ValidationError('Cannot remove the workspace owner');
  }

  // Cannot remove yourself (use leave instead)
  if (member.user_id === auth.user.id) {
    throw new ValidationError('Cannot remove yourself. Use the leave action instead.');
  }

  await db`DELETE FROM workspace_members WHERE id = ${memberId}`;

  // Also remove any sessions for this user in this workspace
  await db`DELETE FROM sessions WHERE user_id = ${member.user_id} AND workspace_id = ${workspaceId}`;

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'workspace.member_removed',
    entityType: 'workspace_member',
    entityId: memberId,
    previousValue: { email: member.email, role: member.role },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ message: 'Member removed' });
});

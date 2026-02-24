import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';
import { updateTeamAssignmentSchema } from '@/lib/schemas/dossier';

export const runtime = 'nodejs';

/**
 * PATCH /api/events/[eventId]/team-assignments/[assignmentId]
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { assignmentId } = await context.params;
  const validation = await validateRequest(request, updateTeamAssignmentSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const { role, notes } = validation.data;

  const result = await db`
    UPDATE guest_team_assignments
    SET
      role = COALESCE(${role ?? null}, role),
      notes = COALESCE(${notes ?? null}, notes)
    WHERE id = ${assignmentId} AND workspace_id = ${auth.workspace.id}
    RETURNING *
  `;

  if (result.length === 0) throw new NotFoundError('Team assignment');

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'team_assignment.updated',
    entityType: 'guest_team_assignment',
    entityId: assignmentId,
    newValue: validation.data,
  });

  return NextResponse.json(result[0]);
});

/**
 * DELETE /api/events/[eventId]/team-assignments/[assignmentId]
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { assignmentId } = await context.params;
  const db = getDb();

  const result = await db`
    DELETE FROM guest_team_assignments
    WHERE id = ${assignmentId} AND workspace_id = ${auth.workspace.id}
    RETURNING id
  `;

  if (result.length === 0) throw new NotFoundError('Team assignment');

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'team_assignment.deleted',
    entityType: 'guest_team_assignment',
    entityId: assignmentId,
  });

  return new Response(null, { status: 204 });
});

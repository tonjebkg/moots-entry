import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { NotFoundError } from '@/lib/errors';
import { updateObjectiveSchema } from '@/lib/schemas/objective';

type RouteParams = { params: Promise<{ eventId: string; objectiveId: string }> };

/**
 * PATCH /api/events/[eventId]/objectives/[objectiveId] — Update an objective
 */
export const PATCH = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');
  const { eventId, objectiveId } = await params;

  const result = await validateRequest(request, updateObjectiveSchema);
  if (!result.success) return result.error;
  const { data } = result;

  const db = getDb();

  const updated = await db`
    UPDATE event_objectives SET
      objective_text = COALESCE(${data.objective_text ?? null}, objective_text),
      weight = COALESCE(${data.weight ?? null}, weight),
      criteria_config = COALESCE(${data.criteria_config ? JSON.stringify(data.criteria_config) : null}::jsonb, criteria_config),
      sort_order = COALESCE(${data.sort_order ?? null}, sort_order)
    WHERE id = ${objectiveId}
      AND event_id = ${parseInt(eventId)}
      AND workspace_id = ${auth.workspace.id}
    RETURNING *
  `;

  if (updated.length === 0) {
    throw new NotFoundError('Objective');
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'objective.updated',
    entityType: 'event_objective',
    entityId: objectiveId,
    newValue: data,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json(updated[0]);
});

/**
 * DELETE /api/events/[eventId]/objectives/[objectiveId] — Delete an objective
 */
export const DELETE = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');
  const { eventId, objectiveId } = await params;

  const db = getDb();

  const deleted = await db`
    DELETE FROM event_objectives
    WHERE id = ${objectiveId}
      AND event_id = ${parseInt(eventId)}
      AND workspace_id = ${auth.workspace.id}
    RETURNING id, objective_text
  `;

  if (deleted.length === 0) {
    throw new NotFoundError('Objective');
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'objective.deleted',
    entityType: 'event_objective',
    entityId: objectiveId,
    previousValue: { objective_text: deleted[0].objective_text },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true });
});

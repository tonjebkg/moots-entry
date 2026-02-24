import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { createObjectiveSchema, bulkObjectivesSchema } from '@/lib/schemas/objective';

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/objectives — List objectives for an event
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  const { eventId } = await params;
  const db = getDb();

  const objectives = await db`
    SELECT * FROM event_objectives
    WHERE event_id = ${parseInt(eventId)}
      AND workspace_id = ${auth.workspace.id}
    ORDER BY sort_order ASC, created_at ASC
  `;

  return NextResponse.json({ objectives });
});

/**
 * POST /api/events/[eventId]/objectives — Create a single objective
 */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');
  const { eventId } = await params;

  const result = await validateRequest(request, createObjectiveSchema);
  if (!result.success) return result.error;
  const { data } = result;

  const db = getDb();
  const configJson = JSON.stringify(data.criteria_config);

  const objective = await db`
    INSERT INTO event_objectives (
      event_id, workspace_id, objective_text, weight, criteria_config, sort_order
    ) VALUES (
      ${parseInt(eventId)},
      ${auth.workspace.id},
      ${data.objective_text},
      ${data.weight},
      ${configJson}::jsonb,
      ${data.sort_order}
    )
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'objective.created',
    entityType: 'event_objective',
    entityId: objective[0].id,
    newValue: { objective_text: data.objective_text, weight: data.weight },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json(objective[0], { status: 201 });
});

/**
 * PUT /api/events/[eventId]/objectives — Bulk upsert objectives
 */
export const PUT = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');
  const { eventId } = await params;

  const result = await validateRequest(request, bulkObjectivesSchema);
  if (!result.success) return result.error;
  const { objectives } = result.data;

  const db = getDb();
  const eventIdNum = parseInt(eventId);
  const upserted = [];

  for (let i = 0; i < objectives.length; i++) {
    const obj = objectives[i];
    const configJson = JSON.stringify(obj.criteria_config);

    if (obj.id) {
      // Update existing
      const updated = await db`
        UPDATE event_objectives SET
          objective_text = ${obj.objective_text},
          weight = ${obj.weight},
          criteria_config = ${configJson}::jsonb,
          sort_order = ${i}
        WHERE id = ${obj.id}
          AND event_id = ${eventIdNum}
          AND workspace_id = ${auth.workspace.id}
        RETURNING *
      `;
      if (updated.length > 0) upserted.push(updated[0]);
    } else {
      // Insert new
      const created = await db`
        INSERT INTO event_objectives (
          event_id, workspace_id, objective_text, weight, criteria_config, sort_order
        ) VALUES (
          ${eventIdNum}, ${auth.workspace.id}, ${obj.objective_text},
          ${obj.weight}, ${configJson}::jsonb, ${i}
        )
        RETURNING *
      `;
      upserted.push(created[0]);
    }
  }

  // Delete objectives that are not in the new list
  const existingIds = upserted.map(o => o.id);
  if (existingIds.length > 0) {
    await db`
      DELETE FROM event_objectives
      WHERE event_id = ${eventIdNum}
        AND workspace_id = ${auth.workspace.id}
        AND id != ALL(${existingIds}::uuid[])
    `;
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'objective.bulk_upserted',
    entityType: 'event_objective',
    entityId: eventId,
    metadata: { count: upserted.length },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ objectives: upserted });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { teamAssignmentSchema, bulkTeamAssignmentSchema } from '@/lib/schemas/dossier';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/team-assignments — List team assignments
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const assignments = await db`
    SELECT gta.*,
      u.full_name AS assigned_to_name,
      u.email AS assigned_to_email,
      pc.full_name AS contact_name
    FROM guest_team_assignments gta
    JOIN users u ON u.id = gta.assigned_to
    JOIN people_contacts pc ON pc.id = gta.contact_id
    WHERE gta.event_id = ${eventIdNum}
      AND gta.workspace_id = ${auth.workspace.id}
    ORDER BY pc.full_name
  `;

  return NextResponse.json({ assignments });
});

/**
 * POST /api/events/[eventId]/team-assignments — Create assignment(s)
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  // Try bulk first, fall back to single
  const body = await request.clone().json();
  const isBulk = Array.isArray(body.assignments);

  if (isBulk) {
    const validation = await validateRequest(request, bulkTeamAssignmentSchema);
    if (!validation.success) return validation.error;

    const results = [];
    for (const a of validation.data.assignments) {
      const result = await db`
        INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role, notes)
        VALUES (${eventIdNum}, ${auth.workspace.id}, ${a.contact_id}, ${a.assigned_to}, ${a.role}, ${a.notes || null})
        ON CONFLICT (event_id, contact_id, assigned_to) DO UPDATE SET
          role = EXCLUDED.role, notes = EXCLUDED.notes
        RETURNING *
      `;
      results.push(result[0]);
    }

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'team_assignment.bulk_created',
      entityType: 'guest_team_assignment',
      metadata: { event_id: eventIdNum, count: results.length },
    });

    return NextResponse.json({ assignments: results }, { status: 201 });
  }

  // Single assignment
  const validation = await validateRequest(request, teamAssignmentSchema);
  if (!validation.success) return validation.error;

  const { contact_id, assigned_to, role, notes } = validation.data;

  const result = await db`
    INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role, notes)
    VALUES (${eventIdNum}, ${auth.workspace.id}, ${contact_id}, ${assigned_to}, ${role}, ${notes || null})
    ON CONFLICT (event_id, contact_id, assigned_to) DO UPDATE SET
      role = EXCLUDED.role, notes = EXCLUDED.notes
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'team_assignment.created',
    entityType: 'guest_team_assignment',
    entityId: result[0].id,
    newValue: { contact_id, assigned_to, role },
  });

  return NextResponse.json(result[0], { status: 201 });
});

/**
 * DELETE /api/events/[eventId]/team-assignments — Bulk delete by contact_id
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { contact_id } = await request.json();

  const db = getDb();
  await db`
    DELETE FROM guest_team_assignments
    WHERE event_id = ${eventIdNum}
      AND workspace_id = ${auth.workspace.id}
      AND contact_id = ${contact_id}
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'team_assignment.deleted',
    entityType: 'guest_team_assignment',
    metadata: { event_id: eventIdNum, contact_id },
  });

  return new Response(null, { status: 204 });
});

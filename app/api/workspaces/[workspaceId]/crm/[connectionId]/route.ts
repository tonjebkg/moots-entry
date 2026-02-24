import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { crmConnectionUpdateSchema } from '@/lib/schemas/crm';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * PATCH /api/workspaces/[workspaceId]/crm/[connectionId] — Update connection
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId, connectionId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, crmConnectionUpdateSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const { name, credentials, sync_direction, is_active } = validation.data;

  // Build dynamic update
  const updates: string[] = [];
  const connection = await db`
    SELECT * FROM crm_connections
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
  `;
  if (connection.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  const credJson = credentials ? JSON.stringify(credentials) : null;
  const result = await db`
    UPDATE crm_connections SET
      name = COALESCE(${name || null}, name),
      credentials = COALESCE(${credJson}::jsonb, credentials),
      sync_direction = COALESCE(${sync_direction || null}::crm_sync_direction, sync_direction),
      is_active = COALESCE(${is_active ?? null}, is_active),
      updated_at = NOW()
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
    RETURNING id, provider, name, sync_direction, is_active, updated_at
  `;

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'crm.connection_updated',
    entityType: 'crm_connection',
    entityId: connectionId,
    newValue: validation.data,
  });

  return NextResponse.json(result[0]);
});

/**
 * DELETE /api/workspaces/[workspaceId]/crm/[connectionId] — Remove connection
 */
export const DELETE = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId, connectionId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const result = await db`
    DELETE FROM crm_connections
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
    RETURNING id, provider, name
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'crm.connection_deleted',
    entityType: 'crm_connection',
    entityId: connectionId,
    previousValue: result[0],
  });

  return NextResponse.json({ success: true });
});

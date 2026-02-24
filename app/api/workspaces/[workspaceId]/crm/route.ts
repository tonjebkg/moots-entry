import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { crmConnectionSchema } from '@/lib/schemas/crm';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/workspaces/[workspaceId]/crm — List CRM connections
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { workspaceId } = await context.params;

  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const connections = await db`
    SELECT
      cc.*,
      u.full_name AS created_by_name
    FROM crm_connections cc
    LEFT JOIN users u ON u.id = cc.created_by
    WHERE cc.workspace_id = ${workspaceId}
    ORDER BY cc.created_at DESC
  `;

  // Redact credentials
  const safe = connections.map((c: any) => ({
    ...c,
    credentials: { configured: true },
  }));

  return NextResponse.json({ connections: safe });
});

/**
 * POST /api/workspaces/[workspaceId]/crm — Create CRM connection
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, crmConnectionSchema);
  if (!validation.success) return validation.error;

  const { provider, name, credentials, sync_direction } = validation.data;
  const db = getDb();

  // Check for existing active connection of same provider
  const existing = await db`
    SELECT id FROM crm_connections
    WHERE workspace_id = ${workspaceId} AND provider = ${provider}::crm_provider AND is_active = true
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { error: `An active ${provider} connection already exists` },
      { status: 409 }
    );
  }

  const credJson = JSON.stringify(credentials);
  const result = await db`
    INSERT INTO crm_connections (
      workspace_id, provider, name, credentials, sync_direction, created_by
    ) VALUES (
      ${workspaceId}, ${provider}::crm_provider, ${name},
      ${credJson}::jsonb, ${sync_direction}::crm_sync_direction, ${auth.user.id}
    ) RETURNING id, provider, name, sync_direction, is_active, created_at
  `;

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'crm.connection_created',
    entityType: 'crm_connection',
    entityId: result[0].id,
    newValue: { provider, name, sync_direction },
  });

  return NextResponse.json(result[0], { status: 201 });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { crmFieldMappingSchema } from '@/lib/schemas/crm';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/workspaces/[workspaceId]/crm/[connectionId]/field-mapping — Get field mapping
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { workspaceId, connectionId } = await context.params;

  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const result = await db`
    SELECT field_mapping, provider FROM crm_connections
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  return NextResponse.json({
    field_mapping: result[0].field_mapping || { contact_fields: [] },
    provider: result[0].provider,
  });
});

/**
 * PUT /api/workspaces/[workspaceId]/crm/[connectionId]/field-mapping — Update field mapping
 */
export const PUT = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId, connectionId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, crmFieldMappingSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const mappingJson = JSON.stringify(validation.data);

  const result = await db`
    UPDATE crm_connections SET
      field_mapping = ${mappingJson}::jsonb,
      updated_at = NOW()
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId}
    RETURNING id, field_mapping
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  }

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'crm.field_mapping_updated',
    entityType: 'crm_connection',
    entityId: connectionId,
    newValue: validation.data,
  });

  return NextResponse.json(result[0]);
});

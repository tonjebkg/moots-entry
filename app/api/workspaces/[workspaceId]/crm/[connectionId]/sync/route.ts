import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { triggerSyncSchema } from '@/lib/schemas/crm';
import { syncContactToCrm } from '@/lib/crm/provider';
import { salesforceProvider } from '@/lib/crm/salesforce';
import { hubspotProvider } from '@/lib/crm/hubspot';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/workspaces/[workspaceId]/crm/[connectionId]/sync — Trigger CRM sync
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { workspaceId, connectionId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, triggerSyncSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const { entity_type, contact_ids, event_id } = validation.data;

  // Fetch connection
  const connections = await db`
    SELECT * FROM crm_connections
    WHERE id = ${connectionId} AND workspace_id = ${workspaceId} AND is_active = true
  `;
  if (connections.length === 0) {
    return NextResponse.json({ error: 'Connection not found or inactive' }, { status: 404 });
  }

  const connection = connections[0];
  const provider = connection.provider === 'SALESFORCE' ? salesforceProvider : hubspotProvider;

  // Determine which contacts to sync
  let contactsToSync: string[] = [];

  if (contact_ids && contact_ids.length > 0) {
    contactsToSync = contact_ids;
  } else if (event_id) {
    const rows = await db`
      SELECT DISTINCT ci.contact_id
      FROM campaign_invitations ci
      WHERE ci.event_id = ${event_id}
        AND ci.contact_id IS NOT NULL
    `;
    contactsToSync = rows.map((r: any) => r.contact_id);
  } else {
    // Sync all workspace contacts
    const rows = await db`
      SELECT id FROM people_contacts
      WHERE workspace_id = ${workspaceId}
      LIMIT 500
    `;
    contactsToSync = rows.map((r: any) => r.id);
  }

  // Process sync
  let successCount = 0;
  let failedCount = 0;

  for (const contactId of contactsToSync) {
    const result = await syncContactToCrm(
      connectionId,
      workspaceId,
      contactId,
      provider,
      connection.credentials,
      connection.field_mapping || { contact_fields: [] }
    );

    if (result.success) successCount++;
    else failedCount++;
  }

  // Update last sync timestamp
  await db`
    UPDATE crm_connections SET
      last_sync_at = NOW(),
      last_sync_status = ${failedCount === 0 ? 'SUCCESS' : failedCount === contactsToSync.length ? 'FAILED' : 'PARTIAL'}
    WHERE id = ${connectionId}
  `;

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'crm.sync_triggered',
    entityType: 'crm_connection',
    entityId: connectionId,
    newValue: { entity_type, total: contactsToSync.length, success: successCount, failed: failedCount },
  });

  return NextResponse.json({
    total: contactsToSync.length,
    success: successCount,
    failed: failedCount,
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { airtablePreviewSchema } from '@/lib/schemas/workspace-import';
import { fetchAirtableTables, fetchAirtableRecords, autoDetectAirtableFieldMapping } from '@/lib/workspace-import/airtable';

export const runtime = 'nodejs';

/**
 * POST /api/workspaces/[workspaceId]/import/airtable/preview — Preview Airtable data with auto-detected mapping
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { workspaceId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, airtablePreviewSchema);
  if (!validation.success) return validation.error;

  const { api_key, base_id, table_id } = validation.data;

  // Fetch table schema
  const tables = await fetchAirtableTables(api_key, base_id);
  const table = tables.find(t => t.id === table_id);
  if (!table) {
    return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  }

  // Auto-detect field mapping
  const suggestedMapping = autoDetectAirtableFieldMapping(table.fields);

  // Fetch sample records (first 5)
  const records = await fetchAirtableRecords(api_key, base_id, table_id, 5);

  return NextResponse.json({
    fields: table.fields,
    suggested_mapping: suggestedMapping,
    sample_records: records.map(r => r.fields),
    total_available: records.length,
  });
});

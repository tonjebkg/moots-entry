import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { notionPreviewSchema } from '@/lib/schemas/workspace-import';
import { fetchNotionDatabases, fetchNotionPages, autoDetectNotionFieldMapping } from '@/lib/workspace-import/notion';

export const runtime = 'nodejs';

/**
 * POST /api/workspaces/[workspaceId]/import/notion/preview — Preview Notion data with auto-detected mapping
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const { workspaceId } = await context.params;
  if (auth.workspace.id !== workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const validation = await validateRequest(request, notionPreviewSchema);
  if (!validation.success) return validation.error;

  const { api_key, database_id } = validation.data;

  // Fetch database schema
  const databases = await fetchNotionDatabases(api_key);
  const database = databases.find(d => d.id === database_id);
  if (!database) {
    return NextResponse.json({ error: 'Database not found' }, { status: 404 });
  }

  // Auto-detect field mapping
  const suggestedMapping = autoDetectNotionFieldMapping(database.properties);

  // Fetch sample pages (first 5)
  const pages = await fetchNotionPages(api_key, database_id, 5);

  return NextResponse.json({
    properties: database.properties,
    suggested_mapping: suggestedMapping,
    sample_pages: pages.length,
  });
});

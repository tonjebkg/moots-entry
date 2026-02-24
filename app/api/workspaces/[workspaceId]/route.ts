import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { updateWorkspaceSchema } from '@/lib/schemas/workspace';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { NotFoundError, ForbiddenError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/workspaces/[workspaceId] — Get workspace details
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  const { workspaceId } = await context.params;
  const db = getDb();

  // Verify membership
  const memberCheck = await db`
    SELECT role FROM workspace_members
    WHERE workspace_id = ${workspaceId} AND user_id = ${auth.user.id}
    LIMIT 1
  `;

  if (memberCheck.length === 0) {
    throw new ForbiddenError('Not a member of this workspace');
  }

  const result = await db`
    SELECT id, name, slug, logo_url, plan, owner_id, settings, created_at, updated_at
    FROM workspaces
    WHERE id = ${workspaceId}
    LIMIT 1
  `;

  if (result.length === 0) {
    throw new NotFoundError('Workspace');
  }

  return NextResponse.json({ workspace: result[0], role: memberCheck[0].role });
});

/**
 * PATCH /api/workspaces/[workspaceId] — Update workspace settings
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { workspaceId } = await context.params;

  // Verify this is the user's active workspace
  if (workspaceId !== auth.workspace.id) {
    throw new ForbiddenError('Can only update your active workspace');
  }

  const validation = await validateRequest(request, updateWorkspaceSchema);
  if (!validation.success) return validation.error;
  const updates = validation.data;

  const db = getDb();

  // Fetch current for audit
  const current = await db`
    SELECT name, logo_url, settings FROM workspaces WHERE id = ${workspaceId} LIMIT 1
  `;
  if (current.length === 0) {
    throw new NotFoundError('Workspace');
  }

  // Build update
  const fields: string[] = [];
  if (updates.name !== undefined) {
    await db`UPDATE workspaces SET name = ${updates.name} WHERE id = ${workspaceId}`;
  }
  if (updates.logo_url !== undefined) {
    await db`UPDATE workspaces SET logo_url = ${updates.logo_url} WHERE id = ${workspaceId}`;
  }
  if (updates.settings !== undefined) {
    const settingsJson = JSON.stringify(updates.settings);
    await db`UPDATE workspaces SET settings = ${settingsJson}::jsonb WHERE id = ${workspaceId}`;
  }

  const updated = await db`
    SELECT id, name, slug, logo_url, plan, owner_id, settings, created_at, updated_at
    FROM workspaces WHERE id = ${workspaceId} LIMIT 1
  `;

  logAction({
    workspaceId,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'workspace.updated',
    entityType: 'workspace',
    entityId: workspaceId,
    previousValue: current[0],
    newValue: updates,
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ workspace: updated[0] });
});

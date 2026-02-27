import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { switchWorkspaceSchema } from '@/lib/schemas/workspace';
import { requireAuth, destroySession, createSession } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ForbiddenError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const SESSION_COOKIE_NAME = 'moots_session';

/**
 * POST /api/workspaces/switch — Switch active workspace
 * Creates a new session for the target workspace.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();

  const validation = await validateRequest(request, switchWorkspaceSchema);
  if (!validation.success) return validation.error;
  const { workspace_id } = validation.data;

  const db = getDb();

  // Verify user is a member of target workspace
  const memberResult = await db`
    SELECT wm.role, w.id, w.name, w.slug, w.plan
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.workspace_id = ${workspace_id} AND wm.user_id = ${auth.user.id}
    LIMIT 1
  `;

  if (memberResult.length === 0) {
    throw new ForbiddenError('Not a member of the target workspace');
  }

  const target = memberResult[0];

  // Destroy current session
  await destroySession(auth.sessionId);

  // Create new session for target workspace
  const session = await createSession(auth.user.id, workspace_id, request);

  // Update last active
  await db`
    UPDATE workspace_members SET last_active_at = NOW()
    WHERE workspace_id = ${workspace_id} AND user_id = ${auth.user.id}
  `;

  logAction({
    workspaceId: workspace_id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'workspace.switched',
    entityType: 'workspace',
    entityId: workspace_id,
    metadata: { from_workspace_id: auth.workspace.id },
    ipAddress: getClientIdentifier(request),
  });

  const response = NextResponse.json({
    workspace: {
      id: target.id,
      name: target.name,
      slug: target.slug,
      plan: target.plan,
    },
    role: target.role,
  });

  response.cookies.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expires_at),
  });

  return response;
});

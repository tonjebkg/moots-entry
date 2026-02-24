import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/workspaces — List workspaces the current user belongs to
 */
export const GET = withErrorHandling(async (_request: NextRequest) => {
  const auth = await requireAuth();
  const db = getDb();

  const result = await db`
    SELECT
      w.id, w.name, w.slug, w.logo_url, w.plan, w.owner_id,
      w.created_at, w.updated_at,
      wm.role
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ${auth.user.id}
    ORDER BY wm.last_active_at DESC NULLS LAST, w.created_at ASC
  `;

  return NextResponse.json({ workspaces: result });
});

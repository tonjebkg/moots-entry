import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * GET /api/auth/invite/verify?token=xxx — Verify an invite token is valid
 * Returns invite details (workspace name, role, email) if valid.
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const db = getDb();

  const result = await db`
    SELECT vt.id, vt.email, vt.expires_at, vt.used_at, vt.metadata
    FROM verification_tokens vt
    WHERE vt.token = ${token}
      AND vt.type = 'WORKSPACE_INVITE'
    LIMIT 1
  `;

  if (result.length === 0) {
    return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 });
  }

  const row = result[0];

  if (row.used_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 410 });
  }

  if (new Date(row.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 });
  }

  const metadata = row.metadata || {};
  const workspaceId = metadata.workspace_id;

  // Fetch workspace name
  let workspaceName = 'Unknown workspace';
  if (workspaceId) {
    const wsResult = await db`SELECT name FROM workspaces WHERE id = ${workspaceId} LIMIT 1`;
    if (wsResult.length > 0) {
      workspaceName = wsResult[0].name;
    }
  }

  // Check if user already has an account
  const existingUser = await db`SELECT id FROM users WHERE email = ${row.email} LIMIT 1`;

  return NextResponse.json({
    email: row.email,
    role: metadata.role || 'TEAM_MEMBER',
    workspace_name: workspaceName,
    has_account: existingUser.length > 0,
  });
});

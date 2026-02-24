import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { createSession, setSessionCookie } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const token = request.nextUrl.searchParams.get('token');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  const db = getDb();

  // Find and validate token
  const tokenResult = await db`
    SELECT vt.id, vt.user_id, vt.email, vt.expires_at, vt.used_at
    FROM verification_tokens vt
    WHERE vt.token = ${token}
      AND vt.type = 'MAGIC_LINK'
    LIMIT 1
  `;

  if (tokenResult.length === 0) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  const tokenRow = tokenResult[0];

  if (tokenRow.used_at) {
    return NextResponse.redirect(`${appUrl}/login?error=token_used`);
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.redirect(`${appUrl}/login?error=token_expired`);
  }

  if (!tokenRow.user_id) {
    return NextResponse.redirect(`${appUrl}/login?error=invalid_token`);
  }

  // Mark token as used
  await db`UPDATE verification_tokens SET used_at = NOW() WHERE id = ${tokenRow.id}`;

  // Mark email as verified
  await db`
    UPDATE users SET email_verified = TRUE, last_login_at = NOW()
    WHERE id = ${tokenRow.user_id}
  `;

  // Find workspace
  const memberResult = await db`
    SELECT w.id AS workspace_id
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ${tokenRow.user_id}
    ORDER BY wm.last_active_at DESC NULLS LAST, wm.invited_at ASC
    LIMIT 1
  `;

  if (memberResult.length === 0) {
    return NextResponse.redirect(`${appUrl}/login?error=no_workspace`);
  }

  // Create session
  const session = await createSession(tokenRow.user_id, memberResult[0].workspace_id, request);
  await setSessionCookie(session.id, session.expires_at);

  const ip = getClientIdentifier(request);
  logAction({
    workspaceId: memberResult[0].workspace_id,
    actorId: tokenRow.user_id,
    actorEmail: tokenRow.email,
    action: 'auth.magic_link_login',
    entityType: 'user',
    entityId: tokenRow.user_id,
    ipAddress: ip,
  });

  return NextResponse.redirect(`${appUrl}/dashboard`);
});

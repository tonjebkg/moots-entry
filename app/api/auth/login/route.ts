import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { loginSchema } from '@/lib/schemas/auth';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { UnauthorizedError, RateLimitError, AppError } from '@/lib/errors';
import { getClientIdentifier, checkAuthRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getClientIdentifier(request);

  // Rate limit by IP
  const rateCheck = checkAuthRateLimit(`login:${ip}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  // Validate input
  const result = await validateRequest(request, loginSchema);
  if (!result.success) return result.error;
  const { email, password } = result.data;

  const db = getDb();

  // Find user
  const userResult = await db`
    SELECT id, email, password_hash, full_name, avatar_url, email_verified,
           failed_login_count, locked_until
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (userResult.length === 0) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = userResult[0];

  // Check account lock
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new AppError(423, 'Account is temporarily locked due to too many failed attempts', 'ACCOUNT_LOCKED');
  }

  // Verify password
  if (!user.password_hash) {
    throw new UnauthorizedError('This account uses a different sign-in method');
  }

  const passwordValid = await verifyPassword(password, user.password_hash);

  if (!passwordValid) {
    // Increment failed login count
    const newCount = (user.failed_login_count || 0) + 1;
    const lockUntil = newCount >= LOCKOUT_THRESHOLD
      ? new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString()
      : null;

    await db`
      UPDATE users
      SET failed_login_count = ${newCount},
          locked_until = ${lockUntil}::timestamptz
      WHERE id = ${user.id}
    `;

    logAction({
      actorEmail: email,
      action: 'auth.login_failed',
      entityType: 'user',
      entityId: user.id,
      metadata: { failed_count: newCount, locked: !!lockUntil },
      ipAddress: ip,
    });

    throw new UnauthorizedError('Invalid email or password');
  }

  // Success — reset failed login count, update last_login_at
  await db`
    UPDATE users
    SET failed_login_count = 0,
        locked_until = NULL,
        last_login_at = NOW()
    WHERE id = ${user.id}
  `;

  // Find user's workspaces, pick first one
  const memberResult = await db`
    SELECT w.id AS workspace_id, w.name AS workspace_name, w.slug AS workspace_slug, w.plan AS workspace_plan, wm.role
    FROM workspace_members wm
    JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ${user.id}
    ORDER BY wm.last_active_at DESC NULLS LAST, wm.invited_at ASC
    LIMIT 1
  `;

  if (memberResult.length === 0) {
    throw new UnauthorizedError('No workspace found for this account');
  }

  const membership = memberResult[0];

  // Create session
  const session = await createSession(user.id, membership.workspace_id, request);
  await setSessionCookie(session.id, session.expires_at);

  // Update last active
  await db`
    UPDATE workspace_members
    SET last_active_at = NOW()
    WHERE workspace_id = ${membership.workspace_id} AND user_id = ${user.id}
  `;

  logAction({
    workspaceId: membership.workspace_id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'auth.login',
    entityType: 'user',
    entityId: user.id,
    ipAddress: ip,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      email_verified: user.email_verified,
    },
    workspace: {
      id: membership.workspace_id,
      name: membership.workspace_name,
      slug: membership.workspace_slug,
      plan: membership.workspace_plan,
    },
    role: membership.role,
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { inviteAcceptSchema } from '@/lib/schemas/auth';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { validatePassword, hasCommonPatterns } from '@/lib/password-validation';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ValidationError, UnauthorizedError, ConflictError } from '@/lib/errors';
import { getClientIdentifier, checkAuthRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * POST /api/auth/invite/accept — Accept a workspace invitation
 * Creates a new user account (if needed) and adds them to the workspace.
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getClientIdentifier(request);
  const rateCheck = checkAuthRateLimit(`invite-accept:${ip}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  const result = await validateRequest(request, inviteAcceptSchema);
  if (!result.success) return result.error;
  const { token, full_name, password } = result.data;

  // Validate password strength
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new ValidationError('Password does not meet requirements', passwordCheck.errors);
  }
  if (hasCommonPatterns(password)) {
    throw new ValidationError('Password contains common patterns');
  }

  const db = getDb();

  // Find and validate token
  const tokenResult = await db`
    SELECT id, email, expires_at, used_at, metadata
    FROM verification_tokens
    WHERE token = ${token}
      AND type = 'WORKSPACE_INVITE'
    LIMIT 1
  `;

  if (tokenResult.length === 0) {
    throw new UnauthorizedError('Invalid invitation token');
  }

  const tokenRow = tokenResult[0];

  if (tokenRow.used_at) {
    throw new UnauthorizedError('This invitation has already been accepted');
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    throw new UnauthorizedError('This invitation has expired');
  }

  const metadata = tokenRow.metadata || {};
  const workspaceId = metadata.workspace_id;
  const role = metadata.role || 'TEAM_MEMBER';
  const eventIds = metadata.event_ids || null;

  if (!workspaceId) {
    throw new UnauthorizedError('Invalid invitation — missing workspace');
  }

  // Check workspace exists
  const wsResult = await db`SELECT id, name FROM workspaces WHERE id = ${workspaceId} LIMIT 1`;
  if (wsResult.length === 0) {
    throw new UnauthorizedError('Workspace no longer exists');
  }

  const email = tokenRow.email;

  // Check if user already exists
  const existingUser = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;

  let userId: string;

  if (existingUser.length > 0) {
    userId = existingUser[0].id;

    // Check if already a member
    const existingMember = await db`
      SELECT id FROM workspace_members
      WHERE workspace_id = ${workspaceId} AND user_id = ${userId}
      LIMIT 1
    `;
    if (existingMember.length > 0) {
      throw new ConflictError('You are already a member of this workspace');
    }
  } else {
    // Create new user account
    const password_hash = await hashPassword(password);
    const userResult = await db`
      INSERT INTO users (email, password_hash, full_name, email_verified)
      VALUES (${email}, ${password_hash}, ${full_name}, TRUE)
      RETURNING id
    `;
    userId = userResult[0].id;
  }

  // Add user to workspace
  await db`
    INSERT INTO workspace_members (workspace_id, user_id, role, event_ids, accepted_at)
    VALUES (${workspaceId}, ${userId}, ${role}, ${eventIds}, NOW())
  `;

  // Mark token as used
  await db`UPDATE verification_tokens SET used_at = NOW(), user_id = ${userId} WHERE id = ${tokenRow.id}`;

  // Create session
  const session = await createSession(userId, workspaceId, request);
  await setSessionCookie(session.id, session.expires_at);

  // Audit log
  logAction({
    workspaceId,
    actorId: userId,
    actorEmail: email,
    action: 'workspace.invite_accepted',
    entityType: 'workspace_member',
    entityId: userId,
    newValue: { email, role, workspace: wsResult[0].name },
    ipAddress: ip,
  });

  return NextResponse.json({
    user: { id: userId, email, full_name },
    workspace: { id: workspaceId, name: wsResult[0].name },
    role,
  }, { status: 201 });
});

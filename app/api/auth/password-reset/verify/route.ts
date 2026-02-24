import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { passwordResetVerifySchema } from '@/lib/schemas/auth';
import { hashPassword } from '@/lib/auth';
import { validatePassword, hasCommonPatterns } from '@/lib/password-validation';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ValidationError, UnauthorizedError } from '@/lib/errors';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const result = await validateRequest(request, passwordResetVerifySchema);
  if (!result.success) return result.error;
  const { token, password } = result.data;

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
    SELECT id, user_id, email, expires_at, used_at
    FROM verification_tokens
    WHERE token = ${token}
      AND type = 'PASSWORD_RESET'
    LIMIT 1
  `;

  if (tokenResult.length === 0) {
    throw new UnauthorizedError('Invalid or expired reset token');
  }

  const tokenRow = tokenResult[0];

  if (tokenRow.used_at) {
    throw new UnauthorizedError('This reset token has already been used');
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    throw new UnauthorizedError('This reset token has expired');
  }

  if (!tokenRow.user_id) {
    throw new UnauthorizedError('Invalid reset token');
  }

  // Mark token as used
  await db`UPDATE verification_tokens SET used_at = NOW() WHERE id = ${tokenRow.id}`;

  // Update password
  const password_hash = await hashPassword(password);
  await db`
    UPDATE users
    SET password_hash = ${password_hash}, failed_login_count = 0, locked_until = NULL
    WHERE id = ${tokenRow.user_id}
  `;

  // Invalidate all sessions for this user (force re-login)
  await db`DELETE FROM sessions WHERE user_id = ${tokenRow.user_id}`;

  const ip = getClientIdentifier(request);
  logAction({
    actorId: tokenRow.user_id,
    actorEmail: tokenRow.email,
    action: 'auth.password_reset',
    entityType: 'user',
    entityId: tokenRow.user_id,
    ipAddress: ip,
  });

  return NextResponse.json({ message: 'Password has been reset. Please log in with your new password.' });
});

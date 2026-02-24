import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { passwordResetRequestSchema } from '@/lib/schemas/auth';
import { generateToken } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getClientIdentifier, checkAuthRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export const POST = withErrorHandling(async (request: NextRequest) => {
  const ip = getClientIdentifier(request);
  const rateCheck = checkAuthRateLimit(`password-reset:${ip}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  const result = await validateRequest(request, passwordResetRequestSchema);
  if (!result.success) return result.error;
  const { email } = result.data;

  const db = getDb();

  // Check if user exists
  const userResult = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;

  // Always return success to prevent email enumeration
  if (userResult.length === 0) {
    return NextResponse.json({ message: 'If an account exists, a password reset link has been sent.' });
  }

  const userId = userResult[0].id;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS).toISOString();

  // Invalidate existing reset tokens
  await db`
    UPDATE verification_tokens
    SET used_at = NOW()
    WHERE user_id = ${userId} AND type = 'PASSWORD_RESET' AND used_at IS NULL
  `;

  // Create new token
  await db`
    INSERT INTO verification_tokens (user_id, email, token, type, expires_at)
    VALUES (${userId}, ${email}, ${token}, 'PASSWORD_RESET', ${expiresAt}::timestamptz)
  `;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // TODO: Send email via Resend when email templates are ready
  logger.info('Password reset link generated', { email, url: resetUrl });

  return NextResponse.json({ message: 'If an account exists, a password reset link has been sent.' });
});

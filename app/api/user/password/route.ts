import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { validatePassword, hasCommonPatterns } from '@/lib/password-validation';

export const runtime = 'nodejs';

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(1, 'New password is required'),
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  const validation = await validateRequest(request, changePasswordSchema);
  if (!validation.success) return validation.error;

  const { current_password, new_password } = validation.data;
  const db = getDb();

  // Fetch current password hash
  const userResult = await db`
    SELECT password_hash FROM users WHERE id = ${auth.user.id} LIMIT 1
  `;

  if (!userResult.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { password_hash } = userResult[0];

  if (!password_hash) {
    return NextResponse.json(
      { error: 'Account uses SSO login. Password cannot be changed.' },
      { status: 400 }
    );
  }

  // Verify current password
  const isValid = await verifyPassword(current_password, password_hash);
  if (!isValid) {
    return NextResponse.json(
      { error: 'Current password is incorrect' },
      { status: 400 }
    );
  }

  // Validate new password strength
  const passwordCheck = validatePassword(new_password);
  if (!passwordCheck.valid) {
    return NextResponse.json(
      { error: 'Password does not meet requirements', details: passwordCheck.errors },
      { status: 400 }
    );
  }

  if (hasCommonPatterns(new_password)) {
    return NextResponse.json(
      { error: 'Password contains common patterns. Please choose a stronger password.' },
      { status: 400 }
    );
  }

  // Hash and update
  const newHash = await hashPassword(new_password);

  await db`
    UPDATE users
    SET password_hash = ${newHash}, updated_at = NOW()
    WHERE id = ${auth.user.id}
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'user.password.change',
    entityType: 'user',
    entityId: auth.user.id,
  });

  return NextResponse.json({ success: true, message: 'Password updated successfully' });
});

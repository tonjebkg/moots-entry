import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const verifyPinSchema = z.object({
  pin: z.string().min(1).max(8),
});

/**
 * POST /api/door/[token]/verify-pin — Verify PIN for a check-in token
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const { token } = await context.params;

  const validation = await validateRequest(request, verifyPinSchema);
  if (!validation.success) return validation.error;

  const db = getDb();

  const result = await db`
    SELECT pin_code FROM checkin_tokens
    WHERE token = ${token}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;

  if (result.length === 0) {
    return NextResponse.json(
      { error: 'Invalid or expired check-in link' },
      { status: 401 }
    );
  }

  const valid = result[0].pin_code === validation.data.pin;

  return NextResponse.json({ valid });
});

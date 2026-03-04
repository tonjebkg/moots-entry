import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const auth = await requireAuth();
  const db = getDb();

  const result = await db`
    SELECT id, email, full_name, avatar_url, email_verified,
           password_hash IS NOT NULL AS has_password,
           created_at
    FROM users
    WHERE id = ${auth.user.id}
    LIMIT 1
  `;

  if (!result.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const user = result[0];

  return NextResponse.json({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    email_verified: user.email_verified,
    has_password: user.has_password,
    created_at: user.created_at,
  });
});

const updateProfileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(200).optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  const validation = await validateRequest(request, updateProfileSchema);
  if (!validation.success) return validation.error;

  const { data } = validation;
  const db = getDb();

  // Build SET clause dynamically for only provided fields
  const updates: string[] = [];
  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  if (data.full_name !== undefined) {
    previousValue.full_name = auth.user.full_name;
    newValue.full_name = data.full_name;
  }
  if (data.avatar_url !== undefined) {
    previousValue.avatar_url = auth.user.avatar_url;
    newValue.avatar_url = data.avatar_url;
  }

  if (Object.keys(newValue).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Update user record — only touch fields that were actually sent
  const fullName = data.full_name ?? null;
  const avatarProvided = data.avatar_url !== undefined;
  const avatarUrl = avatarProvided ? data.avatar_url : null;

  const result = await db`
    UPDATE users
    SET
      full_name = COALESCE(${fullName}, full_name),
      avatar_url = CASE WHEN ${avatarProvided} THEN ${avatarUrl} ELSE avatar_url END,
      updated_at = NOW()
    WHERE id = ${auth.user.id}
    RETURNING id, email, full_name, avatar_url, email_verified
  `;

  if (!result.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'user.profile.update',
    entityType: 'user',
    entityId: auth.user.id,
    previousValue,
    newValue,
  });

  return NextResponse.json(result[0]);
});

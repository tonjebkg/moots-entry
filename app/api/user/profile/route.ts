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
    SELECT id, email, full_name, first_name, last_name,
           company, title, phone, linkedin_url,
           avatar_url, email_verified,
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
    first_name: user.first_name,
    last_name: user.last_name,
    company: user.company,
    title: user.title,
    phone: user.phone,
    linkedin_url: user.linkedin_url,
    avatar_url: user.avatar_url,
    email_verified: user.email_verified,
    has_password: user.has_password,
    created_at: user.created_at,
  });
});

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100).optional(),
  last_name: z.string().max(100).nullable().optional(),
  company: z.string().max(200).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  linkedin_url: z.string().url().max(500).nullable().optional(),
  avatar_url: z.string().url().max(2048).nullable().optional(),
});

export const PATCH = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  const validation = await validateRequest(request, updateProfileSchema);
  if (!validation.success) return validation.error;

  const { data } = validation;
  const db = getDb();

  const previousValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  // Track changes for audit log
  for (const key of ['first_name', 'last_name', 'company', 'title', 'phone', 'linkedin_url', 'avatar_url'] as const) {
    if (data[key] !== undefined) {
      newValue[key] = data[key];
    }
  }

  if (Object.keys(newValue).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  // Fetch current values for audit log
  const current = await db`
    SELECT first_name, last_name, company, title, phone, linkedin_url, avatar_url, full_name
    FROM users WHERE id = ${auth.user.id} LIMIT 1
  `;
  if (current.length) {
    for (const key of Object.keys(newValue)) {
      previousValue[key] = current[0][key];
    }
  }

  // Compute full_name sync when name fields change
  const firstName = data.first_name !== undefined ? data.first_name : null;
  const lastName = data.last_name !== undefined ? data.last_name : null;
  const nameChanged = data.first_name !== undefined || data.last_name !== undefined;

  const avatarProvided = data.avatar_url !== undefined;
  const avatarUrl = avatarProvided ? data.avatar_url : null;

  const company = data.company !== undefined ? data.company : null;
  const companyProvided = data.company !== undefined;

  const titleVal = data.title !== undefined ? data.title : null;
  const titleProvided = data.title !== undefined;

  const phone = data.phone !== undefined ? data.phone : null;
  const phoneProvided = data.phone !== undefined;

  const linkedinUrl = data.linkedin_url !== undefined ? data.linkedin_url : null;
  const linkedinProvided = data.linkedin_url !== undefined;

  const result = await db`
    UPDATE users
    SET
      first_name = CASE WHEN ${data.first_name !== undefined} THEN ${firstName} ELSE first_name END,
      last_name = CASE WHEN ${data.last_name !== undefined} THEN ${lastName} ELSE last_name END,
      full_name = CASE
        WHEN ${nameChanged} THEN
          COALESCE(
            CASE WHEN ${data.first_name !== undefined} THEN ${firstName} ELSE first_name END,
            ''
          ) || CASE
            WHEN COALESCE(
              CASE WHEN ${data.last_name !== undefined} THEN ${lastName} ELSE last_name END,
              ''
            ) <> '' THEN ' ' || COALESCE(
              CASE WHEN ${data.last_name !== undefined} THEN ${lastName} ELSE last_name END,
              ''
            )
            ELSE ''
          END
        ELSE full_name
      END,
      company = CASE WHEN ${companyProvided} THEN ${company} ELSE company END,
      title = CASE WHEN ${titleProvided} THEN ${titleVal} ELSE title END,
      phone = CASE WHEN ${phoneProvided} THEN ${phone} ELSE phone END,
      linkedin_url = CASE WHEN ${linkedinProvided} THEN ${linkedinUrl} ELSE linkedin_url END,
      avatar_url = CASE WHEN ${avatarProvided} THEN ${avatarUrl} ELSE avatar_url END,
      updated_at = NOW()
    WHERE id = ${auth.user.id}
    RETURNING id, email, full_name, first_name, last_name, company, title, phone, linkedin_url, avatar_url, email_verified
  `;

  if (!result.length) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (nameChanged) {
    previousValue.full_name = current[0]?.full_name;
    newValue.full_name = result[0].full_name;
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

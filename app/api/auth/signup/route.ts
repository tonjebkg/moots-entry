import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { signupSchema } from '@/lib/schemas/auth';
import { hashPassword, createSession, setSessionCookie, generateToken } from '@/lib/auth';
import { validatePassword, hasCommonPatterns } from '@/lib/password-validation';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { ConflictError, ValidationError } from '@/lib/errors';
import { getClientIdentifier, checkAuthRateLimit } from '@/lib/rate-limit';
import { RateLimitError } from '@/lib/errors';

export const runtime = 'nodejs';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limit
  const ip = getClientIdentifier(request);
  const rateCheck = checkAuthRateLimit(`signup:${ip}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  // Validate input
  const result = await validateRequest(request, signupSchema);
  if (!result.success) return result.error;
  const { email, password, full_name, organization_name } = result.data;

  // Validate password strength
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) {
    throw new ValidationError('Password does not meet requirements', passwordCheck.errors);
  }
  if (hasCommonPatterns(password)) {
    throw new ValidationError('Password contains common patterns');
  }

  const db = getDb();

  // Check if email is already taken
  const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`;
  if (existing.length > 0) {
    throw new ConflictError('An account with this email already exists');
  }

  // Hash password
  const password_hash = await hashPassword(password);

  // Create user
  const userResult = await db`
    INSERT INTO users (email, password_hash, full_name)
    VALUES (${email}, ${password_hash}, ${full_name})
    RETURNING id, email, full_name, avatar_url, email_verified
  `;
  const user = userResult[0];

  // Generate workspace slug (ensure uniqueness)
  let slug = slugify(organization_name);
  if (!slug) slug = 'workspace';
  const slugCheck = await db`SELECT id FROM workspaces WHERE slug = ${slug} LIMIT 1`;
  if (slugCheck.length > 0) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  // Create workspace
  const workspaceResult = await db`
    INSERT INTO workspaces (name, slug, owner_id)
    VALUES (${organization_name}, ${slug}, ${user.id})
    RETURNING id, name, slug, plan
  `;
  const workspace = workspaceResult[0];

  // Add user as OWNER member
  await db`
    INSERT INTO workspace_members (workspace_id, user_id, role, accepted_at)
    VALUES (${workspace.id}, ${user.id}, 'OWNER', NOW())
  `;

  // Create session
  const session = await createSession(user.id, workspace.id, request);
  await setSessionCookie(session.id, session.expires_at);

  // Audit log
  logAction({
    workspaceId: workspace.id,
    actorId: user.id,
    actorEmail: user.email,
    action: 'auth.signup',
    entityType: 'user',
    entityId: user.id,
    newValue: { email: user.email, full_name: user.full_name, workspace: workspace.name },
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
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
    },
    role: 'OWNER',
  }, { status: 201 });
});

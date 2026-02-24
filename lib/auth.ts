import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from './db';
import { logger } from './logger';
import { UnauthorizedError, ForbiddenError } from './errors';
import type { AuthContext, WorkspaceRole } from '@/types/auth';

const SESSION_COOKIE_NAME = 'moots_session';
const SESSION_EXPIRY_HOURS = parseInt(process.env.SESSION_EXPIRY_HOURS || '72', 10);
const BCRYPT_ROUNDS = 12;

// ─── Password Hashing ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── Token Generation ───────────────────────────────────────────────────────

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Session Management ─────────────────────────────────────────────────────

export async function createSession(
  userId: string,
  workspaceId: string,
  request?: Request
): Promise<{ id: string; expires_at: string }> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

  const ipAddress = request
    ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    : null;
  const userAgent = request?.headers.get('user-agent') || null;

  const result = await db`
    INSERT INTO sessions (user_id, workspace_id, ip_address, user_agent, expires_at)
    VALUES (${userId}, ${workspaceId}, ${ipAddress}::inet, ${userAgent}, ${expiresAt}::timestamptz)
    RETURNING id, expires_at
  `;

  return { id: result[0].id, expires_at: result[0].expires_at };
}

export async function destroySession(sessionId: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM sessions WHERE id = ${sessionId}`;
}

export async function setSessionCookie(sessionId: string, expiresAt: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Get current session from cookie.
 * Returns null if no valid session found.
 */
export async function getSession(): Promise<AuthContext | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const sessionId = sessionCookie.value;
    const db = getDb();

    const result = await db`
      SELECT
        s.id AS session_id,
        s.expires_at,
        u.id AS user_id,
        u.email,
        u.full_name,
        u.avatar_url,
        u.email_verified,
        w.id AS workspace_id,
        w.name AS workspace_name,
        w.slug AS workspace_slug,
        w.plan AS workspace_plan,
        wm.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN workspaces w ON w.id = s.workspace_id
      JOIN workspace_members wm ON wm.workspace_id = s.workspace_id AND wm.user_id = s.user_id
      WHERE s.id = ${sessionId}
        AND s.expires_at > NOW()
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];

    return {
      user: {
        id: row.user_id,
        email: row.email,
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        email_verified: row.email_verified,
      },
      workspace: {
        id: row.workspace_id,
        name: row.workspace_name,
        slug: row.workspace_slug,
        plan: row.workspace_plan,
      },
      role: row.role as WorkspaceRole,
      sessionId: row.session_id,
    };
  } catch (error) {
    logger.error('Failed to get session', error as Error);
    return null;
  }
}

/**
 * Require authenticated session. Throws UnauthorizedError if not authenticated.
 */
export async function requireAuth(): Promise<AuthContext> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError('Authentication required');
  }
  return session;
}

/**
 * Check that the user's role is one of the allowed roles.
 * Throws ForbiddenError if not.
 */
export function requireRole(context: AuthContext, ...allowedRoles: WorkspaceRole[]): void {
  if (!allowedRoles.includes(context.role)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

/**
 * Clean up expired sessions (call periodically or via cron)
 */
export async function cleanExpiredSessions(): Promise<number> {
  const db = getDb();
  const result = await db`
    DELETE FROM sessions WHERE expires_at < NOW()
    RETURNING id
  `;
  return result.length;
}

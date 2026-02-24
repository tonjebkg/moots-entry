import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { getSession, destroySession, clearSessionCookie } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await getSession();

  if (session) {
    await destroySession(session.sessionId);

    logAction({
      workspaceId: session.workspace.id,
      actorId: session.user.id,
      actorEmail: session.user.email,
      action: 'auth.logout',
      entityType: 'user',
      entityId: session.user.id,
      ipAddress: getClientIdentifier(request),
    });
  }

  await clearSessionCookie();

  return NextResponse.json({ success: true });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { getSession } from '@/lib/auth';
import { UnauthorizedError } from '@/lib/errors';

export const runtime = 'nodejs';

export const GET = withErrorHandling(async (_request: NextRequest) => {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError('Not authenticated');
  }

  return NextResponse.json({
    user: session.user,
    workspace: session.workspace,
    role: session.role,
  });
});

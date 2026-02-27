import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getAgentActivity } from '@/lib/agent/activity';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/agent/activity — Get recent agent activity for an event
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum);

  const url = new URL(request.url);
  const limit = Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10));

  const activity = await getAgentActivity(eventIdNum, workspaceId, limit);

  return NextResponse.json({ activity });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getEventAnalytics, getTeamPerformance, getEventComparison } from '@/lib/analytics/aggregator';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/analytics — Get full event analytics
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);

  const url = new URL(request.url);
  const compareEventId = url.searchParams.get('compare_event_id');

  const [metrics, team] = await Promise.all([
    getEventAnalytics(eventIdNum, auth.workspace.id),
    getTeamPerformance(eventIdNum, auth.workspace.id),
  ]);

  let comparison = null;
  if (compareEventId) {
    comparison = await getEventComparison(
      [eventIdNum, parseInt(compareEventId, 10)],
      auth.workspace.id
    );
  }

  return NextResponse.json({
    metrics,
    team_performance: team,
    comparison,
  });
});

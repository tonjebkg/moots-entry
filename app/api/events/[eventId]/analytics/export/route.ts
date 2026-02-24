import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getEventAnalytics, getTeamPerformance } from '@/lib/analytics/aggregator';
import { exportAnalyticsReport } from '@/lib/analytics/export';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/analytics/export — Export analytics as CSV or JSON
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);

  const url = new URL(request.url);
  const format = (url.searchParams.get('format') || 'csv') as 'csv' | 'json' | 'pdf';

  const [metrics, team] = await Promise.all([
    getEventAnalytics(eventIdNum, auth.workspace.id),
    getTeamPerformance(eventIdNum, auth.workspace.id),
  ]);

  const report = await exportAnalyticsReport(metrics, team, format);

  return new Response(report.content, {
    headers: {
      'Content-Type': report.contentType,
      'Content-Disposition': `attachment; filename="${report.filename}"`,
    },
  });
});

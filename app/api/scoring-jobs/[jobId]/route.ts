import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

type RouteParams = { params: Promise<{ jobId: string }> };

/**
 * GET /api/scoring-jobs/[jobId] — Check scoring job progress
 */
export const GET = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const auth = await requireAuth();
  const { jobId } = await params;
  const db = getDb();

  const job = await db`
    SELECT * FROM scoring_jobs
    WHERE id = ${jobId} AND workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (job.length === 0) {
    throw new NotFoundError('Scoring job');
  }

  const j = job[0];
  return NextResponse.json({
    id: j.id,
    event_id: j.event_id,
    status: j.status,
    total_contacts: j.total_contacts,
    completed_count: j.completed_count,
    failed_count: j.failed_count,
    error_message: j.error_message,
    progress: j.total_contacts > 0
      ? Math.round(((j.completed_count + j.failed_count) / j.total_contacts) * 100)
      : 0,
    started_at: j.started_at,
    completed_at: j.completed_at,
    created_at: j.created_at,
  });
});

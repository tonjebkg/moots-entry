import { NextRequest, NextResponse } from 'next/server';
import { processJobs } from '@/lib/jobs/processor';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/cron/process-jobs
 * Called by Vercel Cron every minute. Processes pending enrichment/scoring jobs.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends this automatically for cron jobs)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processJobs();

    logger.info('Cron: process-jobs completed', {
      enrichmentProcessed: result.enrichmentProcessed,
      scoringProcessed: result.scoringProcessed,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron: process-jobs failed', error as Error);
    return NextResponse.json(
      { error: 'Job processing failed' },
      { status: 500 }
    );
  }
}

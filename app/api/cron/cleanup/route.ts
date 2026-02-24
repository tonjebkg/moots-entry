import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cleanExpiredSessions } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 60;

const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365', 10);
const JOB_RETENTION_DAYS = 30;

/**
 * GET /api/cron/cleanup
 * Daily cleanup cron. Deletes old audit logs, expired sessions, and completed jobs.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const results: Record<string, number> = {};

  try {
    // 1. Delete old audit logs
    const auditResult = await db`
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '1 day' * ${AUDIT_LOG_RETENTION_DAYS}
      RETURNING id
    `;
    results.audit_logs_deleted = auditResult.length;

    // 2. Clean expired sessions
    const sessionsDeleted = await cleanExpiredSessions();
    results.sessions_deleted = sessionsDeleted;

    // 3. Clean completed enrichment jobs older than 30 days
    const enrichmentResult = await db`
      DELETE FROM enrichment_jobs
      WHERE status IN ('COMPLETED', 'FAILED')
        AND completed_at < NOW() - INTERVAL '1 day' * ${JOB_RETENTION_DAYS}
      RETURNING id
    `;
    results.enrichment_jobs_deleted = enrichmentResult.length;

    // 4. Clean completed scoring jobs older than 30 days
    const scoringResult = await db`
      DELETE FROM scoring_jobs
      WHERE status IN ('COMPLETED', 'FAILED')
        AND completed_at < NOW() - INTERVAL '1 day' * ${JOB_RETENTION_DAYS}
      RETURNING id
    `;
    results.scoring_jobs_deleted = scoringResult.length;

    // 5. Clean expired verification tokens
    const tokenResult = await db`
      DELETE FROM verification_tokens
      WHERE expires_at < NOW()
      RETURNING id
    `;
    results.expired_tokens_deleted = tokenResult.length;

    logger.info('Cron: cleanup completed', results);

    logAction({
      actorId: null,
      actorEmail: 'system',
      action: 'system.cleanup',
      entityType: 'system',
      metadata: results,
    });

    return NextResponse.json({
      ok: true,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron: cleanup failed', error as Error);
    return NextResponse.json(
      { error: 'Cleanup failed' },
      { status: 500 }
    );
  }
}

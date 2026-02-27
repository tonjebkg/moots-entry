import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { logAction } from '@/lib/audit-log';
import { AiSearchProvider, runEnrichmentPipeline } from '@/lib/enrichment';
import { scoreBatchForEvent } from '@/lib/scoring';

interface AutoPipelineParams {
  contactId: string;
  workspaceId: string;
  eventId: number;
  source: string;
}

/**
 * Fire-and-forget auto enrichment + scoring pipeline.
 *
 * Called after a contact enters the pool from an inbound source (RSVP, join request).
 * 1. Creates an enrichment job and runs the enrichment pipeline for the contact.
 * 2. If the event has objectives, creates a scoring job and scores the contact.
 *
 * All errors are caught and logged — this never throws to the caller.
 */
export async function autoEnrichAndScore(params: AutoPipelineParams): Promise<void> {
  const { contactId, workspaceId, eventId, source } = params;
  const db = getDb();

  try {
    // ─── Step 1: Enrichment ──────────────────────────────────────────
    const [enrichJob] = await db`
      INSERT INTO enrichment_jobs (workspace_id, total_contacts, status)
      VALUES (${workspaceId}::uuid, 1, 'PENDING'::job_status)
      RETURNING id
    `;

    logAction({
      workspaceId,
      actorId: null,
      actorEmail: 'system',
      action: 'enrichment.auto_triggered',
      entityType: 'enrichment_job',
      entityId: enrichJob.id,
      metadata: { contactId, source, eventId },
    });

    const provider = new AiSearchProvider();
    await runEnrichmentPipeline(enrichJob.id, workspaceId, [contactId], provider);

    logger.info('Auto-enrichment completed', { contactId, jobId: enrichJob.id });

    // ─── Step 2: Scoring (only if event has objectives) ──────────────
    const [objCount] = await db`
      SELECT COUNT(*)::int AS count
      FROM event_objectives
      WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    `;

    if (objCount.count === 0) {
      logger.info('Skipping auto-scoring: no objectives defined', { contactId, eventId });
      return;
    }

    const [scoreJob] = await db`
      INSERT INTO scoring_jobs (event_id, workspace_id, total_contacts, status)
      VALUES (${eventId}, ${workspaceId}::uuid, 1, 'PENDING'::job_status)
      RETURNING id
    `;

    logAction({
      workspaceId,
      actorId: null,
      actorEmail: 'system',
      action: 'scoring.auto_triggered',
      entityType: 'scoring_job',
      entityId: scoreJob.id,
      metadata: { contactId, source, eventId },
    });

    await scoreBatchForEvent(scoreJob.id, eventId, workspaceId, [contactId]);

    logger.info('Auto-scoring completed', { contactId, jobId: scoreJob.id, eventId });
  } catch (error: unknown) {
    logger.error('Auto-pipeline failed', error as Error, { contactId, workspaceId, eventId, source });
    // Swallow the error — this is fire-and-forget
  }
}

import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

const BATCH_SIZE = 10;

interface PendingJob {
  id: string;
  type: 'enrichment' | 'scoring';
  workspace_id: string;
  event_id: number | null;
  contact_ids: string[];
}

/**
 * Process pending enrichment and scoring jobs in batches.
 * Called by the cron endpoint every minute.
 */
export async function processJobs(): Promise<{
  enrichmentProcessed: number;
  scoringProcessed: number;
}> {
  const db = getDb();
  let enrichmentProcessed = 0;
  let scoringProcessed = 0;

  // Process enrichment jobs
  const enrichmentJobs = await db`
    SELECT id, workspace_id, contact_ids
    FROM enrichment_jobs
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 5
  `;

  for (const job of enrichmentJobs) {
    try {
      const contactIds: string[] = Array.isArray(job.contact_ids)
        ? job.contact_ids
        : JSON.parse(job.contact_ids || '[]');

      // Pick the next batch of unprocessed contacts
      const processedCount = await getEnrichmentProgress(db, job.id);
      const batch = contactIds.slice(processedCount, processedCount + BATCH_SIZE);

      if (batch.length === 0) {
        // Job is done
        await db`
          UPDATE enrichment_jobs SET
            status = 'COMPLETED'::job_status, completed_at = NOW()
          WHERE id = ${job.id}
        `;
        continue;
      }

      // Mark as in progress
      await db`
        UPDATE enrichment_jobs SET status = 'IN_PROGRESS'::job_status,
          started_at = COALESCE(started_at, NOW())
        WHERE id = ${job.id}
      `;

      // Process each contact in the batch
      for (const contactId of batch) {
        try {
          // The actual enrichment is done via the pipeline —
          // here we just mark it as ready for the provider.
          // The enrichment pipeline handles the actual API call.
          await db`
            UPDATE people_contacts SET enrichment_status = 'PENDING'::enrichment_status
            WHERE id = ${contactId} AND workspace_id = ${job.workspace_id}
              AND enrichment_status = 'NOT_STARTED'
          `;
          enrichmentProcessed++;
        } catch (err) {
          logger.error('Failed to queue contact for enrichment', err as Error, { contactId });
        }
      }

      // Update progress
      await db`
        UPDATE enrichment_jobs SET completed_count = ${processedCount + batch.length}
        WHERE id = ${job.id}
      `;

      // Check if fully done
      if (processedCount + batch.length >= contactIds.length) {
        await db`
          UPDATE enrichment_jobs SET
            status = 'COMPLETED'::job_status, completed_at = NOW()
          WHERE id = ${job.id}
        `;
      }
    } catch (error) {
      logger.error('Enrichment job processing failed', error as Error, { jobId: job.id });
      await db`
        UPDATE enrichment_jobs SET status = 'FAILED'::job_status, completed_at = NOW()
        WHERE id = ${job.id}
      `.catch(() => {});
    }
  }

  // Process scoring jobs
  const scoringJobs = await db`
    SELECT id, workspace_id, event_id, contact_ids
    FROM scoring_jobs
    WHERE status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT 5
  `;

  for (const job of scoringJobs) {
    try {
      const contactIds: string[] = Array.isArray(job.contact_ids)
        ? job.contact_ids
        : JSON.parse(job.contact_ids || '[]');

      const processedCount = await getScoringProgress(db, job.id);
      const batch = contactIds.slice(processedCount, processedCount + BATCH_SIZE);

      if (batch.length === 0) {
        await db`
          UPDATE scoring_jobs SET
            status = 'COMPLETED'::job_status, completed_at = NOW()
          WHERE id = ${job.id}
        `;
        continue;
      }

      await db`
        UPDATE scoring_jobs SET status = 'IN_PROGRESS'::job_status,
          started_at = COALESCE(started_at, NOW())
        WHERE id = ${job.id}
      `;

      // Import scoring engine dynamically to avoid circular deps
      const { scoreContactForEvent, saveScoringResult } = await import('@/lib/scoring/engine');

      // Fetch objectives for this event
      const objectives = await db`
        SELECT id, objective_text, weight
        FROM event_objectives
        WHERE event_id = ${job.event_id} AND workspace_id = ${job.workspace_id}
        ORDER BY weight DESC
      `;

      const eventRows = await db`SELECT title FROM events WHERE id = ${job.event_id}`;
      const eventTitle = eventRows[0]?.title || 'Event';

      for (const contactId of batch) {
        try {
          const contacts = await db`
            SELECT id, full_name, company, title, industry, role_seniority,
                   ai_summary, tags, enrichment_data
            FROM people_contacts
            WHERE id = ${contactId} AND workspace_id = ${job.workspace_id}
          `;

          if (contacts.length > 0) {
            const contact = contacts[0];
            const result = await scoreContactForEvent(
              {
                id: contact.id,
                full_name: contact.full_name,
                company: contact.company,
                title: contact.title,
                industry: contact.industry,
                role_seniority: contact.role_seniority,
                ai_summary: contact.ai_summary,
                tags: contact.tags || [],
                enrichment_data: contact.enrichment_data || {},
              },
              objectives as any[],
              eventTitle
            );
            await saveScoringResult(contactId, job.event_id, job.workspace_id, result);
            scoringProcessed++;
          }
        } catch (err) {
          logger.error('Failed to score contact', err as Error, { contactId, jobId: job.id });
        }
      }

      await db`
        UPDATE scoring_jobs SET completed_count = ${processedCount + batch.length}
        WHERE id = ${job.id}
      `;

      if (processedCount + batch.length >= contactIds.length) {
        await db`
          UPDATE scoring_jobs SET
            status = 'COMPLETED'::job_status, completed_at = NOW()
          WHERE id = ${job.id}
        `;
      }
    } catch (error) {
      logger.error('Scoring job processing failed', error as Error, { jobId: job.id });
      await db`
        UPDATE scoring_jobs SET status = 'FAILED'::job_status, completed_at = NOW()
        WHERE id = ${job.id}
      `.catch(() => {});
    }
  }

  return { enrichmentProcessed, scoringProcessed };
}

async function getEnrichmentProgress(db: any, jobId: string): Promise<number> {
  const rows = await db`SELECT completed_count FROM enrichment_jobs WHERE id = ${jobId}`;
  return rows[0]?.completed_count || 0;
}

async function getScoringProgress(db: any, jobId: string): Promise<number> {
  const rows = await db`SELECT completed_count FROM scoring_jobs WHERE id = ${jobId}`;
  return rows[0]?.completed_count || 0;
}

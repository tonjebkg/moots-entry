import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import { scoreContactForEvent, saveScoringResult } from './engine';

/**
 * Batch score contacts for an event with async job tracking.
 */
export async function scoreBatchForEvent(
  jobId: string,
  eventId: number,
  workspaceId: string,
  contactIds?: string[]
): Promise<void> {
  const db = getDb();

  // Mark job in progress
  await db`
    UPDATE scoring_jobs SET
      status = 'IN_PROGRESS'::job_status,
      started_at = NOW()
    WHERE id = ${jobId}
  `;

  // Fetch event title
  const events = await db`
    SELECT title FROM events WHERE id = ${eventId} LIMIT 1
  `;
  const eventTitle = events[0]?.title || 'Event';

  // Fetch objectives
  const objectiveRows = await db`
    SELECT id, objective_text, weight
    FROM event_objectives
    WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    ORDER BY sort_order ASC
  `;
  const objectives = objectiveRows.map(o => ({
    id: o.id as string,
    objective_text: o.objective_text as string,
    weight: o.weight as number,
  }));

  if (objectiveRows.length === 0) {
    await db`
      UPDATE scoring_jobs SET
        status = 'FAILED'::job_status,
        error_message = 'No objectives defined for this event',
        completed_at = NOW()
      WHERE id = ${jobId}
    `;
    return;
  }

  // Fetch contacts to score
  const contacts = contactIds && contactIds.length > 0
    ? await db`
        SELECT id, full_name, company, title, industry, role_seniority,
               ai_summary, tags, enrichment_data
        FROM people_contacts
        WHERE id = ANY(${contactIds}::uuid[]) AND workspace_id = ${workspaceId}
      `
    : await db`
        SELECT id, full_name, company, title, industry, role_seniority,
               ai_summary, tags, enrichment_data
        FROM people_contacts
        WHERE workspace_id = ${workspaceId}
      `;

  // Update total count
  await db`
    UPDATE scoring_jobs SET total_contacts = ${contacts.length}
    WHERE id = ${jobId}
  `;

  let completedCount = 0;
  let failedCount = 0;

  for (const contact of contacts) {
    try {
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
        objectives,
        eventTitle
      );

      await saveScoringResult(contact.id, eventId, workspaceId, result);
      completedCount++;
    } catch (error: any) {
      failedCount++;
      logger.error('Scoring failed for contact', error, { contactId: contact.id, eventId });
    }

    // Update progress
    await db`
      UPDATE scoring_jobs SET
        completed_count = ${completedCount},
        failed_count = ${failedCount}
      WHERE id = ${jobId}
    `;
  }

  // Mark job completed
  const finalStatus = failedCount === contacts.length ? 'FAILED' : 'COMPLETED';
  await db`
    UPDATE scoring_jobs SET
      status = ${finalStatus}::job_status,
      completed_count = ${completedCount},
      failed_count = ${failedCount},
      completed_at = NOW()
    WHERE id = ${jobId}
  `;
}

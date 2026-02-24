import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { EnrichmentProvider, EnrichmentInput } from './types';

/**
 * Batch enrichment orchestrator with progress tracking.
 * Processes contacts through an enrichment provider and updates the database.
 */
export async function runEnrichmentPipeline(
  jobId: string,
  workspaceId: string,
  contactIds: string[],
  provider: EnrichmentProvider
): Promise<void> {
  const db = getDb();

  // Mark job as in progress
  await db`
    UPDATE enrichment_jobs SET
      status = 'IN_PROGRESS'::job_status,
      started_at = NOW()
    WHERE id = ${jobId}
  `;

  let completedCount = 0;
  let failedCount = 0;

  for (const contactId of contactIds) {
    try {
      // Fetch contact data
      const contacts = await db`
        SELECT full_name, emails, company, title, linkedin_url
        FROM people_contacts
        WHERE id = ${contactId} AND workspace_id = ${workspaceId}
        LIMIT 1
      `;

      if (contacts.length === 0) {
        failedCount++;
        continue;
      }

      const contact = contacts[0];

      // Mark contact as enriching
      await db`
        UPDATE people_contacts SET enrichment_status = 'IN_PROGRESS'::enrichment_status
        WHERE id = ${contactId}
      `;

      const input: EnrichmentInput = {
        full_name: contact.full_name,
        emails: Array.isArray(contact.emails) ? contact.emails : [],
        company: contact.company,
        title: contact.title,
        linkedin_url: contact.linkedin_url,
      };

      const result = await provider.enrich(input);

      if (result.success) {
        const enrichmentData = JSON.stringify(result.raw_data || {});
        await db`
          UPDATE people_contacts SET
            enrichment_status = 'COMPLETED'::enrichment_status,
            enrichment_data = ${enrichmentData}::jsonb,
            ai_summary = ${result.ai_summary || null},
            industry = COALESCE(${result.industry || null}, industry),
            role_seniority = COALESCE(${result.role_seniority || null}, role_seniority),
            enriched_at = NOW(),
            enrichment_cost_cents = COALESCE(enrichment_cost_cents, 0) + ${result.cost_cents || 0}
          WHERE id = ${contactId}
        `;
        completedCount++;
      } else {
        await db`
          UPDATE people_contacts SET enrichment_status = 'FAILED'::enrichment_status
          WHERE id = ${contactId}
        `;
        failedCount++;
        logger.error('Enrichment failed for contact', new Error(result.error || 'Unknown'), { contactId });
      }

      // Update job progress
      await db`
        UPDATE enrichment_jobs SET
          completed_count = ${completedCount},
          failed_count = ${failedCount}
        WHERE id = ${jobId}
      `;
    } catch (error: any) {
      failedCount++;
      await db`
        UPDATE people_contacts SET enrichment_status = 'FAILED'::enrichment_status
        WHERE id = ${contactId}
      `;
      logger.error('Enrichment pipeline error', error, { contactId });
    }
  }

  // Mark job as completed
  const finalStatus = failedCount === contactIds.length ? 'FAILED' : 'COMPLETED';
  await db`
    UPDATE enrichment_jobs SET
      status = ${finalStatus}::job_status,
      completed_count = ${completedCount},
      failed_count = ${failedCount},
      completed_at = NOW()
    WHERE id = ${jobId}
  `;
}

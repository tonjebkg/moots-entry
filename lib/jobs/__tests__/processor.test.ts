import { describe, it, expect, vi, beforeEach } from 'vitest';

const { __mockDb: mockDb } = await import('@neondatabase/serverless') as any;

describe('processJobs', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  async function getModule() {
    return import('../processor');
  }

  it('returns zero counts when no pending jobs', async () => {
    // Enrichment jobs query returns empty
    mockDb.mockResolvedValueOnce([]);
    // Scoring jobs query returns empty
    mockDb.mockResolvedValueOnce([]);

    const { processJobs } = await getModule();
    const result = await processJobs();

    expect(result.enrichmentProcessed).toBe(0);
    expect(result.scoringProcessed).toBe(0);
  });

  it('marks enrichment job as COMPLETED when all contacts processed', async () => {
    // Enrichment jobs query
    mockDb.mockResolvedValueOnce([
      { id: 'ej-1', workspace_id: 'ws-1', contact_ids: ['c1', 'c2'] },
    ]);
    // getEnrichmentProgress returns 2 (all done)
    mockDb.mockResolvedValueOnce([{ completed_count: 2 }]);
    // COMPLETED update
    mockDb.mockResolvedValueOnce([]);
    // Scoring jobs (none)
    mockDb.mockResolvedValueOnce([]);

    const { processJobs } = await getModule();
    const result = await processJobs();

    // No contacts actually processed (batch was empty since all already done)
    expect(result.enrichmentProcessed).toBe(0);
  });

  it('processes enrichment batch and updates progress', async () => {
    // Enrichment jobs query
    mockDb.mockResolvedValueOnce([
      { id: 'ej-1', workspace_id: 'ws-1', contact_ids: JSON.stringify(['c1', 'c2', 'c3']) },
    ]);
    // getEnrichmentProgress returns 0
    mockDb.mockResolvedValueOnce([{ completed_count: 0 }]);
    // Mark IN_PROGRESS
    mockDb.mockResolvedValueOnce([]);
    // Process each contact (3 updates)
    mockDb.mockResolvedValueOnce([]);
    mockDb.mockResolvedValueOnce([]);
    mockDb.mockResolvedValueOnce([]);
    // Update completed_count
    mockDb.mockResolvedValueOnce([]);
    // Mark COMPLETED (3 contacts = all done)
    mockDb.mockResolvedValueOnce([]);
    // Scoring jobs (none)
    mockDb.mockResolvedValueOnce([]);

    const { processJobs } = await getModule();
    const result = await processJobs();

    expect(result.enrichmentProcessed).toBe(3);
  });

  it('handles enrichment job failure gracefully', async () => {
    // Enrichment jobs query
    mockDb.mockResolvedValueOnce([
      { id: 'ej-fail', workspace_id: 'ws-1', contact_ids: ['c1'] },
    ]);
    // getEnrichmentProgress throws
    mockDb.mockRejectedValueOnce(new Error('DB error'));
    // FAILED update
    mockDb.mockResolvedValueOnce([]);
    // Scoring jobs (none)
    mockDb.mockResolvedValueOnce([]);

    const { processJobs } = await getModule();
    const result = await processJobs();

    expect(result.enrichmentProcessed).toBe(0);
  });
});

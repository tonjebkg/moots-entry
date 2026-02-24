import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EnrichmentProvider, EnrichmentResult } from '../types';

const mockDb = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/db', () => ({
  getDb: () => {
    const handler: ProxyHandler<typeof mockDb> = {
      apply: (_target, _thisArg, args) => mockDb(...args),
    };
    return new Proxy(mockDb, handler);
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { runEnrichmentPipeline } from '../pipeline';

describe('runEnrichmentPipeline', () => {
  const mockProvider: EnrichmentProvider = {
    name: 'test-provider',
    enrich: vi.fn(),
  };

  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([]);
    (mockProvider.enrich as any).mockReset();
  });

  it('processes contacts and calls provider.enrich', async () => {
    // The pipeline makes several db calls in sequence:
    // 1. UPDATE job status to IN_PROGRESS
    // 2. SELECT contact data
    // 3. UPDATE contact enrichment_status to IN_PROGRESS
    // 4. UPDATE contact with enrichment data
    // 5. UPDATE job progress
    // 6. UPDATE job status to COMPLETED
    const contactData = {
      full_name: 'Jane Doe',
      emails: [{ email: 'jane@example.com' }],
      company: 'Acme',
      title: 'CEO',
      linkedin_url: null,
    };

    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      // Call 1: update job status
      // Call 2: select contact data
      if (callCount === 2) return Promise.resolve([contactData]);
      // Rest: updates
      return Promise.resolve([]);
    });

    const result: EnrichmentResult = {
      success: true,
      provider: 'test-provider',
      ai_summary: 'A CEO at Acme.',
      industry: 'Tech',
      role_seniority: 'C-Level',
      raw_data: { foo: 'bar' },
      cost_cents: 5,
    };
    (mockProvider.enrich as any).mockResolvedValue(result);

    await runEnrichmentPipeline('job-1', 'ws-1', ['contact-1'], mockProvider);

    // Provider should have been called once for the one contact
    expect(mockProvider.enrich).toHaveBeenCalledTimes(1);
    expect(mockProvider.enrich).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: 'Jane Doe' })
    );
  });

  it('handles enrichment failures gracefully', async () => {
    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      if (callCount === 2) {
        return Promise.resolve([{
          full_name: 'Fail User',
          emails: [],
          company: null,
          title: null,
          linkedin_url: null,
        }]);
      }
      return Promise.resolve([]);
    });

    (mockProvider.enrich as any).mockResolvedValue({
      success: false,
      provider: 'test-provider',
      error: 'API error',
    });

    await runEnrichmentPipeline('job-2', 'ws-1', ['contact-2'], mockProvider);

    expect(mockProvider.enrich).toHaveBeenCalledTimes(1);
  });

  it('handles empty contact list', async () => {
    await runEnrichmentPipeline('job-3', 'ws-1', [], mockProvider);
    expect(mockProvider.enrich).not.toHaveBeenCalled();
  });
});

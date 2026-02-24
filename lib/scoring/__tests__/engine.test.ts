import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/db', () => ({
  getDb: () => {
    const handler: ProxyHandler<typeof mockDb> = {
      apply: (_target, _thisArg, args) => mockDb(...args),
    };
    return new Proxy(mockDb, handler);
  },
}));

const mockCreate = vi.fn();
vi.mock('@/lib/anthropic', () => ({
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}));

import { scoreContactForEvent, saveScoringResult } from '../engine';

describe('scoreContactForEvent', () => {
  const contact = {
    id: 'c1',
    full_name: 'John Doe',
    company: 'Acme Corp',
    title: 'VP Engineering',
    industry: 'Technology',
    role_seniority: 'VP',
    ai_summary: 'Senior tech leader.',
    tags: ['tech', 'leadership'],
    enrichment_data: {},
  };

  const objectives = [
    { id: 'obj-1', objective_text: 'Connect tech leaders', weight: 10 },
    { id: 'obj-2', objective_text: 'Fundraising opportunities', weight: 5 },
  ];

  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('parses valid AI response', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          relevance_score: 85,
          matched_objectives: [
            { objective_index: 0, match_score: 90, explanation: 'Strong tech leader' },
            { objective_index: 1, match_score: 60, explanation: 'Some fundraising potential' },
          ],
          score_rationale: 'VP of Engineering at a major company. Strong match.',
          talking_points: ['Company growth', 'AI adoption'],
        }),
      }],
    });

    const result = await scoreContactForEvent(contact, objectives, 'Tech Summit');
    expect(result.relevance_score).toBe(85);
    expect(result.matched_objectives).toHaveLength(2);
    expect(result.talking_points).toContain('Company growth');
    expect(result.score_rationale).toContain('VP of Engineering');
  });

  it('returns default score on malformed AI response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Not valid JSON at all' }],
    });

    const result = await scoreContactForEvent(contact, objectives, 'Tech Summit');
    expect(result.relevance_score).toBe(50);
    expect(result.score_rationale).toContain('parsing error');
  });

  it('clamps scores to 0-100 range', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: JSON.stringify({
          relevance_score: 150,
          matched_objectives: [],
          score_rationale: 'Over-scored',
          talking_points: [],
        }),
      }],
    });

    const result = await scoreContactForEvent(contact, objectives, 'Test Event');
    expect(result.relevance_score).toBe(100);
  });
});

describe('saveScoringResult', () => {
  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([]);
  });

  it('upserts scoring result to database', async () => {
    await saveScoringResult('c1', 1, 'ws-1', {
      relevance_score: 75,
      matched_objectives: [{ objective_id: 'obj-1', objective_text: 'test', match_score: 80, explanation: 'good' }],
      score_rationale: 'Good match.',
      talking_points: ['Point A'],
    });

    expect(mockDb).toHaveBeenCalled();
  });
});

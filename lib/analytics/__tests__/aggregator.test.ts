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

import { getEventAnalytics, getTeamPerformance, getEventComparison } from '../aggregator';

describe('getEventAnalytics', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('returns structured analytics with funnel stages', async () => {
    // Mock all 8 parallel queries
    mockDb.mockResolvedValue([{ count: 0 }]);

    const result = await getEventAnalytics(1, 'ws-1');

    expect(result).toHaveProperty('funnel');
    expect(result).toHaveProperty('headline');
    expect(result).toHaveProperty('score_distribution');
    expect(result).toHaveProperty('campaign_summary');

    expect(result.funnel).toHaveLength(7);
    expect(result.funnel[0].key).toBe('pool');
    expect(result.funnel[6].key).toBe('meetings');
  });

  it('fills in missing score distribution ranges', async () => {
    mockDb.mockResolvedValue([{ count: 0 }]);

    const result = await getEventAnalytics(1, 'ws-1');
    expect(result.score_distribution).toHaveLength(4);
    expect(result.score_distribution.map(s => s.range)).toEqual([
      '0-25', '26-50', '51-75', '76-100',
    ]);
  });
});

describe('getTeamPerformance', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('returns team performance array', async () => {
    mockDb.mockResolvedValue([{
      user_id: 'u1',
      user_name: 'Alice',
      user_email: 'alice@test.com',
      assigned_guests: 10,
      checked_in_guests: 5,
      follow_ups_sent: 3,
      meetings_booked: 1,
    }]);

    const result = await getTeamPerformance(1, 'ws-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ user_name: 'Alice', assigned_guests: 10 });
  });
});

describe('getEventComparison', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('compares metrics across events', async () => {
    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      if (callCount === 1) return [{ title: 'Event A' }]; // event lookup
      if (callCount === 2) return [{ invited: 50, accepted: 30, declined: 5 }]; // metrics
      if (callCount === 3) return [{ checked_in: 25 }]; // checkins
      if (callCount === 4) return [{ sent: 20 }]; // follow-ups
      return [];
    });

    const result = await getEventComparison([1], 'ws-1');
    expect(result).toHaveLength(1);
    expect(result[0].event_title).toBe('Event A');
    expect(result[0].metrics.invited).toBe(50);
    expect(result[0].metrics.accepted).toBe(30);
  });

  it('skips non-existent events', async () => {
    mockDb.mockResolvedValue([]);
    const result = await getEventComparison([999], 'ws-1');
    expect(result).toHaveLength(0);
  });
});

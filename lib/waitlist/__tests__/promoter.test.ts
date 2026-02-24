import { describe, it, expect, vi, beforeEach } from 'vitest';

// Access the shared mock DB
const { __mockDb: mockDb } = await import('@neondatabase/serverless') as any;

describe('checkAndPromoteWaitlist', () => {
  beforeEach(() => {
    mockDb.mockReset();
    vi.clearAllMocks();
  });

  async function getModule() {
    return import('../promoter');
  }

  it('returns promoted: false when event not found', async () => {
    mockDb.mockResolvedValueOnce([]); // events query
    const { checkAndPromoteWaitlist } = await getModule();
    const result = await checkAndPromoteWaitlist(999, 'ws-1');
    expect(result).toEqual({ promoted: false });
  });

  it('returns promoted: false when no capacity limit', async () => {
    mockDb.mockResolvedValueOnce([{ total_capacity: null }]); // events query
    const { checkAndPromoteWaitlist } = await getModule();
    const result = await checkAndPromoteWaitlist(1, 'ws-1');
    expect(result).toEqual({ promoted: false });
  });

  it('returns promoted: false when at capacity', async () => {
    mockDb
      .mockResolvedValueOnce([{ total_capacity: 50 }]) // events
      .mockResolvedValueOnce([{ accepted_count: 50 }]); // count query
    const { checkAndPromoteWaitlist } = await getModule();
    const result = await checkAndPromoteWaitlist(1, 'ws-1');
    expect(result).toEqual({ promoted: false });
  });

  it('returns promoted: false when no waitlisted guests', async () => {
    mockDb
      .mockResolvedValueOnce([{ total_capacity: 50 }])
      .mockResolvedValueOnce([{ accepted_count: 30 }])
      .mockResolvedValueOnce([]); // no waitlisted
    const { checkAndPromoteWaitlist } = await getModule();
    const result = await checkAndPromoteWaitlist(1, 'ws-1');
    expect(result).toEqual({ promoted: false });
  });

  it('promotes next waitlisted guest when capacity opens', async () => {
    mockDb
      .mockResolvedValueOnce([{ total_capacity: 50 }]) // events
      .mockResolvedValueOnce([{ accepted_count: 40 }]) // below capacity
      .mockResolvedValueOnce([{ id: 'inv-42', full_name: 'Jane Doe', email: 'jane@test.com' }]) // waitlisted
      .mockResolvedValueOnce([]) // update query
      .mockResolvedValue([]); // default for audit log + any other queries

    const { checkAndPromoteWaitlist } = await getModule();
    const result = await checkAndPromoteWaitlist(1, 'ws-1');

    expect(result.promoted).toBe(true);
    expect(result.promotedInvitationId).toBe('inv-42');
    // 4 main queries + 1 audit log insert from logAction
    expect(mockDb).toHaveBeenCalledTimes(5);
  });
});

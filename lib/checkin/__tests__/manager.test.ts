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

vi.mock('@/lib/audit-log', () => ({
  logAction: vi.fn(),
}));

import { checkInGuest, onboardWalkIn, getCheckinMetrics } from '../manager';

describe('checkInGuest', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('checks in a guest by contactId', async () => {
    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      if (callCount === 1) {
        // people_contacts lookup
        return [{ full_name: 'Jane', emails: [{ email: 'jane@test.com' }], company: 'Acme', title: 'CEO' }];
      }
      if (callCount === 2) {
        // INSERT returning
        return [{ id: 'checkin-1', full_name: 'Jane', source: 'INVITATION' }];
      }
      return [];
    });

    const result = await checkInGuest({
      eventId: 1,
      workspaceId: 'ws-1',
      contactId: 'c-1',
      source: 'QR_SCAN',
      checkedInBy: 'user-1',
    });

    expect(result).toMatchObject({ id: 'checkin-1', full_name: 'Jane' });
  });

  it('checks in by invitationId with joined contact data', async () => {
    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      if (callCount === 1) {
        // invitation + contact lookup
        return [{ full_name: 'Bob', email: 'bob@test.com', contact_id: 'c-2', company: 'Corp', title: 'CTO' }];
      }
      if (callCount === 2) {
        return [{ id: 'checkin-2', full_name: 'Bob', source: 'INVITATION' }];
      }
      return [];
    });

    const result = await checkInGuest({
      eventId: 1,
      workspaceId: 'ws-1',
      invitationId: 'inv-1',
      source: 'INVITATION',
      checkedInBy: 'user-1',
    });

    expect(result).toMatchObject({ id: 'checkin-2' });
  });
});

describe('onboardWalkIn', () => {
  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([{ id: 'checkin-walk', full_name: 'Walk In', source: 'WALK_IN' }]);
  });

  it('creates a walk-in check-in record', async () => {
    const result = await onboardWalkIn({
      eventId: 1,
      workspaceId: 'ws-1',
      fullName: 'Walk-in Guest',
      email: 'walkin@test.com',
      checkedInBy: 'user-1',
    });

    expect(result).toMatchObject({ id: 'checkin-walk' });
    expect(mockDb).toHaveBeenCalled();
  });
});

describe('getCheckinMetrics', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('returns metrics with correct calculations', async () => {
    let callCount = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callCount++;
      if (callCount === 1) return [{ count: 20 }]; // expected
      if (callCount === 2) return [{ total_checked_in: 15, walk_ins: 3 }]; // checkin stats
      if (callCount === 3) return []; // recent
      return [];
    });

    const metrics = await getCheckinMetrics(1, 'ws-1');
    expect(metrics.total_expected).toBe(20);
    expect(metrics.total_checked_in).toBe(15);
    expect(metrics.walk_ins).toBe(3);
    expect(metrics.check_in_rate).toBe(75);
  });
});

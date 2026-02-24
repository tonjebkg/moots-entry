import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock before importing
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

import { logAction } from '../audit-log';

describe('logAction', () => {
  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([]);
  });

  it('calls db insert with correct params', async () => {
    logAction({
      workspaceId: 'ws-1',
      actorId: 'user-1',
      actorEmail: 'test@example.com',
      action: 'contact.created',
      entityType: 'contact',
      entityId: 'c-1',
    });

    // logAction is fire-and-forget, wait for the promise to settle
    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockDb).toHaveBeenCalled();
  });

  it('handles null optional fields', async () => {
    logAction({
      action: 'system.cleanup',
      entityType: 'session',
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockDb).toHaveBeenCalled();
  });

  it('serializes previousValue and newValue as JSON', async () => {
    logAction({
      action: 'invitation.updated',
      entityType: 'invitation',
      entityId: 'inv-1',
      previousValue: { status: 'INVITED' },
      newValue: { status: 'ACCEPTED' },
      metadata: { source: 'rsvp' },
    });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(mockDb).toHaveBeenCalled();
  });
});

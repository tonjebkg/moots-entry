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

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { hashPassword, verifyPassword, generateToken } from '../auth';

describe('hashPassword / verifyPassword', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('mysecretpassword');
    expect(hash).not.toBe('mysecretpassword');
    expect(hash).toMatch(/^\$2[aby]\$/);

    const matches = await verifyPassword('mysecretpassword', hash);
    expect(matches).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct');
    const matches = await verifyPassword('wrong', hash);
    expect(matches).toBe(false);
  });
});

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique tokens', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe('cleanExpiredSessions', () => {
  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);
  });

  it('deletes expired sessions and returns count', async () => {
    const { cleanExpiredSessions } = await import('../auth');
    const count = await cleanExpiredSessions();
    expect(count).toBe(2);
    expect(mockDb).toHaveBeenCalled();
  });
});

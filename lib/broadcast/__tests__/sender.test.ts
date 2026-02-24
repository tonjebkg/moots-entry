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

const mockSendBroadcastEmail = vi.fn().mockResolvedValue({ success: true, emailServiceId: 'e1' });
vi.mock('@/lib/email-service', () => ({
  sendBroadcastEmail: (...args: any[]) => mockSendBroadcastEmail(...args),
}));

import { getRecipients, sendBroadcast } from '../sender';

describe('getRecipients', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  it('returns recipients from accepted invitations', async () => {
    mockDb.mockResolvedValue([
      { email: 'a@test.com', full_name: 'Alice' },
      { email: 'b@test.com', full_name: 'Bob' },
    ]);

    const recipients = await getRecipients(1, 'ws-1');
    expect(recipients).toHaveLength(2);
    expect(recipients[0].email).toBe('a@test.com');
  });
});

describe('sendBroadcast', () => {
  beforeEach(() => {
    mockDb.mockReset();
    mockDb.mockResolvedValue([]);
    mockSendBroadcastEmail.mockReset();
    mockSendBroadcastEmail.mockResolvedValue({ success: true, emailServiceId: 'e1' });
  });

  it('sends emails to all recipients and updates counts', async () => {
    // First call: update status to SENDING
    // Second call: getRecipients query
    // Third+: update final counts
    let callIndex = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callIndex++;
      if (callIndex === 2) {
        return [{ email: 'a@test.com', full_name: 'Alice' }];
      }
      return [];
    });

    const result = await sendBroadcast('b1', 1, 'ws-1', 'Subject', 'Hello', 'Event');
    expect(result.delivered).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockSendBroadcastEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@test.com' })
    );
  });

  it('counts failed emails', async () => {
    let callIndex = 0;
    mockDb.mockImplementation((..._args: any[]) => {
      callIndex++;
      if (callIndex === 2) {
        return [{ email: 'fail@test.com', full_name: 'Fail' }];
      }
      return [];
    });

    mockSendBroadcastEmail.mockResolvedValue({ success: false, error: 'bad' });

    const result = await sendBroadcast('b2', 1, 'ws-1', 'Subject', 'Hello', 'Event');
    expect(result.delivered).toBe(0);
    expect(result.failed).toBe(1);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { __mockDb: mockDb } = await import('@neondatabase/serverless') as any;

describe('importCsvRows', () => {
  beforeEach(() => {
    mockDb.mockReset();
  });

  async function getModule() {
    return import('../import');
  }

  it('imports new contacts and skips duplicates by email', async () => {
    // Call 1: fetch existing emails
    mockDb.mockResolvedValueOnce([
      { emails: [{ email: 'existing@test.com' }] },
    ]);
    // Call 2+: inserts for new contacts
    mockDb.mockResolvedValue([]);

    const { importCsvRows } = await getModule();
    const result = await importCsvRows('ws-1', [
      { full_name: 'Existing User', email: 'existing@test.com' },
      { full_name: 'New User', email: 'new@test.com' },
    ]);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
  });

  it('deduplicates within the same batch', async () => {
    mockDb.mockResolvedValueOnce([]); // no existing
    mockDb.mockResolvedValue([]); // inserts

    const { importCsvRows } = await getModule();
    const result = await importCsvRows('ws-1', [
      { full_name: 'User A', email: 'dup@test.com' },
      { full_name: 'User B', email: 'dup@test.com' },
    ]);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('handles insert errors gracefully', async () => {
    mockDb.mockResolvedValueOnce([]); // no existing
    mockDb.mockRejectedValueOnce(new Error('DB constraint violation'));

    const { importCsvRows } = await getModule();
    const result = await importCsvRows('ws-1', [
      { full_name: 'Bad User', email: 'bad@test.com' },
    ]);

    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(2); // 1-indexed + header row
    expect(result.errors[0].error).toContain('constraint');
  });

  it('parses tags from comma-separated string', async () => {
    mockDb.mockResolvedValueOnce([]); // no existing
    mockDb.mockResolvedValueOnce([]); // insert

    const { importCsvRows } = await getModule();
    const result = await importCsvRows('ws-1', [
      { full_name: 'Tagged User', email: 'tags@test.com', tags: 'vip, speaker, investor' },
    ]);

    expect(result.imported).toBe(1);
  });
});

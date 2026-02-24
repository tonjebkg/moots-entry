import { describe, it, expect } from 'vitest';
import { computeDedupKey } from '../dedup';

describe('computeDedupKey', () => {
  it('returns key from email and name', () => {
    const key = computeDedupKey('John Doe', [{ email: 'john@example.com' }]);
    expect(key).toBe('john@example.com:john doe');
  });

  it('uses first email when no primary flag', () => {
    const key = computeDedupKey('Jane Smith', [
      { email: 'jane@work.com' },
      { email: 'jane@personal.com' },
    ]);
    expect(key).toBe('jane@work.com:jane smith');
  });

  it('uses primary email when flagged', () => {
    const emails = [
      { email: 'secondary@test.com' },
      { email: 'primary@test.com', primary: true } as any,
    ];
    const key = computeDedupKey('Test User', emails);
    expect(key).toBe('primary@test.com:test user');
  });

  it('trims whitespace', () => {
    const key = computeDedupKey('  John Doe  ', [{ email: '  JOHN@test.com  ' }]);
    expect(key).toBe('john@test.com:john doe');
  });

  it('normalizes to lowercase', () => {
    const key = computeDedupKey('JOHN DOE', [{ email: 'John@EXAMPLE.com' }]);
    expect(key).toBe('john@example.com:john doe');
  });

  it('returns null when no email', () => {
    const key = computeDedupKey('John Doe', []);
    expect(key).toBeNull();
  });

  it('returns null when no name', () => {
    const key = computeDedupKey('', [{ email: 'john@test.com' }]);
    expect(key).toBeNull();
  });
});

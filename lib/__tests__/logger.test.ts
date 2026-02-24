import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger, logError } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logs info messages', () => {
    logger.info('test message', { key: 'value' });
    expect(console.log).toHaveBeenCalled();
  });

  it('logs warn messages', () => {
    logger.warn('warning message');
    expect(console.log).toHaveBeenCalled();
  });

  it('logs error messages with error object', () => {
    const error = new Error('test error');
    logger.error('Something failed', error, { extra: 'context' });
    expect(console.log).toHaveBeenCalled();
  });

  it('logs error messages without error object', () => {
    logger.error('Something failed');
    expect(console.log).toHaveBeenCalled();
  });

  it('logs API requests', () => {
    const req = new Request('https://app.moots.com/api/events?page=1');
    logger.request(req, { userId: 'u-1' });
    expect(console.log).toHaveBeenCalled();
  });

  it('logs API responses', () => {
    const req = new Request('https://app.moots.com/api/events');
    logger.response(req, 200, 45);
    expect(console.log).toHaveBeenCalled();
  });

  it('logs database queries in debug', () => {
    logger.query('SELECT * FROM events', 12);
    // In test env (not development), debug may or may not output
    // Just ensure it doesn't throw
  });
});

describe('logError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logs error and returns the same error', () => {
    const error = new Error('test');
    const result = logError(error, { context: 'test' });
    expect(result).toBe(error);
    expect(console.log).toHaveBeenCalled();
  });
});

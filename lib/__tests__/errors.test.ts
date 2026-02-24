import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
  handleDatabaseError,
  buildErrorResponse,
} from '../errors';

describe('error classes', () => {
  it('AppError has correct properties', () => {
    const err = new AppError(418, 'teapot', 'TEAPOT');
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe('teapot');
    expect(err.code).toBe('TEAPOT');
    expect(err).toBeInstanceOf(Error);
  });

  it('ValidationError is 400', () => {
    const err = new ValidationError('bad input', { field: 'name' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'name' });
  });

  it('UnauthorizedError is 401', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError is 403', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError is 404', () => {
    const err = new NotFoundError('Event');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Event not found');
  });

  it('ConflictError is 409', () => {
    const err = new ConflictError('duplicate');
    expect(err.statusCode).toBe(409);
  });

  it('RateLimitError is 429', () => {
    const err = new RateLimitError(60);
    expect(err.statusCode).toBe(429);
    expect(err.details).toEqual({ retryAfter: 60 });
  });

  it('InternalServerError is 500', () => {
    const err = new InternalServerError();
    expect(err.statusCode).toBe(500);
  });
});

describe('handleDatabaseError', () => {
  it('converts unique violation to ConflictError', () => {
    expect(() => handleDatabaseError({ code: '23505' })).toThrow(ConflictError);
  });

  it('converts FK violation to ConflictError', () => {
    expect(() => handleDatabaseError({ code: '23503' })).toThrow(ConflictError);
  });

  it('converts not-null violation to ValidationError', () => {
    expect(() => handleDatabaseError({ code: '23502' })).toThrow(ValidationError);
  });

  it('converts check violation to ValidationError', () => {
    expect(() => handleDatabaseError({ code: '23514' })).toThrow(ValidationError);
  });

  it('defaults to InternalServerError', () => {
    expect(() => handleDatabaseError({ code: '99999' })).toThrow(InternalServerError);
  });
});

describe('buildErrorResponse', () => {
  it('handles AppError', async () => {
    const resp = buildErrorResponse(new NotFoundError('Contact'));
    expect(resp.status).toBe(404);
    const body = await resp.json();
    expect(body.error).toBe('Contact not found');
    expect(body.code).toBe('NOT_FOUND');
  });

  it('handles RateLimitError with Retry-After', () => {
    const resp = buildErrorResponse(new RateLimitError(120));
    expect(resp.status).toBe(429);
    expect(resp.headers.get('Retry-After')).toBe('120');
  });

  it('handles unknown errors as 500', async () => {
    const resp = buildErrorResponse(new Error('boom'));
    expect(resp.status).toBe(500);
    const body = await resp.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });
});

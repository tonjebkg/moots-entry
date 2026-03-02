import crypto from 'crypto';
import { getDb } from './db';
import { logger } from './logger';

/**
 * Generate a cryptographically secure checkin token.
 * 256-bit entropy, URL-safe, 43 characters.
 */
export function generateCheckinToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export interface ValidatedCheckinToken {
  token_id: string;
  event_id: number;
  workspace_id: string;
  pin_code: string | null;
  created_by: string;
  expires_at: string;
}

/**
 * Validate a checkin token and return the associated event/workspace info.
 * Returns null if the token is invalid, expired, or revoked.
 */
export async function validateCheckinToken(
  token: string
): Promise<ValidatedCheckinToken | null> {
  const db = getDb();

  try {
    const result = await db`
      SELECT
        ct.id AS token_id,
        ct.event_id,
        ct.workspace_id,
        ct.pin_code,
        ct.created_by,
        ct.expires_at,
        ct.revoked_at
      FROM checkin_tokens ct
      WHERE ct.token = ${token}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      logger.warn('Invalid checkin token', { token: token.substring(0, 10) + '...' });
      return null;
    }

    const row = result[0];

    // Check revocation
    if (row.revoked_at) {
      logger.warn('Revoked checkin token', { token: token.substring(0, 10) + '...' });
      return null;
    }

    // Check expiration
    if (new Date(row.expires_at) < new Date()) {
      logger.warn('Expired checkin token', {
        token: token.substring(0, 10) + '...',
        expiredAt: row.expires_at,
      });
      return null;
    }

    return {
      token_id: row.token_id,
      event_id: row.event_id,
      workspace_id: row.workspace_id,
      pin_code: row.pin_code,
      created_by: row.created_by,
      expires_at: row.expires_at,
    };
  } catch (error) {
    logger.error('Error validating checkin token', error as Error, {
      token: token.substring(0, 10) + '...',
    });
    return null;
  }
}

import crypto from 'crypto';
import { getDb } from './db';
import { logger } from './logger';

/**
 * Generate a cryptographically secure invitation token
 * 256-bit entropy, URL-safe, 43 characters
 */
export function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Generate a cryptographically secure join token
 * 256-bit entropy, URL-safe, 43 characters
 */
export function generateJoinToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Validate an RSVP invitation token and return invitation details
 * Returns null if token is invalid, expired, or already responded
 */
export async function validateInvitationToken(token: string) {
  const db = getDb();

  try {
    const result = await db`
      SELECT
        ci.id,
        ci.campaign_id,
        ci.event_id,
        ci.full_name,
        ci.email,
        ci.status,
        ci.token_expires_at,
        ci.expected_plus_ones,
        e.title as event_title,
        e.start_date,
        e.location
      FROM campaign_invitations ci
      JOIN events e ON e.id = ci.event_id
      WHERE ci.invitation_token = ${token}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      logger.warn('Invalid invitation token', { token: token.substring(0, 10) + '...' });
      return null;
    }

    const invitation = result[0];

    // Check expiration (if set)
    if (invitation.token_expires_at && new Date(invitation.token_expires_at) < new Date()) {
      logger.warn('Expired invitation token', {
        token: token.substring(0, 10) + '...',
        expiredAt: invitation.token_expires_at,
      });
      return null;
    }

    // Check if already responded
    if (['ACCEPTED', 'DECLINED'].includes(invitation.status)) {
      logger.warn('Already responded to invitation', {
        token: token.substring(0, 10) + '...',
        status: invitation.status,
      });
      return null;
    }

    logger.info('Valid invitation token', {
      invitationId: invitation.id,
      email: invitation.email,
    });

    return invitation;
  } catch (error) {
    logger.error('Error validating invitation token', undefined, { error });
    return null;
  }
}

/**
 * Validate a join request token and return invitation details
 * Returns null if token is invalid, not accepted, or already completed
 */
export async function validateJoinToken(token: string) {
  const db = getDb();

  try {
    const result = await db`
      SELECT
        ci.id,
        ci.campaign_id,
        ci.event_id,
        ci.full_name,
        ci.email,
        ci.join_completed_at,
        ci.expected_plus_ones,
        ci.rsvp_response_message,
        e.title as event_title,
        e.approve_mode
      FROM campaign_invitations ci
      JOIN events e ON e.id = ci.event_id
      WHERE ci.join_token = ${token}
        AND ci.status = 'ACCEPTED'
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      logger.warn('Invalid join token or not accepted', {
        token: token.substring(0, 10) + '...',
      });
      return null;
    }

    const invitation = result[0];

    // Check if already completed
    if (invitation.join_completed_at) {
      logger.warn('Join request already completed', {
        token: token.substring(0, 10) + '...',
        completedAt: invitation.join_completed_at,
      });
      return null;
    }

    logger.info('Valid join token', {
      invitationId: invitation.id,
      email: invitation.email,
    });

    return invitation;
  } catch (error) {
    logger.error('Error validating join token', undefined, { error });
    return null;
  }
}

/**
 * Set token expiration (default: 30 days from now)
 */
export function getTokenExpiration(daysFromNow: number = 30): Date {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + daysFromNow);
  return expiration;
}

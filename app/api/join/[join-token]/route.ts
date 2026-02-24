import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { joinRequestSchema } from '@/lib/schemas/invitation';
import { validateJoinToken } from '@/lib/invitation-token';
import { getMobileRedirectUrl } from '@/lib/mobile-redirect';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ 'join-token': string }>;
};

/**
 * POST /api/join/[join-token]
 * Process join request (Step 2: App Access)
 *
 * This creates the actual join_request record and grants app access.
 * Reuses the existing join_request creation logic from the mobile app flow.
 *
 * Body:
 * - message?: string (optional message from guest)
 *
 * Returns:
 * - join_request_id: ID of created join request
 * - redirect_url: URL to redirect to (mobile app or web)
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const { 'join-token': joinToken } = await params;

    if (!joinToken) {
      return NextResponse.json(
        { error: 'Join token is required' },
        { status: 400 }
      );
    }

    // Parse and validate request body (optional message)
    const validation = await validateRequest(req, joinRequestSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Validate join token
    const invitation = await validateJoinToken(joinToken);

    if (!invitation) {
      return NextResponse.json(
        {
          error: 'Invalid or expired join link',
          message:
            'This join link is invalid, has expired, or you have already joined.',
        },
        { status: 404 }
      );
    }

    // Get database client
    const db = getDb();
    const now = new Date().toISOString();

    // Use email as owner_id (since we don't have mobile auth here)
    const ownerId = invitation.email;
    const eventId = invitation.event_id;

    try {
      // Step 1: Upsert user_profiles (same pattern as mobile app)
      const profileId = crypto.randomUUID();
      const emailsJson = JSON.stringify([{ email: invitation.email }]);

      const profileResult = await db`
        INSERT INTO user_profiles (id, owner_id, event_ids, emails, first_name, last_name, created_at, updated_at)
        VALUES (
          ${profileId}::uuid,
          ${ownerId},
          ARRAY[${eventId}],
          ${emailsJson}::jsonb,
          ${invitation.full_name.split(' ')[0] || 'Guest'},
          ${invitation.full_name.split(' ').slice(1).join(' ') || ''},
          ${now},
          ${now}
        )
        ON CONFLICT (owner_id) DO UPDATE SET
          event_ids = (
            SELECT ARRAY(
              SELECT DISTINCT unnest_val
              FROM unnest(
                COALESCE(user_profiles.event_ids, ARRAY[]::int[]) || ARRAY[${eventId}::int]
              ) AS unnest_val
            )
          ),
          emails = EXCLUDED.emails,
          first_name = COALESCE(user_profiles.first_name, EXCLUDED.first_name),
          last_name = COALESCE(user_profiles.last_name, EXCLUDED.last_name),
          updated_at = EXCLUDED.updated_at
        RETURNING id
      `;

      if (!profileResult || profileResult.length === 0) {
        throw new Error('Failed to upsert user profile');
      }

      // Step 2: Check for existing join request (idempotency)
      const existing = await db`
        SELECT id, event_id, owner_id, status
        FROM event_join_requests
        WHERE event_id = ${eventId}
          AND owner_id = ${ownerId}
        LIMIT 1
      `;

      let joinRequestId: number;

      if (existing && existing.length > 0) {
        // Already exists - just update invitation link
        joinRequestId = existing[0].id;

        logger.info('Join request already exists', {
          joinRequestId,
          email: invitation.email,
        });
      } else {
        // Step 3: Create join request
        // Determine initial status based on event approve_mode
        const initialStatus =
          invitation.approve_mode === 'AUTO' ? 'APPROVED' : 'PENDING';

        const result = await db`
          INSERT INTO event_join_requests (
            event_id,
            owner_id,
            status,
            plus_ones,
            comments,
            rsvp_contact,
            visibility_enabled,
            notifications_enabled,
            created_at,
            updated_at
          ) VALUES (
            ${eventId},
            ${ownerId},
            ${initialStatus}::eventjoinrequeststatus,
            ${invitation.expected_plus_ones || 0},
            ${body.message || invitation.rsvp_response_message || null},
            ${invitation.email},
            ${true},
            ${true},
            ${now},
            ${now}
          )
          RETURNING id
        `;

        if (!result || result.length === 0) {
          throw new Error('Failed to create join request');
        }

        joinRequestId = result[0].id;

        // Step 4: If AUTO-APPROVED, create event_attendees record
        if (initialStatus === 'APPROVED') {
          await db`
            INSERT INTO event_attendees (event_id, owner_id, created_at)
            VALUES (${eventId}, ${ownerId}, ${now})
            ON CONFLICT (event_id, owner_id) DO NOTHING
          `;

          logger.info('Join request auto-approved and attendee created', {
            joinRequestId,
            email: invitation.email,
          });
        } else {
          logger.info('Join request created (pending approval)', {
            joinRequestId,
            email: invitation.email,
          });
        }
      }

      // Step 5: Update invitation with join completion
      await db`
        UPDATE campaign_invitations
        SET
          join_completed_at = NOW(),
          join_request_id = ${joinRequestId}
        WHERE id = ${invitation.id}
      `;

      // Step 6: Get user agent for mobile redirect
      const userAgent = req.headers.get('user-agent') || '';
      const redirectUrl = getMobileRedirectUrl(
        eventId,
        joinRequestId,
        userAgent
      );

      logger.info('Join request completed successfully', {
        invitationId: invitation.id,
        joinRequestId,
        email: invitation.email,
        redirectUrl,
      });

      return NextResponse.json({
        success: true,
        join_request_id: joinRequestId,
        redirect_url: redirectUrl,
        message:
          'Successfully joined event room! You can now access the event in the Moots app.',
      });
    } catch (error: any) {
      logger.error('Failed to process join request', undefined, {
        invitationId: invitation.id,
        error: error.message,
      });

      return NextResponse.json(
        {
          error: 'Failed to process join request',
          details: error.message,
        },
        { status: 500 }
      );
    }
  }
);

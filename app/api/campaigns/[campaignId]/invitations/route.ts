import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { createInvitationSchema } from '@/lib/schemas/invitation';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ campaignId: string }>;
};

/**
 * POST /api/campaigns/[campaignId]/invitations
 * Add a single guest to a campaign
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { campaignId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const validation = await validateRequest(req, createInvitationSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Get database client
    const db = getDb();

    // Check if campaign exists
    const campaign = await db`
      SELECT id, event_id, name
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const eventId = campaign[0].event_id;

    // Check if email already exists in this campaign
    const existing = await db`
      SELECT id, email
      FROM campaign_invitations
      WHERE campaign_id = ${campaignId}
        AND email = ${body.email.toLowerCase()}
      LIMIT 1
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists in this campaign' },
        { status: 409 }
      );
    }

    // Check capacity (get event capacity and current accepted count)
    const capacityCheck = await db`
      SELECT
        e.total_capacity,
        (
          SELECT COUNT(*)
          FROM campaign_invitations ci
          WHERE ci.event_id = e.id
            AND ci.status = 'ACCEPTED'
        ) as seats_filled
      FROM events e
      WHERE e.id = ${eventId}
      LIMIT 1
    `;

    const totalCapacity = capacityCheck[0]?.total_capacity || 0;
    const seatsFilled = Number(capacityCheck[0]?.seats_filled || 0);

    // Warning if at/over capacity (don't block, just warn)
    const overCapacity = totalCapacity > 0 && seatsFilled >= totalCapacity;

    // Create invitation
    const result = await db`
      INSERT INTO campaign_invitations (
        campaign_id,
        event_id,
        full_name,
        email,
        tier,
        priority,
        expected_plus_ones,
        internal_notes,
        status
      ) VALUES (
        ${campaignId},
        ${eventId},
        ${body.full_name},
        ${body.email.toLowerCase()},
        ${body.tier || 'TIER_2'},
        ${body.priority || 'NORMAL'},
        ${body.expected_plus_ones || 0},
        ${body.internal_notes || null},
        'CONSIDERING'
      )
      RETURNING
        id,
        campaign_id,
        event_id,
        full_name,
        email,
        status,
        tier,
        priority,
        internal_notes,
        expected_plus_ones,
        invitation_token,
        token_expires_at,
        rsvp_email_sent_at,
        rsvp_responded_at,
        rsvp_response_message,
        join_token,
        join_link_sent_at,
        join_completed_at,
        join_request_id,
        table_assignment,
        seat_assignment,
        created_at,
        updated_at
    `;

    logger.info('Invitation created', {
      invitationId: result[0].id,
      campaignId,
      email: body.email,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'invitation.created',
      entityType: 'invitation',
      entityId: result[0].id,
      newValue: { full_name: body.full_name, email: body.email, tier: body.tier, priority: body.priority },
      metadata: { campaignId, eventId },
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json(
      {
        invitation: result[0],
        message: 'Invitation created successfully',
        warning: overCapacity ? 'Event is at or over capacity' : undefined,
      },
      { status: 201 }
    );
  }
);

/**
 * GET /api/campaigns/[campaignId]/invitations
 * List all invitations for a campaign
 *
 * Query params:
 * - status: Filter by invitation status
 * - tier: Filter by tier
 * - priority: Filter by priority
 * - search: Search by name or email
 */
export const GET = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const { campaignId } = await params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(campaignId)) {
      return NextResponse.json(
        { error: 'Invalid campaign ID format' },
        { status: 400 }
      );
    }

    // Get database client
    const db = getDb();

    // Check if campaign exists
    const campaign = await db`
      SELECT id, event_id, name
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Parse query params
    const url = new URL(req.url);
    const statusFilter = url.searchParams.get('status');
    const tierFilter = url.searchParams.get('tier');
    const priorityFilter = url.searchParams.get('priority');
    const searchQuery = url.searchParams.get('search');

    // Build query with filters
    let query = db`
      SELECT
        id,
        campaign_id,
        event_id,
        full_name,
        email,
        status,
        tier,
        priority,
        internal_notes,
        expected_plus_ones,
        invitation_token,
        token_expires_at,
        rsvp_email_sent_at,
        rsvp_responded_at,
        rsvp_response_message,
        join_token,
        join_link_sent_at,
        join_completed_at,
        join_request_id,
        table_assignment,
        seat_assignment,
        created_at,
        updated_at
      FROM campaign_invitations
      WHERE campaign_id = ${campaignId}
    `;

    // Apply filters
    if (statusFilter) {
      query = db`${query} AND status = ${statusFilter}::invitation_status`;
    }

    if (tierFilter) {
      query = db`${query} AND tier = ${tierFilter}::invitation_tier`;
    }

    if (priorityFilter) {
      query = db`${query} AND priority = ${priorityFilter}::invitation_priority`;
    }

    if (searchQuery) {
      const search = `%${searchQuery.toLowerCase()}%`;
      query = db`${query} AND (LOWER(full_name) LIKE ${search} OR LOWER(email) LIKE ${search})`;
    }

    // Order by tier, priority, then created date
    query = db`${query} ORDER BY
      CASE tier
        WHEN 'TIER_1' THEN 1
        WHEN 'TIER_2' THEN 2
        WHEN 'TIER_3' THEN 3
        WHEN 'WAITLIST' THEN 4
      END,
      CASE priority
        WHEN 'VIP' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'NORMAL' THEN 3
        WHEN 'LOW' THEN 4
      END,
      created_at DESC
    `;

    const invitations = await query;

    // Get counts by status and tier
    const statusCounts = await db`
      SELECT
        status,
        COUNT(*) as count
      FROM campaign_invitations
      WHERE campaign_id = ${campaignId}
      GROUP BY status
    `;

    const tierCounts = await db`
      SELECT
        tier,
        COUNT(*) as count
      FROM campaign_invitations
      WHERE campaign_id = ${campaignId}
      GROUP BY tier
    `;

    // Format counts
    const counts = {
      considering: Number(
        statusCounts.find((c) => c.status === 'CONSIDERING')?.count || 0
      ),
      invited: Number(
        statusCounts.find((c) => c.status === 'INVITED')?.count || 0
      ),
      accepted: Number(
        statusCounts.find((c) => c.status === 'ACCEPTED')?.count || 0
      ),
      declined: Number(
        statusCounts.find((c) => c.status === 'DECLINED')?.count || 0
      ),
      waitlist: Number(
        statusCounts.find((c) => c.status === 'WAITLIST')?.count || 0
      ),
      by_tier: {
        tier_1: Number(
          tierCounts.find((c) => c.tier === 'TIER_1')?.count || 0
        ),
        tier_2: Number(
          tierCounts.find((c) => c.tier === 'TIER_2')?.count || 0
        ),
        tier_3: Number(
          tierCounts.find((c) => c.tier === 'TIER_3')?.count || 0
        ),
        waitlist: Number(
          tierCounts.find((c) => c.tier === 'WAITLIST')?.count || 0
        ),
      },
    };

    return NextResponse.json({
      invitations,
      counts,
      total: invitations.length,
    });
  }
);

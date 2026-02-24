import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { updateCampaignSchema } from '@/lib/schemas/campaign';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ campaignId: string }>;
};

/**
 * GET /api/campaigns/[campaignId]
 * Get campaign details
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
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

    // Get campaign
    const result = await db`
      SELECT
        id,
        event_id,
        name,
        description,
        status,
        email_subject,
        email_body,
        total_considering,
        total_invited,
        total_accepted,
        total_declined,
        total_joined,
        created_at,
        updated_at
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign: result[0] });
  }
);

/**
 * PATCH /api/campaigns/[campaignId]
 * Update campaign details
 */
export const PATCH = withErrorHandling(
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
    const validation = await validateRequest(req, updateCampaignSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Get database client
    const db = getDb();

    // Check if campaign exists
    const existing = await db`
      SELECT id, name, status
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if there are fields to update
    if (
      body.name === undefined &&
      body.description === undefined &&
      body.status === undefined &&
      body.email_subject === undefined &&
      body.email_body === undefined
    ) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Build UPDATE query dynamically - use conditional updates
    // Note: We update fields individually since Neon doesn't support parameterized unsafe queries

    if (body.name !== undefined) {
      await db`
        UPDATE invitation_campaigns
        SET name = ${body.name}, updated_at = NOW()
        WHERE id = ${campaignId}
      `;
    }

    if (body.description !== undefined) {
      await db`
        UPDATE invitation_campaigns
        SET description = ${body.description}, updated_at = NOW()
        WHERE id = ${campaignId}
      `;
    }

    if (body.status !== undefined) {
      await db`
        UPDATE invitation_campaigns
        SET status = ${body.status}::campaign_status, updated_at = NOW()
        WHERE id = ${campaignId}
      `;
    }

    if (body.email_subject !== undefined) {
      await db`
        UPDATE invitation_campaigns
        SET email_subject = ${body.email_subject}, updated_at = NOW()
        WHERE id = ${campaignId}
      `;
    }

    if (body.email_body !== undefined) {
      await db`
        UPDATE invitation_campaigns
        SET email_body = ${body.email_body}, updated_at = NOW()
        WHERE id = ${campaignId}
      `;
    }

    // Fetch updated campaign
    const result = await db`
      SELECT id, event_id, name, description, status, email_subject, email_body,
             total_considering, total_invited, total_accepted, total_declined,
             total_joined, created_at, updated_at
      FROM invitation_campaigns
      WHERE id = ${campaignId}
    `;

    logger.info('Campaign updated', {
      campaignId,
      updates: Object.keys(body),
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'campaign.updated',
      entityType: 'campaign',
      entityId: campaignId,
      previousValue: { name: existing[0].name, status: existing[0].status },
      newValue: body,
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json({
      campaign: result[0],
      message: 'Campaign updated successfully',
    });
  }
);

/**
 * DELETE /api/campaigns/[campaignId]
 * Delete a campaign and all its invitations
 */
export const DELETE = withErrorHandling(
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

    // Get database client
    const db = getDb();

    // Check if campaign exists
    const existing = await db`
      SELECT id, name, status
      FROM invitation_campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Delete campaign (CASCADE will delete invitations)
    await db`
      DELETE FROM invitation_campaigns
      WHERE id = ${campaignId}
    `;

    logger.info('Campaign deleted', {
      campaignId,
      name: existing[0].name,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'campaign.deleted',
      entityType: 'campaign',
      entityId: campaignId,
      previousValue: { name: existing[0].name },
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json({
      message: 'Campaign deleted successfully',
    });
  }
);

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { createCampaignSchema } from '@/lib/schemas/campaign';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

/**
 * POST /api/events/[eventId]/campaigns
 * Create a new invitation campaign for an event
 */
export const POST = withErrorHandling(
  async (req: Request, { params }: RouteParams) => {
    const auth = await requireAuth();
    const { eventId } = await params;

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);

    // Parse and validate request body
    const validation = await validateRequest(req, createCampaignSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

    // Get database client
    const db = getDb();

    // Check if event exists
    const event = await db`
      SELECT id, title
      FROM events
      WHERE id = ${eventIdNum}
      LIMIT 1
    `;

    if (!event || event.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Create campaign
    const result = await db`
      INSERT INTO invitation_campaigns (
        event_id,
        name,
        description,
        email_subject,
        email_body,
        status
      ) VALUES (
        ${eventIdNum},
        ${body.name},
        ${body.description || null},
        ${body.email_subject || null},
        ${body.email_body || null},
        'DRAFT'
      )
      RETURNING
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
    `;

    logger.info('Campaign created', {
      campaignId: result[0].id,
      eventId: eventIdNum,
      name: body.name,
    });

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'campaign.created',
      entityType: 'campaign',
      entityId: result[0].id,
      newValue: { name: body.name, event_id: eventIdNum },
      ipAddress: getClientIdentifier(req),
    });

    return NextResponse.json(
      {
        campaign: result[0],
        message: 'Campaign created successfully',
      },
      { status: 201 }
    );
  }
);

/**
 * GET /api/events/[eventId]/campaigns
 * List all campaigns for an event
 */
export const GET = withErrorHandling(
  async (_req: Request, { params }: RouteParams) => {
    const { eventId } = await params;

    if (!eventId || isNaN(Number(eventId))) {
      return NextResponse.json(
        { error: 'Valid eventId is required' },
        { status: 400 }
      );
    }

    const eventIdNum = Number(eventId);

    // Get database client
    const db = getDb();

    // Check if event exists
    const event = await db`
      SELECT id, title
      FROM events
      WHERE id = ${eventIdNum}
      LIMIT 1
    `;

    if (!event || event.length === 0) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all campaigns for this event
    const campaigns = await db`
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
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      campaigns,
      total: campaigns.length,
    });
  }
);

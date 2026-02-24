import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { validateRequest } from '@/lib/validate-request';
import { withErrorHandling } from '@/lib/with-error-handling';
import { bulkUpdateInvitationsSchema } from '@/lib/schemas/invitation';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

/**
 * POST /api/invitations/bulk-update
 * Bulk update invitations (status, tier, priority)
 */
export const POST = withErrorHandling(async (req: Request) => {
  const auth = await requireAuth();

  // Parse and validate request body
  const validation = await validateRequest(req, bulkUpdateInvitationsSchema);
    if (!validation.success) return validation.error;
    const body = validation.data;

  const { invitation_ids, updates } = body;

  // Validate at least one update field
  if (
    !updates.status &&
    !updates.tier &&
    !updates.priority
  ) {
    return NextResponse.json(
      { error: 'At least one update field is required' },
      { status: 400 }
    );
  }

  // Get database client
  const db = getDb();

  // Check if invitations exist
  const existing = await db`
    SELECT id
    FROM campaign_invitations
    WHERE id = ANY(${invitation_ids})
  `;

  if (!existing || existing.length === 0) {
    return NextResponse.json(
      { error: 'No invitations found with provided IDs' },
      { status: 404 }
    );
  }

  if (existing.length !== invitation_ids.length) {
    logger.warn('Some invitation IDs not found', {
      requested: invitation_ids.length,
      found: existing.length,
    });
  }

  // Build UPDATE using Neon template literals
  // We'll build the SET clause conditionally
  let result: any;

  if (
    updates.status !== undefined &&
    updates.tier !== undefined &&
    updates.priority !== undefined
  ) {
    result = await db`
      UPDATE campaign_invitations
      SET
        status = ${updates.status}::invitation_status,
        tier = ${updates.tier}::invitation_tier,
        priority = ${updates.priority}::invitation_priority,
        updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.status !== undefined && updates.tier !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET
        status = ${updates.status}::invitation_status,
        tier = ${updates.tier}::invitation_tier,
        updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.status !== undefined && updates.priority !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET
        status = ${updates.status}::invitation_status,
        priority = ${updates.priority}::invitation_priority,
        updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.tier !== undefined && updates.priority !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET
        tier = ${updates.tier}::invitation_tier,
        priority = ${updates.priority}::invitation_priority,
        updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.status !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET status = ${updates.status}::invitation_status, updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.tier !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET tier = ${updates.tier}::invitation_tier, updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  } else if (updates.priority !== undefined) {
    result = await db`
      UPDATE campaign_invitations
      SET priority = ${updates.priority}::invitation_priority, updated_at = NOW()
      WHERE id = ANY(${invitation_ids})
      RETURNING id
    `;
  }

  logger.info('Bulk invitation update', {
    count: result.length,
    updates: Object.keys(updates),
  });

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'invitation.bulk_updated',
    entityType: 'invitation',
    metadata: {
      count: result.length,
      updatedFields: Object.keys(updates),
      invitationIds: invitation_ids,
    },
    ipAddress: getClientIdentifier(req),
  });

  return NextResponse.json({
    updated: result.length,
    message: `Successfully updated ${result.length} invitations`,
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { generateBriefingSchema } from '@/lib/schemas/briefing';
import { generateBriefingForUser } from '@/lib/briefing/generator';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/briefings — List briefing packets
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const briefings = await db`
    SELECT bp.*, u.full_name AS generated_for_name, u.email AS generated_for_email
    FROM briefing_packets bp
    JOIN users u ON u.id = bp.generated_for
    WHERE bp.event_id = ${eventIdNum} AND bp.workspace_id = ${auth.workspace.id}
    ORDER BY bp.created_at DESC
  `;

  return NextResponse.json({ briefings });
});

/**
 * POST /api/events/[eventId]/briefings — Generate a new briefing
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, generateBriefingSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const targetUserId = validation.data.generated_for || auth.user.id;
  const briefingType = validation.data.briefing_type || 'PRE_EVENT';
  const title = validation.data.title || `${briefingType.replace('_', ' ')} Briefing`;

  // Create placeholder record
  const placeholder = await db`
    INSERT INTO briefing_packets (
      event_id, workspace_id, generated_for,
      briefing_type, status, title, content
    ) VALUES (
      ${eventIdNum}, ${auth.workspace.id}, ${targetUserId},
      ${briefingType}::briefing_type, 'GENERATING'::briefing_status,
      ${title}, '{}'::jsonb
    )
    RETURNING *
  `;

  const briefingId = placeholder[0].id;

  // Generate briefing content
  try {
    const content = await generateBriefingForUser(
      eventIdNum,
      auth.workspace.id,
      targetUserId,
      briefingType
    );

    const contentJson = JSON.stringify(content);

    const result = await db`
      UPDATE briefing_packets SET
        status = 'READY'::briefing_status,
        content = ${contentJson}::jsonb,
        guest_count = ${content.key_guests.length},
        model_version = 'claude-sonnet-4-20250514',
        generated_at = NOW()
      WHERE id = ${briefingId}
      RETURNING *
    `;

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'briefing.generated',
      entityType: 'briefing_packet',
      entityId: briefingId,
      newValue: { briefing_type: briefingType, guest_count: content.key_guests.length },
    });

    return NextResponse.json(result[0], { status: 201 });
  } catch (err) {
    // Mark as failed
    await db`
      UPDATE briefing_packets SET
        status = 'FAILED'::briefing_status,
        error_message = ${err instanceof Error ? err.message : 'Unknown error'}
      WHERE id = ${briefingId}
    `;

    throw err;
  }
});

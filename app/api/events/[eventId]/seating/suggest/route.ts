import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { generateSeatingPlan } from '@/lib/seating/optimizer';
import { generateSeatingSchema } from '@/lib/schemas/seating';

export const runtime = 'nodejs';

/**
 * POST /api/events/[eventId]/seating/suggest — Generate AI seating suggestions
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, generateSeatingSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { strategy, max_per_table } = validation.data;

  const result = await generateSeatingPlan(
    eventIdNum,
    auth.workspace.id,
    strategy,
    max_per_table
  );

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'seating.generate_suggestions',
    entityType: 'seating_suggestion',
    entityId: result.batchId,
    newValue: { event_id: eventIdNum, strategy, assignment_count: result.assignments.length },
  });

  return NextResponse.json({
    batch_id: result.batchId,
    assignments: result.assignments,
    total: result.assignments.length,
  });
});

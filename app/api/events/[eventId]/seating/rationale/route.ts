import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getSeatingRationale } from '@/lib/seating/optimizer';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/seating/rationale — Get AI seating rationale per contact
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum);

  const rationale = await getSeatingRationale(eventIdNum, workspaceId);

  return NextResponse.json({ rationale });
});

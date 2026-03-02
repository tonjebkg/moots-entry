import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateCheckinToken } from '@/lib/checkin-token';
import { validateRequest } from '@/lib/validate-request';
import { checkInGuest } from '@/lib/checkin/manager';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const doorCheckinSchema = z.object({
  contact_id: z.string().uuid(),
});

/**
 * POST /api/door/[token]/checkin — Check in a guest from Door View
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const { token } = await context.params;

  const validated = await validateCheckinToken(token);
  if (!validated) {
    return NextResponse.json(
      { error: 'Invalid or expired check-in link' },
      { status: 401 }
    );
  }

  const validation = await validateRequest(request, doorCheckinSchema);
  if (!validation.success) return validation.error;

  const db = getDb();

  // Check for duplicate check-in
  const existing = await db`
    SELECT id FROM event_checkins
    WHERE event_id = ${validated.event_id}
      AND contact_id = ${validation.data.contact_id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'Guest already checked in', checkin_id: existing[0].id },
      { status: 409 }
    );
  }

  const checkin = await checkInGuest({
    eventId: validated.event_id,
    workspaceId: validated.workspace_id,
    contactId: validation.data.contact_id,
    source: 'INVITATION',
    checkedInBy: validated.created_by,
  });

  logAction({
    workspaceId: validated.workspace_id,
    actorId: null,
    actorEmail: 'door-staff',
    action: 'checkin.door_checkin',
    entityType: 'event_checkin',
    entityId: checkin.id,
    metadata: { token_id: validated.token_id, contact_id: validation.data.contact_id },
  });

  return NextResponse.json(checkin, { status: 201 });
});

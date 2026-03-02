import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateCheckinToken } from '@/lib/checkin-token';
import { validateRequest } from '@/lib/validate-request';
import { onboardWalkIn } from '@/lib/checkin/manager';
import { logAction } from '@/lib/audit-log';
import { walkInSchema } from '@/lib/schemas/checkin';

export const runtime = 'nodejs';

/**
 * POST /api/door/[token]/walk-in — Register a walk-in from Door View
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

  const validation = await validateRequest(request, walkInSchema);
  if (!validation.success) return validation.error;

  const checkin = await onboardWalkIn({
    eventId: validated.event_id,
    workspaceId: validated.workspace_id,
    firstName: validation.data.first_name,
    lastName: validation.data.last_name,
    email: validation.data.email,
    phone: validation.data.phone,
    company: validation.data.company,
    linkedinUrl: validation.data.linkedin_url,
    attachedToContactId: validation.data.attached_to_contact_id,
    checkedInBy: validated.created_by,
    notes: validation.data.notes,
  });

  logAction({
    workspaceId: validated.workspace_id,
    actorId: null,
    actorEmail: 'door-staff',
    action: 'checkin.door_walk_in',
    entityType: 'event_checkin',
    entityId: checkin.id,
    metadata: { token_id: validated.token_id, full_name: `${validation.data.first_name} ${validation.data.last_name}` },
  });

  return NextResponse.json(checkin, { status: 201 });
});

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateCheckinToken } from '@/lib/checkin-token';
import { validateRequest } from '@/lib/validate-request';
import { checkInGuest } from '@/lib/checkin/manager';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

const scanSchema = z.object({
  qr_data: z.string().min(1).max(500),
});

/**
 * POST /api/door/[token]/scan — Process a scanned QR code from Door View
 * Looks up campaign_invitations.invitation_token matching the scanned string.
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

  const validation = await validateRequest(request, scanSchema);
  if (!validation.success) return validation.error;

  const db = getDb();
  const qrData = validation.data.qr_data.trim();

  // Look up invitation by token
  const invitations = await db`
    SELECT
      ci.id AS invitation_id,
      ci.full_name,
      ci.email,
      ci.contact_id,
      ci.table_assignment,
      pc.company,
      pc.title
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    LEFT JOIN people_contacts pc ON pc.id = ci.contact_id
    WHERE ci.invitation_token = ${qrData}
      AND ic.event_id = ${validated.event_id}
    LIMIT 1
  `;

  if (invitations.length === 0) {
    return NextResponse.json({
      status: 'not_found',
      message: 'QR code not recognized',
    });
  }

  const invitation = invitations[0];

  // Check if already checked in
  const existing = await db`
    SELECT id, created_at FROM event_checkins
    WHERE event_id = ${validated.event_id}
      AND (invitation_id = ${invitation.invitation_id} OR contact_id = ${invitation.contact_id})
    LIMIT 1
  `;

  if (existing.length > 0) {
    return NextResponse.json({
      status: 'already_checked_in',
      guest_name: invitation.full_name,
      company: invitation.company,
      table_assignment: invitation.table_assignment,
      checked_in_at: existing[0].created_at,
    });
  }

  // Check in the guest
  const checkin = await checkInGuest({
    eventId: validated.event_id,
    workspaceId: validated.workspace_id,
    contactId: invitation.contact_id || undefined,
    invitationId: invitation.invitation_id,
    source: 'QR_SCAN',
    checkedInBy: validated.created_by,
  });

  logAction({
    workspaceId: validated.workspace_id,
    actorId: null,
    actorEmail: 'door-staff',
    action: 'checkin.door_qr_scan',
    entityType: 'event_checkin',
    entityId: checkin.id,
    metadata: { token_id: validated.token_id, invitation_id: invitation.invitation_id },
  });

  return NextResponse.json({
    status: 'checked_in',
    guest_name: invitation.full_name,
    company: invitation.company,
    table_assignment: invitation.table_assignment,
    checked_in_at: checkin.created_at,
  });
});

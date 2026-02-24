import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { importFromEventSchema } from '@/lib/schemas/contact';
import { importFromEvent } from '@/lib/contacts/import';

/**
 * POST /api/contacts/import-from-event — Import guests from campaign invitations into contacts
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const result = await validateRequest(request, importFromEventSchema);
  if (!result.success) return result.error;
  const { data } = result;

  const importResult = await importFromEvent(
    auth.workspace.id,
    data.event_id,
    data.campaign_id
  );

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'contact.imported_from_event',
    entityType: 'contact',
    entityId: null,
    metadata: {
      event_id: data.event_id,
      campaign_id: data.campaign_id,
      imported: importResult.imported,
      skipped: importResult.skipped,
    },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({
    imported: importResult.imported,
    skipped: importResult.skipped,
    errors: importResult.errors.slice(0, 50),
    message: `Imported ${importResult.imported} contacts from event`,
  });
});

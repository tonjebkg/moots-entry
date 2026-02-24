import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { bulkTagSchema } from '@/lib/schemas/contact';

/**
 * POST /api/contacts/bulk-tag — Add or remove tags on multiple contacts
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const result = await validateRequest(request, bulkTagSchema);
  if (!result.success) return result.error;
  const { contact_ids, action, tags } = result.data;

  const db = getDb();

  let updated;
  if (action === 'add') {
    updated = await db`
      UPDATE people_contacts
      SET tags = (
        SELECT ARRAY(SELECT DISTINCT unnest(tags || ${tags}::text[]))
      )
      WHERE id = ANY(${contact_ids}::uuid[])
        AND workspace_id = ${auth.workspace.id}
      RETURNING id
    `;
  } else {
    updated = await db`
      UPDATE people_contacts
      SET tags = (
        SELECT ARRAY(SELECT unnest(tags) EXCEPT SELECT unnest(${tags}::text[]))
      )
      WHERE id = ANY(${contact_ids}::uuid[])
        AND workspace_id = ${auth.workspace.id}
      RETURNING id
    `;
  }

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: `contact.bulk_tag_${action}`,
    entityType: 'contact',
    entityId: null,
    metadata: {
      contact_count: updated.length,
      tags,
      action,
    },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({
    updated: updated.length,
    message: `${action === 'add' ? 'Added' : 'Removed'} tags on ${updated.length} contacts`,
  });
});

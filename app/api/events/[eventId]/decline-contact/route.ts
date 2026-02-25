import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { logAction } from '@/lib/audit-log';
import { getClientIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

const declineSchema = z.object({
  contact_id: z.string().uuid(),
});

type RouteParams = { params: Promise<{ eventId: string }> };

/**
 * POST /api/events/[eventId]/decline-contact — Decline an inbound contact by tagging them
 */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params;
  const eventIdNum = parseInt(eventId);
  const { workspaceId, userId } = await tryAuthOrEventFallback(eventIdNum);
  const db = getDb();

  const body = await request.json();
  const parsed = declineSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Valid contact_id is required' }, { status: 400 });
  }
  const { contact_id } = parsed.data;

  // Verify contact belongs to workspace
  const contact = await db`
    SELECT id, tags FROM people_contacts
    WHERE id = ${contact_id} AND workspace_id = ${workspaceId}
  `;

  if (contact.length === 0) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  // Add 'declined' tag if not already present
  const currentTags: string[] = contact[0].tags || [];
  if (!currentTags.includes('declined')) {
    const newTags = [...currentTags, 'declined'];
    await db`
      UPDATE people_contacts
      SET tags = ${newTags}::text[], updated_at = NOW()
      WHERE id = ${contact_id} AND workspace_id = ${workspaceId}
    `;
  }

  logAction({
    workspaceId,
    actorId: userId || null,
    actorEmail: userId ? undefined : 'system',
    action: 'contact.declined',
    entityType: 'contact',
    entityId: contact_id,
    metadata: { event_id: eventIdNum },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ success: true });
});

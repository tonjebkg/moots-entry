import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { createSponsorSchema } from '@/lib/schemas/sponsor';
import { requireAuth, requireRole } from '@/lib/auth';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { getClientIdentifier } from '@/lib/rate-limit';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ eventId: string }> };

/**
 * GET /api/events/[eventId]/sponsors — List all sponsors for an event
 */
export const GET = withErrorHandling(async (_request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const db = getDb();

  const sponsors = await db`
    SELECT id, name, tier, logo_url, website_url, description,
           contact_person, contact_email, goals, promised_seats,
           table_preference, key_attendees, notes, sort_order,
           created_at, updated_at
    FROM event_sponsors
    WHERE event_id = ${Number(eventId)} AND workspace_id = ${auth.workspace.id}
    ORDER BY sort_order ASC, created_at ASC
  `;

  return NextResponse.json({ sponsors });
});

/**
 * POST /api/events/[eventId]/sponsors — Create a new sponsor
 */
export const POST = withErrorHandling(async (request: NextRequest, context: RouteContext) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const { eventId } = await context.params;
  const validation = await validateRequest(request, createSponsorSchema);
  if (!validation.success) return validation.error;
  const data = validation.data;

  const db = getDb();
  const goalsJson = JSON.stringify(data.goals || []);
  const keyAttendeesJson = JSON.stringify(data.key_attendees || []);

  const result = await db`
    INSERT INTO event_sponsors (
      event_id, workspace_id, name, tier, logo_url, website_url,
      description, contact_person, contact_email, goals,
      promised_seats, table_preference, key_attendees, notes, sort_order
    ) VALUES (
      ${Number(eventId)}, ${auth.workspace.id},
      ${data.name}, ${data.tier || null}, ${data.logo_url || null}, ${data.website_url || null},
      ${data.description || null}, ${data.contact_person || null}, ${data.contact_email || null},
      ${goalsJson}::jsonb,
      ${data.promised_seats || null}, ${data.table_preference || null},
      ${keyAttendeesJson}::jsonb,
      ${data.notes || null}, ${data.sort_order || 0}
    )
    RETURNING id
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'sponsor.created',
    entityType: 'event_sponsor',
    entityId: result[0].id,
    newValue: { name: data.name, tier: data.tier, event_id: eventId },
    ipAddress: getClientIdentifier(request),
  });

  return NextResponse.json({ id: result[0].id, message: 'Sponsor created' }, { status: 201 });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { createRsvpPageSchema, updateRsvpPageSchema } from '@/lib/schemas/rsvp-page';
import { NotFoundError, ConflictError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/events/[eventId]/rsvp-page — Get RSVP page config for this event
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const pages = await db`
    SELECT rp.*,
      (SELECT COUNT(*)::int FROM rsvp_submissions rs WHERE rs.rsvp_page_id = rp.id) AS submission_count
    FROM rsvp_pages rp
    WHERE rp.event_id = ${eventIdNum} AND rp.workspace_id = ${auth.workspace.id}
    LIMIT 1
  `;

  if (pages.length === 0) {
    return NextResponse.json({ page: null });
  }

  return NextResponse.json({ page: pages[0] });
});

/**
 * POST /api/events/[eventId]/rsvp-page — Create RSVP page
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const validation = await validateRequest(request, createRsvpPageSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  // Check if page already exists
  const existing = await db`
    SELECT id FROM rsvp_pages WHERE event_id = ${eventIdNum} AND workspace_id = ${auth.workspace.id}
  `;
  if (existing.length > 0) {
    throw new ConflictError('RSVP page already exists for this event');
  }

  // Check slug uniqueness
  const slugExists = await db`SELECT id FROM rsvp_pages WHERE slug = ${validation.data.slug}`;
  if (slugExists.length > 0) {
    throw new ConflictError('Slug already in use');
  }

  const d = validation.data;
  const customFieldsJson = JSON.stringify(d.custom_fields);

  const result = await db`
    INSERT INTO rsvp_pages (
      event_id, workspace_id, slug, headline, description, hero_image_url,
      accent_color, show_location, show_date, show_capacity,
      custom_fields, access_code, max_submissions
    ) VALUES (
      ${eventIdNum}, ${auth.workspace.id}, ${d.slug}, ${d.headline},
      ${d.description || null}, ${d.hero_image_url || null},
      ${d.accent_color}, ${d.show_location}, ${d.show_date}, ${d.show_capacity},
      ${customFieldsJson}::jsonb, ${d.access_code || null}, ${d.max_submissions || null}
    )
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'rsvp_page.created',
    entityType: 'rsvp_page',
    entityId: result[0].id,
    newValue: { slug: d.slug, event_id: eventIdNum },
  });

  return NextResponse.json(result[0], { status: 201 });
});

/**
 * PATCH /api/events/[eventId]/rsvp-page — Update RSVP page
 */
export const PATCH = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN');

  const validation = await validateRequest(request, updateRsvpPageSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const db = getDb();

  const existing = await db`
    SELECT * FROM rsvp_pages WHERE event_id = ${eventIdNum} AND workspace_id = ${auth.workspace.id}
  `;
  if (existing.length === 0) throw new NotFoundError('RSVP page');

  const d = validation.data;
  const updates: Record<string, unknown> = {};
  if (d.slug !== undefined) updates.slug = d.slug;
  if (d.headline !== undefined) updates.headline = d.headline;
  if (d.description !== undefined) updates.description = d.description;
  if (d.hero_image_url !== undefined) updates.hero_image_url = d.hero_image_url;
  if (d.accent_color !== undefined) updates.accent_color = d.accent_color;
  if (d.show_location !== undefined) updates.show_location = d.show_location;
  if (d.show_date !== undefined) updates.show_date = d.show_date;
  if (d.show_capacity !== undefined) updates.show_capacity = d.show_capacity;
  if (d.is_active !== undefined) updates.is_active = d.is_active;
  if (d.access_code !== undefined) updates.access_code = d.access_code;
  if (d.max_submissions !== undefined) updates.max_submissions = d.max_submissions;

  const customFieldsJson = d.custom_fields ? JSON.stringify(d.custom_fields) : undefined;

  const result = await db`
    UPDATE rsvp_pages SET
      slug = COALESCE(${d.slug ?? null}, slug),
      headline = COALESCE(${d.headline ?? null}, headline),
      description = COALESCE(${d.description ?? null}, description),
      hero_image_url = COALESCE(${d.hero_image_url ?? null}, hero_image_url),
      accent_color = COALESCE(${d.accent_color ?? null}, accent_color),
      show_location = COALESCE(${d.show_location ?? null}, show_location),
      show_date = COALESCE(${d.show_date ?? null}, show_date),
      show_capacity = COALESCE(${d.show_capacity ?? null}, show_capacity),
      is_active = COALESCE(${d.is_active ?? null}, is_active),
      access_code = COALESCE(${d.access_code ?? null}, access_code),
      max_submissions = COALESCE(${d.max_submissions ?? null}, max_submissions),
      custom_fields = COALESCE(${customFieldsJson ?? null}::jsonb, custom_fields)
    WHERE event_id = ${eventIdNum} AND workspace_id = ${auth.workspace.id}
    RETURNING *
  `;

  logAction({
    workspaceId: auth.workspace.id,
    actorId: auth.user.id,
    actorEmail: auth.user.email,
    action: 'rsvp_page.updated',
    entityType: 'rsvp_page',
    entityId: result[0].id,
    newValue: updates,
  });

  return NextResponse.json(result[0]);
});

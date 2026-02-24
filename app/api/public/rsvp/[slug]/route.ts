import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { validateRequest } from '@/lib/validate-request';
import { logAction } from '@/lib/audit-log';
import { getDb } from '@/lib/db';
import { publicRsvpSubmissionSchema } from '@/lib/schemas/rsvp-page';
import { validateAccessCode } from '@/lib/rsvp-page/slug';
import { checkRsvpSubmissionRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { RateLimitError, NotFoundError } from '@/lib/errors';
import { sendRsvpConfirmationEmail } from '@/lib/email-service';

export const runtime = 'nodejs';

/**
 * GET /api/public/rsvp/[slug] — Get RSVP page data (public, no auth)
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { slug } = await context.params;
  const db = getDb();

  const pages = await db`
    SELECT rp.*, e.title AS event_title, e.description AS event_description,
      e.start_time, e.end_time, e.timezone,
      e.location,
      (SELECT COUNT(*)::int FROM rsvp_submissions rs WHERE rs.rsvp_page_id = rp.id) AS submission_count
    FROM rsvp_pages rp
    JOIN events e ON e.id = rp.event_id
    WHERE rp.slug = ${slug} AND rp.is_active = TRUE
  `;

  if (pages.length === 0) {
    throw new NotFoundError('RSVP page');
  }

  const page = pages[0];

  // Don't expose access_code, workspace_id to public
  return NextResponse.json({
    id: page.id,
    slug: page.slug,
    headline: page.headline,
    description: page.description,
    hero_image_url: page.hero_image_url,
    accent_color: page.accent_color,
    show_location: page.show_location,
    show_date: page.show_date,
    show_capacity: page.show_capacity,
    custom_fields: page.custom_fields,
    has_access_code: !!page.access_code,
    event_title: page.event_title,
    event_description: page.event_description,
    start_time: page.start_time,
    end_time: page.end_time,
    timezone: page.timezone,
    location: page.show_location ? page.location : null,
    is_full: page.max_submissions ? page.submission_count >= page.max_submissions : false,
  });
});

/**
 * POST /api/public/rsvp/[slug] — Submit RSVP (public, rate-limited)
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const { slug } = await context.params;

  // Rate limit
  const identifier = getClientIdentifier(request);
  const rateCheck = checkRsvpSubmissionRateLimit(`rsvp:${identifier}`);
  if (!rateCheck.success) {
    throw new RateLimitError(Math.ceil((rateCheck.reset - Date.now()) / 1000));
  }

  const validation = await validateRequest(request, publicRsvpSubmissionSchema);
  if (!validation.success) return validation.error;

  const db = getDb();

  // Look up page
  const pages = await db`
    SELECT rp.*, e.title AS event_title
    FROM rsvp_pages rp
    JOIN events e ON e.id = rp.event_id
    WHERE rp.slug = ${slug} AND rp.is_active = TRUE
  `;

  if (pages.length === 0) {
    throw new NotFoundError('RSVP page');
  }

  const page = pages[0];

  // Check access code
  if (!validateAccessCode(page.access_code, validation.data.access_code)) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 403 });
  }

  // Check capacity
  if (page.max_submissions) {
    const count = await db`
      SELECT COUNT(*)::int AS count FROM rsvp_submissions WHERE rsvp_page_id = ${page.id}
    `;
    if (count[0].count >= page.max_submissions) {
      return NextResponse.json({ error: 'Event is at capacity' }, { status: 409 });
    }
  }

  // Check duplicate email
  const existingSubmission = await db`
    SELECT id FROM rsvp_submissions
    WHERE rsvp_page_id = ${page.id} AND email = ${validation.data.email}
  `;
  if (existingSubmission.length > 0) {
    return NextResponse.json({ error: 'You have already submitted an RSVP' }, { status: 409 });
  }

  const d = validation.data;
  const customJson = JSON.stringify(d.custom_responses);

  const result = await db`
    INSERT INTO rsvp_submissions (
      rsvp_page_id, event_id, workspace_id,
      full_name, email, company, title, phone, plus_ones,
      custom_responses, notes, ip_address
    ) VALUES (
      ${page.id}, ${page.event_id}, ${page.workspace_id},
      ${d.full_name}, ${d.email}, ${d.company || null}, ${d.title || null},
      ${d.phone || null}, ${d.plus_ones},
      ${customJson}::jsonb, ${d.notes || null}, ${identifier}::inet
    )
    RETURNING id, created_at
  `;

  logAction({
    workspaceId: page.workspace_id,
    actorId: null,
    actorEmail: d.email,
    action: 'rsvp_submission.created',
    entityType: 'rsvp_submission',
    entityId: result[0].id,
    newValue: { full_name: d.full_name, email: d.email, event_id: page.event_id },
  });

  // Send confirmation email (fire and forget)
  sendRsvpConfirmationEmail({
    to: d.email,
    recipientName: d.full_name,
    eventTitle: page.event_title,
  }).catch(() => {});

  return NextResponse.json(
    { success: true, submission_id: result[0].id },
    { status: 201 }
  );
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { getDb } from '@/lib/db';
import { NotFoundError } from '@/lib/errors';

export const runtime = 'nodejs';

/**
 * GET /api/public/rsvp/[slug]/details — Get event details for RSVP page (public)
 */
export const GET = withErrorHandling(async (request: NextRequest, context: any) => {
  const { slug } = await context.params;
  const db = getDb();

  const pages = await db`
    SELECT e.title, e.description, e.start_time, e.end_time, e.timezone,
      e.location, e.image_url, e.max_attendees,
      rp.show_location, rp.show_date, rp.show_capacity
    FROM rsvp_pages rp
    JOIN events e ON e.id = rp.event_id
    WHERE rp.slug = ${slug} AND rp.is_active = TRUE
  `;

  if (pages.length === 0) {
    throw new NotFoundError('RSVP page');
  }

  const p = pages[0];

  return NextResponse.json({
    title: p.title,
    description: p.description,
    start_time: p.show_date ? p.start_time : null,
    end_time: p.show_date ? p.end_time : null,
    timezone: p.show_date ? p.timezone : null,
    location: p.show_location ? p.location : null,
    image_url: p.image_url,
    max_attendees: p.show_capacity ? p.max_attendees : null,
  });
});

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { tryAuthOrEventFallback } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { z } from 'zod';

type RouteParams = { params: Promise<{ eventId: string; contactId: string }> };

const createNoteSchema = z.object({
  note_text: z.string().min(1).max(5000),
  author_name: z.string().max(200).optional(),
});

/**
 * GET /api/events/[eventId]/contacts/[contactId]/notes
 * Get all event notes for a contact at a specific event
 */
export const GET = withErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { eventId, contactId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum);

  const db = getDb();
  const notes = await db`
    SELECT id, note_text, author_id, author_name, created_at, updated_at
    FROM event_notes
    WHERE event_id = ${eventIdNum}
      AND contact_id = ${contactId}
      AND workspace_id = ${workspaceId}
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ notes });
});

/**
 * POST /api/events/[eventId]/contacts/[contactId]/notes
 * Add a new event note
 */
export const POST = withErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { eventId, contactId } = await params;
  const eventIdNum = parseInt(eventId, 10);
  const { workspaceId, userId } = await tryAuthOrEventFallback(eventIdNum);

  const body = await request.json();
  const parsed = createNoteSchema.parse(body);

  const db = getDb();

  // Get author name from user if available
  let authorName = parsed.author_name || null;
  if (!authorName && userId) {
    const user = await db`SELECT full_name FROM users WHERE id = ${userId} LIMIT 1`;
    authorName = user[0]?.full_name || null;
  }

  const result = await db`
    INSERT INTO event_notes (event_id, contact_id, workspace_id, author_id, author_name, note_text)
    VALUES (${eventIdNum}, ${contactId}, ${workspaceId}, ${userId || null}, ${authorName}, ${parsed.note_text})
    RETURNING id, note_text, author_id, author_name, created_at
  `;

  return NextResponse.json({ note: result[0] }, { status: 201 });
});

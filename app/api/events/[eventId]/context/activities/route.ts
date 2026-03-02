import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tryAuthOrEventFallback } from '@/lib/auth'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/context/activities
 * Fetch activity feed history for the context tab
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)
    await tryAuthOrEventFallback(eventIdNum)
    const db = getDb()

    const result = await db`
      SELECT
        id,
        type,
        text,
        details::text as details_raw,
        actions::text as actions_raw,
        speakers::text as speakers_raw,
        metadata::text as metadata_raw,
        created_at
      FROM event_activities
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at ASC
      LIMIT 200
    `

    const activities = result.map((row: any) => ({
      id: row.id,
      eventId,
      type: row.type,
      text: row.text,
      timestamp: row.created_at,
      details: row.details_raw ? JSON.parse(row.details_raw) : undefined,
      actions: row.actions_raw ? JSON.parse(row.actions_raw) : undefined,
      speakers: row.speakers_raw ? JSON.parse(row.speakers_raw) : undefined,
      metadata: row.metadata_raw ? JSON.parse(row.metadata_raw) : undefined,
    }))

    return NextResponse.json({ activities })
  } catch (err: any) {
    console.error('[GET /context/activities] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

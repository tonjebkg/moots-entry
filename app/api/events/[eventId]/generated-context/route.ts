import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tryAuthOrEventFallback } from '@/lib/auth'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/generated-context
 * Fetch the most recent generated context for an event
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
        sponsors::text as sponsors_raw,
        strategic_significance,
        market_context,
        completeness::text as completeness_raw,
        model_version,
        generated_at
      FROM event_generated_context
      WHERE event_id = ${eventIdNum}
      ORDER BY generated_at DESC
      LIMIT 1
    `

    if (result.length === 0) {
      return NextResponse.json({ context: null })
    }

    const row = result[0]

    return NextResponse.json({
      context: {
        id: row.id,
        eventId,
        sponsors: row.sponsors_raw ? JSON.parse(row.sponsors_raw) : [],
        strategicSignificance: row.strategic_significance || '',
        marketContext: row.market_context || '',
        completeness: row.completeness_raw ? JSON.parse(row.completeness_raw) : [],
        generatedAt: row.generated_at,
        modelVersion: row.model_version || '',
      },
    })
  } catch (err: any) {
    console.error('[GET /generated-context] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch generated context' }, { status: 500 })
  }
}

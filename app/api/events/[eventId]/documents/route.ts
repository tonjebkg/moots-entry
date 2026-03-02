import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { tryAuthOrEventFallback } from '@/lib/auth'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/documents
 * List all documents for an event
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)
    const { workspaceId } = await tryAuthOrEventFallback(eventIdNum)
    const db = getDb()

    const result = await db`
      SELECT id, name, size_bytes, file_type, blob_url, status, error_message, created_at, analyzed_at
      FROM event_documents
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at ASC
    `

    const documents = result.map((d: any) => {
      const size = Number(d.size_bytes || 0)
      const sizeFormatted =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
            ? `${(size / 1024).toFixed(0)} KB`
            : `${(size / (1024 * 1024)).toFixed(1)} MB`

      return {
        id: d.id,
        eventId,
        name: d.name,
        size,
        sizeFormatted,
        type: d.file_type,
        blobUrl: d.blob_url,
        status: d.status,
        errorMessage: d.error_message,
        createdAt: d.created_at,
        analyzedAt: d.analyzed_at,
      }
    })

    return NextResponse.json({ documents })
  } catch (err: any) {
    console.error('[GET /documents] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

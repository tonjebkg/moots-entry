import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole, tryAuthOrEventFallback } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

const addLinkSchema = z.object({
  url: z.string().url().max(2000),
  label: z.string().max(500).optional(),
})

const deleteLinkSchema = z.object({
  id: z.string().uuid(),
})

/**
 * GET /api/events/[eventId]/links
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)
    await tryAuthOrEventFallback(eventIdNum)
    const db = getDb()

    const result = await db`
      SELECT id, url, label, created_at
      FROM event_links
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at ASC
    `

    const links = result.map((l: any) => ({
      id: l.id,
      eventId,
      url: l.url,
      label: l.label,
      createdAt: l.created_at,
    }))

    return NextResponse.json({ links })
  } catch (err: any) {
    console.error('[GET /links] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

/**
 * POST /api/events/[eventId]/links
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)

    const body = await request.json()
    const parsed = addLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const { url, label } = parsed.data
    const derivedLabel = label || (() => {
      try { return new URL(url).hostname } catch { return url }
    })()

    const db = getDb()
    const result = await db`
      INSERT INTO event_links (event_id, workspace_id, url, label)
      VALUES (${eventIdNum}, ${auth.workspace.id}, ${url}, ${derivedLabel})
      RETURNING id, url, label, created_at
    `

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'link.added',
      entityType: 'event_link',
      entityId: result[0].id,
      newValue: { url, label: derivedLabel },
      ipAddress: getClientIdentifier(request),
    })

    return NextResponse.json({
      id: result[0].id,
      eventId,
      url: result[0].url,
      label: result[0].label,
      createdAt: result[0].created_at,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /links] Error:', err)
    return NextResponse.json({ error: 'Failed to add link' }, { status: 500 })
  }
}

/**
 * DELETE /api/events/[eventId]/links
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)

    const body = await request.json()
    const parsed = deleteLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid link ID' }, { status: 400 })
    }

    const db = getDb()
    await db`
      DELETE FROM event_links
      WHERE id = ${parsed.data.id}
        AND event_id = ${eventIdNum}
    `

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'link.deleted',
      entityType: 'event_link',
      entityId: parsed.data.id,
      ipAddress: getClientIdentifier(request),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /links] Error:', err)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}

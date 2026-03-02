import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { getClientIdentifier } from '@/lib/rate-limit'
import { z } from 'zod'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

const ALLOWED_FIELDS = [
  'title', 'description', 'event_theme', 'success_criteria',
  'budget_range', 'additional_context', 'dress_code',
] as const

const updateFieldSchema = z.object({
  field: z.string(),
  value: z.string().max(5000),
})

/**
 * PATCH /api/events/[eventId]/details
 * Update a single event field from inline edit
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')
    const { eventId } = await params
    const eventIdNum = parseInt(eventId)

    const body = await request.json()
    const parsed = updateFieldSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid field or value' }, { status: 400 })
    }

    const { field, value } = parsed.data

    // Map frontend field names to DB column names
    const fieldMapping: Record<string, string> = {
      name: 'title',
      title: 'title',
      description: 'description',
      dressCode: 'additional_context', // Stored in additional_context for now
      dress_code: 'additional_context',
      event_theme: 'event_theme',
      success_criteria: 'success_criteria',
      budget_range: 'budget_range',
      additional_context: 'additional_context',
    }

    const dbField = fieldMapping[field]
    if (!dbField) {
      return NextResponse.json({ error: `Field '${field}' not updatable` }, { status: 400 })
    }

    const db = getDb()

    // Dynamic field update using conditional SQL
    if (dbField === 'title') {
      await db`UPDATE events SET title = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    } else if (dbField === 'description') {
      await db`UPDATE events SET description = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    } else if (dbField === 'event_theme') {
      await db`UPDATE events SET event_theme = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    } else if (dbField === 'success_criteria') {
      await db`UPDATE events SET success_criteria = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    } else if (dbField === 'budget_range') {
      await db`UPDATE events SET budget_range = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    } else if (dbField === 'additional_context') {
      await db`UPDATE events SET additional_context = ${value}, updated_at = NOW() WHERE id = ${eventIdNum}`
    }

    logAction({
      workspaceId: auth.workspace.id,
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'event.field_updated',
      entityType: 'event',
      entityId: String(eventIdNum),
      newValue: { field, value },
      ipAddress: getClientIdentifier(request),
    })

    return NextResponse.json({ success: true, field, value })
  } catch (err: any) {
    console.error('[PATCH /details] Error:', err)
    return NextResponse.json({ error: 'Failed to update field' }, { status: 500 })
  }
}

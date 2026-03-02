import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandling } from '@/lib/with-error-handling'
import { tryAuthOrEventFallback } from '@/lib/auth'
import { getDb } from '@/lib/db'

export const runtime = 'nodejs'

type RouteParams = { params: Promise<{ eventId: string }> }

/**
 * GET /api/events/[eventId]/team-members
 * Returns workspace members for the event's workspace.
 * Uses tryAuthOrEventFallback so it works without session cookie.
 */
export const GET = withErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { eventId } = await params
  const eventIdNum = parseInt(eventId, 10)
  const { workspaceId } = await tryAuthOrEventFallback(eventIdNum)
  const db = getDb()

  const result = await db`
    SELECT
      wm.user_id,
      u.full_name AS user_full_name,
      u.email AS user_email,
      u.avatar_url AS user_avatar_url,
      wm.role
    FROM workspace_members wm
    JOIN users u ON u.id = wm.user_id
    WHERE wm.workspace_id = ${workspaceId}
    ORDER BY
      CASE wm.role
        WHEN 'OWNER' THEN 0
        WHEN 'ADMIN' THEN 1
        WHEN 'TEAM_MEMBER' THEN 2
        WHEN 'EXTERNAL_PARTNER' THEN 3
        WHEN 'VIEWER' THEN 4
      END,
      wm.invited_at ASC
  `

  return NextResponse.json({ members: result })
})

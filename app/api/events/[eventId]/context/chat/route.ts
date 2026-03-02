import { NextRequest } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getAnthropicClient } from '@/lib/anthropic'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { getClientIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const CHAT_SYSTEM_PROMPT = `You are Moots Intelligence, an AI assistant for professional event hosts.

You are helping the host brainstorm and research for their event. You have access to the event context, documents, and conversation history.

When the user asks you to research, find speakers, look up sponsors, or suggest ideas:
1. Think step by step about what to search for
2. Provide specific, actionable intelligence
3. If suggesting people, include relevance scores (0-100) and brief rationale

Respond in conversational but professional tone. Be specific and opinionated — the host wants intelligence, not generic advice.

Your response should be plain text. The system will format it as activity items in the feed.`

/**
 * POST /api/events/[eventId]/context/chat
 * SSE stream: user message → AI research → streamed activity items
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')

    const { eventId } = await context.params
    const eventIdNum = parseInt(eventId, 10)
    const db = getDb()

    const body = await request.json()
    const { message } = body

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Save user message activity
    await db`
      INSERT INTO event_activities (event_id, workspace_id, type, text)
      VALUES (${eventIdNum}, ${auth.workspace.id}, 'user', ${message})
    `

    // Fetch event context
    const eventRows = await db`
      SELECT title, description, location::text as location_raw, start_date, total_capacity,
             hosts::text as hosts_raw, sponsors::text as sponsors_raw,
             success_criteria, event_theme, additional_context
      FROM events WHERE id = ${eventIdNum} LIMIT 1
    `

    // Fetch recent activities for conversation context
    const recentActivities = await db`
      SELECT type, text FROM event_activities
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at DESC LIMIT 20
    `

    // Fetch generated context
    const genCtx = await db`
      SELECT strategic_significance, market_context
      FROM event_generated_context
      WHERE event_id = ${eventIdNum}
      ORDER BY generated_at DESC LIMIT 1
    `

    const event = eventRows[0] || {}
    const contextParts = [
      `Event: ${event.title || 'Unknown'}`,
      event.description ? `Description: ${event.description}` : '',
      event.location_raw ? `Location: ${event.location_raw}` : '',
      event.start_date ? `Date: ${event.start_date}` : '',
      event.sponsors_raw ? `Sponsors: ${event.sponsors_raw}` : '',
      event.success_criteria ? `Success Criteria: ${event.success_criteria}` : '',
      genCtx.length > 0 ? `Strategic Significance: ${genCtx[0].strategic_significance}` : '',
      genCtx.length > 0 ? `Market Context: ${genCtx[0].market_context}` : '',
    ].filter(Boolean).join('\n')

    // Build conversation history
    const historyMessages = recentActivities
      .reverse()
      .filter((a: any) => a.type === 'user' || a.type === 'insight' || a.type === 'found')
      .map((a: any) => ({
        role: a.type === 'user' ? ('user' as const) : ('assistant' as const),
        content: a.text,
      }))

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(type: string, data: any) {
          const payload = JSON.stringify({ type, data })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        }

        try {
          // Stream: researching
          send('activity', {
            id: crypto.randomUUID(),
            eventId,
            type: 'researching',
            text: 'Thinking...',
            timestamp: new Date().toISOString(),
          })

          const client = getAnthropicClient()

          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: `${CHAT_SYSTEM_PROMPT}\n\nEvent Context:\n${contextParts}`,
            messages: [
              ...historyMessages.slice(-10),
              { role: 'user' as const, content: message },
            ],
          })

          const responseText =
            response.content[0].type === 'text' ? response.content[0].text : ''

          // Save AI response as activity
          const activityId = crypto.randomUUID()
          await db`
            INSERT INTO event_activities (id, event_id, workspace_id, type, text)
            VALUES (${activityId}, ${eventIdNum}, ${auth.workspace.id}, 'insight', ${responseText})
          `

          send('activity', {
            id: activityId,
            eventId,
            type: 'insight',
            text: responseText,
            timestamp: new Date().toISOString(),
          })

          send('done', null)

          logAction({
            workspaceId: auth.workspace.id,
            actorId: auth.user.id,
            actorEmail: auth.user.email,
            action: 'context.chat',
            entityType: 'event_activity',
            entityId: activityId,
            newValue: { message: message.slice(0, 200) },
            ipAddress: getClientIdentifier(request),
          })
        } catch (err: any) {
          console.error('[context/chat] Error:', err)
          send('error', { message: err.message || 'Chat failed', code: 'CHAT_ERROR' })
        }

        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err: any) {
    console.error('[POST /context/chat] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Chat failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

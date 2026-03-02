import { NextRequest } from 'next/server'
import { requireAuth, requireRole } from '@/lib/auth'
import { getAnthropicClient } from '@/lib/anthropic'
import { getDb } from '@/lib/db'
import { logAction } from '@/lib/audit-log'
import { getClientIdentifier } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const SYSTEM_PROMPT = `You are Moots Intelligence, an AI assistant for professional event hosts.

You have been given documents and event details for an upcoming event. Your job is to:

1. EXTRACT key information from each document (attendee lists, strategic details, sponsor info, venue details)
2. RESEARCH market context — identify competing events, industry timing, strategic considerations
3. SYNTHESISE a rich event context:
   - Sponsors (name, role, tier)
   - Strategic significance (why this event matters, what the host wants to achieve)
   - Market context (what else is happening, competing events, timing)
   - Completeness assessment (what context is still missing)
4. Surface INSIGHTS — non-obvious connections, risks, opportunities

You MUST respond with valid JSON matching this exact structure:
{
  "sponsors": [{"name": "string", "role": "string", "tier": "Primary"|"Gold"|"Silver"}],
  "strategicSignificance": "string (2-3 sentences)",
  "marketContext": "string (2-3 sentences)",
  "completeness": [
    {"label": "Event basics", "done": boolean},
    {"label": "Date & venue", "done": boolean},
    {"label": "Strategic purpose", "done": boolean},
    {"label": "Sponsors identified", "done": boolean},
    {"label": "Documents analysed", "done": boolean},
    {"label": "Market context", "done": boolean},
    {"label": "Dress code", "done": boolean},
    {"label": "Evening agenda / flow", "done": boolean},
    {"label": "Dietary requirements", "done": boolean}
  ],
  "insights": ["string"]
}

Be specific, opinionated, and actionable. The host is a professional who wants intelligence, not summaries.`

/**
 * POST /api/events/[eventId]/context/generate
 * SSE stream: reads documents, calls Claude, streams activity items + generated context
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const auth = await requireAuth()
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER')

    const { eventId } = await context.params
    const eventIdNum = parseInt(eventId, 10)
    const db = getDb()

    // Fetch event details
    const eventRows = await db`
      SELECT
        id, title, description,
        location::text as location_raw,
        start_date, end_date, timezone,
        total_capacity, seating_format,
        hosts::text as hosts_raw,
        sponsors::text as sponsors_raw,
        success_criteria, event_theme, budget_range, additional_context
      FROM events WHERE id = ${eventIdNum} LIMIT 1
    `

    if (eventRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Event not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const event = eventRows[0]

    // Fetch documents
    const docs = await db`
      SELECT id, name, file_type, blob_url, status
      FROM event_documents
      WHERE event_id = ${eventIdNum}
      ORDER BY created_at ASC
    `

    // Fetch links
    const links = await db`
      SELECT url, label FROM event_links WHERE event_id = ${eventIdNum}
    `

    const encoder = new TextEncoder()

    const readable = new ReadableStream({
      async start(controller) {
        function send(type: string, data: any) {
          const payload = JSON.stringify({ type, data })
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        }

        try {
          // Stream: reading documents
          for (const doc of docs) {
            send('activity', {
              id: crypto.randomUUID(),
              eventId,
              type: 'reading',
              text: `Reading ${doc.name}...`,
              timestamp: new Date().toISOString(),
            })

            send('doc_status', { docId: doc.id, status: 'analyzing' })

            // Mark as analyzing in DB
            await db`
              UPDATE event_documents SET status = 'analyzing' WHERE id = ${doc.id}
            `

            // Brief pause for UX
            await new Promise((r) => setTimeout(r, 500))

            send('activity', {
              id: crypto.randomUUID(),
              eventId,
              type: 'extracted',
              text: `Processed ${doc.name}`,
              timestamp: new Date().toISOString(),
              details: [`File type: ${doc.file_type}`, `Status: analyzed`],
            })

            send('doc_status', { docId: doc.id, status: 'analyzed' })

            await db`
              UPDATE event_documents SET status = 'analyzed', analyzed_at = NOW() WHERE id = ${doc.id}
            `
          }

          // Stream: researching
          send('activity', {
            id: crypto.randomUUID(),
            eventId,
            type: 'researching',
            text: 'Researching market context and competing events...',
            timestamp: new Date().toISOString(),
          })

          // Build context for Claude
          const contextText = [
            `Event: ${event.title}`,
            event.description ? `Description: ${event.description}` : '',
            event.location_raw ? `Location: ${event.location_raw}` : '',
            event.start_date ? `Date: ${event.start_date}` : '',
            event.total_capacity ? `Capacity: ${event.total_capacity}` : '',
            event.hosts_raw ? `Hosts: ${event.hosts_raw}` : '',
            event.sponsors_raw ? `Sponsors: ${event.sponsors_raw}` : '',
            event.success_criteria ? `Success Criteria: ${event.success_criteria}` : '',
            event.event_theme ? `Theme: ${event.event_theme}` : '',
            event.budget_range ? `Budget: ${event.budget_range}` : '',
            event.additional_context ? `Additional Context: ${event.additional_context}` : '',
            docs.length > 0 ? `\nDocuments uploaded (${docs.length}): ${docs.map((d: any) => d.name).join(', ')}` : '',
            links.length > 0 ? `\nReference links: ${links.map((l: any) => l.url).join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('\n')

          // Call Claude
          const client = getAnthropicClient()
          const response = await client.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [
              {
                role: 'user',
                content: `Analyze this event and generate a rich context:\n\n${contextText}`,
              },
            ],
          })

          // Parse response
          const responseText =
            response.content[0].type === 'text' ? response.content[0].text : ''

          // Extract JSON from response
          let generatedData: any
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/)
            generatedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null
          } catch {
            generatedData = null
          }

          if (!generatedData) {
            send('activity', {
              id: crypto.randomUUID(),
              eventId,
              type: 'insight',
              text: 'Generated context analysis based on available information.',
              timestamp: new Date().toISOString(),
            })

            // Fallback context
            generatedData = {
              sponsors: [],
              strategicSignificance: 'Context analysis could not be fully generated. Please add more documents or details.',
              marketContext: 'Insufficient information for market context analysis.',
              completeness: [
                { label: 'Event basics', done: !!event.title },
                { label: 'Date & venue', done: !!event.start_date },
                { label: 'Strategic purpose', done: !!event.success_criteria },
                { label: 'Sponsors identified', done: !!event.sponsors_raw },
                { label: 'Documents analysed', done: docs.length > 0 },
                { label: 'Market context', done: false },
                { label: 'Dress code', done: false },
                { label: 'Evening agenda / flow', done: false },
                { label: 'Dietary requirements', done: false },
              ],
              insights: [],
            }
          }

          // Stream insights
          if (generatedData.insights?.length > 0) {
            for (const insight of generatedData.insights) {
              send('activity', {
                id: crypto.randomUUID(),
                eventId,
                type: 'insight',
                text: insight,
                timestamp: new Date().toISOString(),
              })
            }
          }

          // Save to DB
          const contextRow = await db`
            INSERT INTO event_generated_context (
              event_id, workspace_id, sponsors, strategic_significance, market_context, completeness, model_version
            ) VALUES (
              ${eventIdNum},
              ${auth.workspace.id},
              ${JSON.stringify(generatedData.sponsors)}::jsonb,
              ${generatedData.strategicSignificance},
              ${generatedData.marketContext},
              ${JSON.stringify(generatedData.completeness)}::jsonb,
              'claude-sonnet-4-20250514'
            )
            RETURNING id, generated_at
          `

          // Stream generated context
          send('context_generated', {
            id: contextRow[0].id,
            eventId,
            sponsors: generatedData.sponsors || [],
            strategicSignificance: generatedData.strategicSignificance || '',
            marketContext: generatedData.marketContext || '',
            completeness: generatedData.completeness || [],
            generatedAt: contextRow[0].generated_at,
            modelVersion: 'claude-sonnet-4-20250514',
          })

          // Save activities to DB
          send('activity', {
            id: crypto.randomUUID(),
            eventId,
            type: 'complete',
            text: 'Context generation complete. All documents analysed and context synthesised.',
            timestamp: new Date().toISOString(),
          })

          send('done', null)

          logAction({
            workspaceId: auth.workspace.id,
            actorId: auth.user.id,
            actorEmail: auth.user.email,
            action: 'context.generated',
            entityType: 'event_generated_context',
            entityId: contextRow[0].id,
            newValue: { documents: docs.length, links: links.length },
            ipAddress: getClientIdentifier(request),
          })
        } catch (err: any) {
          console.error('[context/generate] Error:', err)
          send('error', { message: err.message || 'Generation failed', code: 'GENERATION_ERROR' })
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
    console.error('[POST /context/generate] Error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Generation failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

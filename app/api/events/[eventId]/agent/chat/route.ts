import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildAgentSystemPrompt } from '@/lib/agent/context-builder';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/events/[eventId]/agent/chat — Streaming chat with the Moots Agent.
 * Uses SSE (Server-Sent Events) to stream Claude's response in real time.
 */
export async function POST(request: NextRequest, context: any) {
  try {
    const auth = await requireAuth();
    requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

    const { eventId } = await context.params;
    const eventIdNum = parseInt(eventId, 10);
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build the system prompt with full event context
    const systemPrompt = await buildAgentSystemPrompt(eventIdNum, auth.workspace.id);

    // Build conversation messages
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...history.slice(-10),
      { role: 'user' as const, content: message },
    ];

    // Get Claude client and stream the response
    const client = getAnthropicClient();

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    // Create SSE response stream
    const encoder = new TextEncoder();
    let fullResponse = '';

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if ('text' in delta) {
                fullResponse += delta.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: delta.text })}\n\n`)
                );
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // Save conversation to DB (fire and forget)
          saveConversation(
            eventIdNum,
            auth.workspace.id,
            auth.user.id,
            message,
            fullResponse
          ).catch(() => {});

          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    const status = error?.statusCode || 500;
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function saveConversation(
  eventId: number,
  workspaceId: string,
  userId: string,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO agent_conversations (event_id, workspace_id, user_id, role, content)
    VALUES
      (${eventId}, ${workspaceId}, ${userId}, 'user', ${userMessage}),
      (${eventId}, ${workspaceId}, ${userId}, 'assistant', ${assistantMessage})
  `;
}

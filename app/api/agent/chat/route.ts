import { NextRequest } from 'next/server';
import { tryAuthOrWorkspaceFallback } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/anthropic';
import { buildGlobalSystemPrompt } from '@/lib/agent/global-context-builder';
import { getDb } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/agent/chat — Global Moots Intelligence streaming chat.
 * Works across all pages (events list, people, contact profiles).
 * Uses SSE (Server-Sent Events) to stream Claude's response in real time.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await tryAuthOrWorkspaceFallback();

    const body = await request.json();
    const { message, history = [], context: chatContext } = body as {
      message: string;
      history?: { role: string; content: string }[];
      context?: { page?: string; contactId?: string };
    };

    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const page = (chatContext?.page || 'events-list') as 'events-list' | 'people' | 'contact-profile';
    const contactId = chatContext?.contactId;

    // Build the system prompt with global workspace context
    const systemPrompt = await buildGlobalSystemPrompt({
      workspaceId: auth.workspaceId,
      page,
      contactId,
    });

    // Build conversation messages
    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
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

          // Save conversation to DB (fire and forget) — event_id is null for global chat
          saveGlobalConversation(
            auth.workspaceId,
            auth.userId || null,
            message,
            fullResponse
          ).catch(() => {});

          controller.close();
        } catch {
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
  } catch (error: unknown) {
    const status = (error as { statusCode?: number })?.statusCode || 500;
    const msg = (error as { message?: string })?.message || 'Internal server error';
    return new Response(
      JSON.stringify({ error: msg }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function saveGlobalConversation(
  workspaceId: string,
  userId: string | null,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO agent_conversations (event_id, workspace_id, user_id, role, content)
    VALUES
      (${null}, ${workspaceId}, ${userId}, 'user', ${userMessage}),
      (${null}, ${workspaceId}, ${userId}, 'assistant', ${assistantMessage})
  `;
}

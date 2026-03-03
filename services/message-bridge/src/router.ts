import { lookupTeamMember, updateLastMessage } from './auth.js'
import { getConversationHistory, saveMessage } from './conversation.js'
import { logMessagingAction } from './logger.js'
import { config } from './config.js'
import type { NormalizedMessage, BridgeResponse } from './types.js'

/**
 * Main message routing function.
 * Receives a normalized message from any adapter, authenticates the sender,
 * forwards to the Moots AI engine, and returns the response.
 */
export async function routeMessage(message: NormalizedMessage): Promise<BridgeResponse> {
  // 1. Authenticate — look up verified channel pairing
  const member = await lookupTeamMember(message.channelType, message.channelUserId)
  if (!member) {
    return {
      text: "I don't recognize this account. Use /pair to link your messaging account to your Moots workspace.",
    }
  }

  // 2. Update last message timestamp
  await updateLastMessage(message.channelType, message.channelUserId)

  // 3. Get conversation history for context
  const history = await getConversationHistory(
    member.user_id,
    message.channelType,
    message.channelUserId
  )

  // 4. Call Moots AI engine (global chat endpoint)
  try {
    const response = await callMootsAI({
      message: message.text,
      history,
      context: { page: 'messaging', channelType: message.channelType },
      workspaceId: member.workspace_id,
      userId: member.user_id,
    })

    // 5. Save conversation history
    await saveMessage(
      member.workspace_id,
      member.user_id,
      message.channelType,
      message.channelUserId,
      message.text,
      response.text
    )

    // 6. Log the interaction to audit trail
    await logMessagingAction({
      workspaceId: member.workspace_id,
      actorId: member.user_id,
      actorEmail: member.display_name || 'unknown',
      action: 'messaging.query',
      entityType: 'messaging_conversation',
      metadata: {
        channel: message.channelType,
        channel_user_id: message.channelUserId,
        query_preview: message.text.slice(0, 100),
      },
    })

    return response
  } catch (err) {
    console.error('[router] AI call failed:', err)
    return {
      text: "Sorry, I'm having trouble processing your request. Please try again in a moment.",
    }
  }
}

/**
 * Call the Moots AI global chat endpoint via HTTP.
 * The chat endpoint returns SSE, so we collect all data chunks into a single response.
 */
async function callMootsAI(params: {
  message: string
  history: Array<{ role: string; content: string }>
  context: Record<string, string>
  workspaceId: string
  userId: string
}): Promise<BridgeResponse> {
  const url = `${config.api.baseUrl}/api/agent/chat`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Bridge-API-Key': config.api.apiKey,
      'X-Bridge-Workspace-Id': params.workspaceId,
      'X-Bridge-User-Id': params.userId,
    },
    body: JSON.stringify({
      message: params.message,
      history: params.history,
      context: params.context,
    }),
  })

  if (!res.ok) {
    throw new Error(`Moots API returned ${res.status}: ${await res.text()}`)
  }

  // The chat endpoint returns SSE, so we collect all the data chunks
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  let fullText = ''
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })

    // Parse SSE format: "data: {text}\n\n"
    const lines = chunk.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.text) fullText += parsed.text
          if (parsed.content) fullText += parsed.content
        } catch {
          // Plain text data — append as-is
          fullText += data
        }
      }
    }
  }

  // Strip context source markers for messaging (they're visual-only in dashboard)
  const contextSourceMatch = fullText.match(/\[CONTEXT_SOURCE: ([^\]]+)\]/)
  const contextSource = contextSourceMatch ? contextSourceMatch[1] : undefined
  const cleanText = fullText.replace(/\[CONTEXT_SOURCE: [^\]]+\]/g, '').trim()

  return { text: cleanText, contextSource }
}

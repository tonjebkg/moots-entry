import { neon } from '@neondatabase/serverless'
import { config } from './config.js'

const sql = neon(config.databaseUrl)

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

/**
 * Retrieve recent conversation history for a user+channel pair.
 * Returns the last 20 messages for context window.
 */
export async function getConversationHistory(
  userId: string,
  channelType: string,
  channelUserId: string
): Promise<Message[]> {
  const rows = await sql`
    SELECT messages FROM messaging_conversations
    WHERE user_id = ${userId}::uuid
      AND channel_type = ${channelType}
      AND channel_user_id = ${channelUserId}
    ORDER BY last_message_at DESC
    LIMIT 1
  `
  if (!rows[0]) return []
  const messages = rows[0].messages as Message[]
  // Return last 20 messages for context
  return messages.slice(-20)
}

/**
 * Save a user message + assistant response to conversation history.
 * Uses an upsert pattern: tries to append to existing conversation,
 * falls back to creating a new one.
 */
export async function saveMessage(
  workspaceId: string,
  userId: string,
  channelType: string,
  channelUserId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  const newMessages: Message[] = [
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: assistantResponse, timestamp: new Date().toISOString() },
  ]

  // Try to update existing conversation first
  const updated = await sql`
    UPDATE messaging_conversations
    SET messages = messages || ${JSON.stringify(newMessages)}::jsonb,
        last_message_at = NOW()
    WHERE user_id = ${userId}::uuid
      AND channel_type = ${channelType}
      AND channel_user_id = ${channelUserId}
    RETURNING id
  `

  // If no existing conversation, create a new one
  if (!updated.length) {
    await sql`
      INSERT INTO messaging_conversations (
        workspace_id, user_id, channel_type,
        channel_user_id, messages, last_message_at
      )
      VALUES (
        ${workspaceId}::uuid,
        ${userId}::uuid,
        ${channelType},
        ${channelUserId},
        ${JSON.stringify(newMessages)}::jsonb,
        NOW()
      )
    `
  }
}

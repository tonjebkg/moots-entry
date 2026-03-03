import { neon } from '@neondatabase/serverless'
import { config } from './config.js'

const sql = neon(config.databaseUrl)

/**
 * Log a messaging action to the audit_logs table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logMessagingAction(params: {
  workspaceId: string
  actorId: string
  actorEmail: string
  action: string
  entityType: string
  entityId?: string
  newValue?: Record<string, unknown>
  metadata: Record<string, unknown>
}): Promise<void> {
  try {
    await sql`
      INSERT INTO audit_logs (
        workspace_id, actor_id, actor_email, action,
        entity_type, entity_id, new_value, metadata
      )
      VALUES (
        ${params.workspaceId}::uuid,
        ${params.actorId}::uuid,
        ${params.actorEmail},
        ${params.action},
        ${params.entityType},
        ${params.entityId || null},
        ${params.newValue ? JSON.stringify(params.newValue) : null}::jsonb,
        ${JSON.stringify(params.metadata)}::jsonb
      )
    `
  } catch (err) {
    console.error('[message-bridge] Failed to log action:', err)
  }
}

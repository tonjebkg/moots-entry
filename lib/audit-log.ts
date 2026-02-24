import { getDb } from './db';
import { logger } from './logger';

export interface LogActionParams {
  workspaceId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Log an action to the audit_logs table.
 * Fire-and-forget — does not block the calling function on failure.
 */
export function logAction(params: LogActionParams): void {
  const db = getDb();

  const {
    workspaceId = null,
    actorId = null,
    actorEmail = null,
    action,
    entityType,
    entityId = null,
    previousValue = null,
    newValue = null,
    metadata = null,
    ipAddress = null,
  } = params;

  const prevJson = previousValue ? JSON.stringify(previousValue) : null;
  const newJson = newValue ? JSON.stringify(newValue) : null;
  const metaJson = metadata ? JSON.stringify(metadata) : null;

  db`
    INSERT INTO audit_logs (
      workspace_id, actor_id, actor_email, action, entity_type, entity_id,
      previous_value, new_value, metadata, ip_address
    ) VALUES (
      ${workspaceId}::uuid,
      ${actorId}::uuid,
      ${actorEmail},
      ${action},
      ${entityType},
      ${entityId},
      ${prevJson}::jsonb,
      ${newJson}::jsonb,
      ${metaJson}::jsonb,
      ${ipAddress}::inet
    )
  `.catch((error: unknown) => {
    logger.error('Failed to write audit log', error as Error, {
      action,
      entityType,
      entityId,
    });
  });
}

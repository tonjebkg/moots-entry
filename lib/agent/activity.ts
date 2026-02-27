import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export type AgentActivityType =
  | 'scoring'
  | 'enrichment'
  | 'briefing'
  | 'seating'
  | 'introduction'
  | 'follow_up'
  | 'observation';

interface LogAgentActivityParams {
  eventId?: number | null;
  workspaceId: string;
  type: AgentActivityType;
  headline: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an agent activity with a human-readable narrative.
 * Called after every AI operation completes.
 * These entries power the Agent Activity Feed and "While You Were Away" banner.
 */
export async function logAgentActivity(params: LogAgentActivityParams): Promise<void> {
  try {
    const db = getDb();
    const metadataJson = JSON.stringify(params.metadata || {});

    await db`
      INSERT INTO agent_activity_log (
        event_id, workspace_id, activity_type, headline, detail, metadata
      ) VALUES (
        ${params.eventId ?? null},
        ${params.workspaceId},
        ${params.type},
        ${params.headline},
        ${params.detail ?? null},
        ${metadataJson}::jsonb
      )
    `;
  } catch (error) {
    // Never let activity logging break the main operation
    logger.error('Failed to log agent activity', error as Error, {
      type: params.type,
      headline: params.headline,
    });
  }
}

/**
 * Fetch recent agent activity for an event.
 */
export async function getAgentActivity(
  eventId: number,
  workspaceId: string,
  limit: number = 20
): Promise<AgentActivityEntry[]> {
  const db = getDb();
  const rows = await db`
    SELECT id, event_id, activity_type, headline, detail, metadata, created_at
    FROM agent_activity_log
    WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as unknown as AgentActivityEntry[];
}

/**
 * Fetch agent activity since a given timestamp (for "While You Were Away").
 */
export async function getAgentActivitySince(
  eventId: number,
  workspaceId: string,
  since: Date
): Promise<AgentActivityEntry[]> {
  const db = getDb();
  const rows = await db`
    SELECT id, event_id, activity_type, headline, detail, metadata, created_at
    FROM agent_activity_log
    WHERE event_id = ${eventId}
      AND workspace_id = ${workspaceId}
      AND created_at > ${since.toISOString()}
    ORDER BY created_at DESC
  `;
  return rows as unknown as AgentActivityEntry[];
}

export interface AgentActivityEntry {
  id: string;
  event_id: number;
  activity_type: AgentActivityType;
  headline: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

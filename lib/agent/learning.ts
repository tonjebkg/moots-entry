import { getDb } from '@/lib/db';
import { getAnthropicClient } from '@/lib/anthropic';
import { logger } from '@/lib/logger';
import type { AgentPreference } from '@/types/agent-learning';

interface OverrideData {
  overrideType: string;
  originalValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  eventContext: string; // formatted context string
}

/**
 * Extract a workspace-level preference from a user override.
 * Fire-and-forget — never blocks the calling function.
 */
export async function extractPreference(
  workspaceId: string,
  data: OverrideData
): Promise<void> {
  try {
    const client = getAnthropicClient();

    const prompt = `You are analyzing a host's manual override of an AI suggestion to extract workspace-level preferences.

## Override Details
Type: ${data.overrideType}
Original: ${JSON.stringify(data.originalValue)}
New: ${JSON.stringify(data.newValue)}

## Event Context
${data.eventContext}

Based on this override, what workspace-level preference does this suggest? Think about patterns like:
- Grouping preferences (executives together, industry clustering)
- Separation preferences (competitors apart, balancing seniority)
- Priority preferences (sponsor guests first, high-scorers at prominent tables)

Return a JSON object (no markdown):
{ "preference_key": "snake_case_key", "preference_text": "One-sentence description of the preference", "category": "seating" | "scoring" | "follow_up" | "general" }

If no meaningful preference can be extracted, return: { "preference_key": null }`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const text =
      response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = JSON.parse(text);

    if (!parsed.preference_key) return;

    const db = getDb();
    await db`
      INSERT INTO agent_preferences (
        workspace_id, category, preference_key, preference_text, confidence, observation_count, last_observed
      ) VALUES (
        ${workspaceId}, ${parsed.category}, ${parsed.preference_key},
        ${parsed.preference_text}, 0.5, 1, NOW()
      )
      ON CONFLICT (workspace_id, preference_key) DO UPDATE SET
        confidence = LEAST(1.0, agent_preferences.confidence + 0.1),
        observation_count = agent_preferences.observation_count + 1,
        last_observed = NOW(),
        preference_text = EXCLUDED.preference_text
    `;

    logger.info('Extracted preference from override', {
      workspaceId,
      key: parsed.preference_key,
    });
  } catch (error) {
    // Fire-and-forget — never block the user action
    logger.error('Failed to extract preference', error as Error, {
      workspaceId,
      overrideType: data.overrideType,
    });
  }
}

/**
 * Fetch learned preferences for a workspace.
 * Ordered by confidence (desc), limited to top 5.
 */
export async function getWorkspacePreferences(
  workspaceId: string,
  category?: string
): Promise<AgentPreference[]> {
  const db = getDb();

  const rows = category
    ? await db`
        SELECT id, workspace_id, category, preference_key, preference_text,
               confidence, observation_count, last_observed, created_at
        FROM agent_preferences
        WHERE workspace_id = ${workspaceId} AND category = ${category}
        ORDER BY confidence DESC, observation_count DESC
        LIMIT 5
      `
    : await db`
        SELECT id, workspace_id, category, preference_key, preference_text,
               confidence, observation_count, last_observed, created_at
        FROM agent_preferences
        WHERE workspace_id = ${workspaceId}
        ORDER BY confidence DESC, observation_count DESC
        LIMIT 5
      `;

  return rows as unknown as AgentPreference[];
}

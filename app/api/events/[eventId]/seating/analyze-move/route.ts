import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/with-error-handling';
import { requireAuth, requireRole } from '@/lib/auth';
import { validateRequest } from '@/lib/validate-request';
import { analyzeMoveSchema } from '@/lib/schemas/seating-move';
import { getAnthropicClient } from '@/lib/anthropic';
import { getFullEventContext, formatContextForPrompt } from '@/lib/agent/event-context';
import { logAgentActivity } from '@/lib/agent/activity';
import { extractPreference } from '@/lib/agent/learning';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/events/[eventId]/seating/analyze-move
 * Analyze a seating move and return agent commentary.
 */
export const POST = withErrorHandling(async (request: NextRequest, context: any) => {
  const auth = await requireAuth();
  requireRole(auth, 'OWNER', 'ADMIN', 'TEAM_MEMBER');

  const validation = await validateRequest(request, analyzeMoveSchema);
  if (!validation.success) return validation.error;

  const { eventId } = await context.params;
  const eventIdNum = parseInt(eventId, 10);
  const { contact_id, from_table, to_table } = validation.data;
  const db = getDb();

  // Fetch event context with learned preferences
  const eventContext = await getFullEventContext(eventIdNum, auth.workspace.id, {
    includePreferences: true,
  });
  const contextBlock = formatContextForPrompt(eventContext);

  // Fetch the moved guest's profile
  const [guestRows, toTableRows, fromTableRows] = await Promise.all([
    db`
      SELECT pc.full_name, pc.company, pc.title, gs.relevance_score
      FROM people_contacts pc
      LEFT JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${eventIdNum}
      WHERE pc.id = ${contact_id} AND pc.workspace_id = ${auth.workspace.id}
      LIMIT 1
    `,
    // Guests currently at the destination table
    db`
      SELECT pc.full_name, pc.company, pc.title, gs.relevance_score,
             ci.table_assignment
      FROM campaign_invitations ci
      JOIN people_contacts pc ON pc.id = ci.contact_id
      LEFT JOIN guest_scores gs ON gs.contact_id = ci.contact_id AND gs.event_id = ci.event_id
      WHERE ci.event_id = ${eventIdNum} AND ci.table_assignment = ${to_table}
        AND ci.contact_id != ${contact_id}
    `,
    // Guests remaining at the source table (after removal)
    from_table > 0
      ? db`
          SELECT pc.full_name, pc.company, pc.title, gs.relevance_score
          FROM campaign_invitations ci
          JOIN people_contacts pc ON pc.id = ci.contact_id
          LEFT JOIN guest_scores gs ON gs.contact_id = ci.contact_id AND gs.event_id = ci.event_id
          WHERE ci.event_id = ${eventIdNum} AND ci.table_assignment = ${from_table}
            AND ci.contact_id != ${contact_id}
        `
      : [],
  ]);

  const guest = guestRows[0];
  if (!guest) {
    return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
  }

  const guestDesc = `${guest.full_name} (${guest.company || 'Unknown'}, ${guest.title || 'Unknown'}${guest.relevance_score ? `, score: ${guest.relevance_score}` : ''})`;

  const formatTableList = (rows: any[]) =>
    rows.length === 0
      ? 'Empty'
      : rows
          .map(
            (r: any) =>
              `- ${r.full_name} (${r.company || '?'}, ${r.title || '?'}${r.relevance_score ? `, score: ${r.relevance_score}` : ''})`
          )
          .join('\n');

  const prompt = `${contextBlock}

## Move Analysis Request
The host just moved ${guestDesc} from ${from_table === 0 ? 'the unassigned pool' : `Table ${from_table}`} to Table ${to_table}.

## Current Table ${to_table} Composition (before this guest arrives)
${formatTableList(toTableRows as any[])}

${from_table > 0 ? `## Table ${from_table} Composition (after removal)\n${formatTableList(fromTableRows as any[])}` : ''}

Analyze this move briefly (2-3 sentences). Consider:
- Does this improve or hurt table dynamics?
- Any sponsor goal implications?
- Any competitor conflicts created/resolved?
- Any introduction pairings affected?

Then optionally suggest 1 follow-up action.

Return JSON only (no markdown): { "analysis": "...", "suggestion": "..." | null }`;

  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let parsed: { analysis: string; suggestion: string | null };
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { analysis: text.slice(0, 500), suggestion: null };
  }

  // Log override to override_log
  const overrideRows = await db`
    INSERT INTO override_log (
      event_id, workspace_id, user_id, override_type, entity_type, entity_id,
      original_value, new_value
    ) VALUES (
      ${eventIdNum}, ${auth.workspace.id}, ${auth.user.id},
      'seating_move', 'contact', ${contact_id},
      ${JSON.stringify({ table: from_table })}::jsonb,
      ${JSON.stringify({ table: to_table })}::jsonb
    )
    RETURNING id
  `;
  const overrideId = overrideRows[0]?.id || '';

  // Log agent activity
  await logAgentActivity({
    eventId: eventIdNum,
    workspaceId: auth.workspace.id,
    type: 'observation',
    headline: `Analyzed move: ${guest.full_name} to Table ${to_table}`,
    detail: parsed.analysis,
    metadata: { contact_id, from_table, to_table, override_id: overrideId },
  });

  // Fire-and-forget: extract preference from this override
  extractPreference(auth.workspace.id, {
    overrideType: 'seating_move',
    originalValue: {
      table: from_table,
      guest: guestDesc,
      from_table_composition: (fromTableRows as any[]).map((r: any) => `${r.full_name} (${r.company})`),
    },
    newValue: {
      table: to_table,
      guest: guestDesc,
      to_table_composition: (toTableRows as any[]).map((r: any) => `${r.full_name} (${r.company})`),
    },
    eventContext: contextBlock,
  }).catch((err) => {
    logger.error('Fire-and-forget preference extraction failed', err as Error);
  });

  return NextResponse.json({
    analysis: parsed.analysis,
    suggestion: parsed.suggestion || null,
    override_id: overrideId,
  });
});

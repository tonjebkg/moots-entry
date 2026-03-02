import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { logAgentActivity } from '@/lib/agent/activity';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * GET /api/cron/agent-suggestions
 * Proactive suggestions engine. Runs periodically to identify actionable insights.
 * Protected by CRON_SECRET (same pattern as process-jobs).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDb();
    let totalSuggestions = 0;

    // Fetch all active events
    const events = await db`
      SELECT e.id as event_id, e.status, e.workspace_id
      FROM events e
      JOIN workspaces w ON w.id = e.workspace_id
      WHERE e.status IN ('PUBLISHED', 'COMPLETED')
    `;

    for (const event of events) {
      const { event_id, workspace_id, status } = event;

      // Check for recent duplicates (skip if same type logged in last 24h)
      const recentSuggestions = await db`
        SELECT metadata->>'suggestion_type' as suggestion_type
        FROM agent_activity_log
        WHERE event_id = ${event_id}
          AND workspace_id = ${workspace_id}
          AND activity_type = 'observation'
          AND metadata->>'suggestion_type' IS NOT NULL
          AND created_at > NOW() - INTERVAL '24 hours'
      `;
      const recentTypes = new Set(recentSuggestions.map((r: any) => r.suggestion_type));

      // Run all 5 insight checks in parallel
      const [highScorers, guestDetails, staleFollowUps, unscoredContacts, invitationStats] =
        await Promise.all([
          // Insight 1: High-scoring uninvited guests
          db`
            SELECT COUNT(*)::int as count
            FROM people_contacts pc
            JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${event_id}
            LEFT JOIN campaign_invitations ci ON ci.contact_id = pc.id AND ci.event_id = ${event_id}
            WHERE gs.relevance_score >= 75
              AND ci.id IS NULL
              AND pc.workspace_id = ${workspace_id}
          `,

          // Insight 2: Fetch accepted guests with table assignments for competitor check
          db`
            SELECT pc.full_name, pc.company, ci.table_assignment
            FROM campaign_invitations ci
            JOIN people_contacts pc ON pc.id = ci.contact_id
            WHERE ci.event_id = ${event_id}
              AND ci.status = 'ACCEPTED'
              AND ci.table_assignment IS NOT NULL
              AND pc.company IS NOT NULL
          `,

          // Insight 3: Stale follow-ups (completed events, no follow-up)
          status === 'COMPLETED'
            ? db`
                SELECT COUNT(*)::int as count
                FROM guest_scores gs
                LEFT JOIN follow_up_sequences fs ON fs.contact_id = gs.contact_id AND fs.event_id = gs.event_id
                WHERE gs.event_id = ${event_id}
                  AND fs.id IS NULL
                  AND gs.relevance_score >= 50
              `
            : [{ count: 0 }],

          // Insight 4: Unscored contacts (only if objectives exist)
          db`
            SELECT
              COUNT(DISTINCT pc.id)::int as unscored_count,
              (SELECT COUNT(*) FROM event_objectives WHERE event_id = ${event_id})::int as objective_count
            FROM people_contacts pc
            LEFT JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${event_id}
            WHERE pc.workspace_id = ${workspace_id}
              AND gs.id IS NULL
          `,

          // Insight 5: RSVP response rate
          db`
            SELECT
              COUNT(*)::int as total,
              COUNT(*) FILTER (WHERE status = 'PENDING')::int as pending,
              COUNT(*) FILTER (WHERE status = 'ACCEPTED')::int as accepted
            FROM campaign_invitations
            WHERE event_id = ${event_id}
          `,
        ]);

      // Process Insight 1: High-scoring uninvited
      const highScorerCount = highScorers[0]?.count || 0;
      if (highScorerCount > 0 && !recentTypes.has('uninvited_high_scorers')) {
        await logAgentActivity({
          eventId: event_id,
          workspaceId: workspace_id,
          type: 'observation',
          headline: `${highScorerCount} high-scoring contact${highScorerCount > 1 ? 's' : ''} haven't been invited yet`,
          detail: `I found ${highScorerCount} contacts scoring 75+ who haven't received invitations. These are strong matches for your targeting criteria.`,
          metadata: { suggestion_type: 'uninvited_high_scorers', count: highScorerCount },
        });
        totalSuggestions++;
      }

      // Process Insight 2: Competitor conflicts
      if (!recentTypes.has('competitor_conflict')) {
        const byTable = new Map<number, { full_name: string; company: string }[]>();
        for (const g of guestDetails as any[]) {
          const list = byTable.get(g.table_assignment) || [];
          list.push({ full_name: g.full_name, company: g.company });
          byTable.set(g.table_assignment, list);
        }

        for (const [tableNum, guests] of byTable) {
          // Simple heuristic: find guests from the same company at the same table
          const companies = guests.map(g => g.company?.toLowerCase().trim()).filter(Boolean);
          const seen = new Set<string>();
          for (const c of companies) {
            if (seen.has(c) && c) {
              const dupes = guests.filter(g => g.company?.toLowerCase().trim() === c);
              await logAgentActivity({
                eventId: event_id,
                workspaceId: workspace_id,
                type: 'observation',
                headline: `Multiple guests from ${dupes[0]?.company} at Table ${tableNum}`,
                detail: `${dupes.map(d => d.full_name).join(' and ')} are both at Table ${tableNum}. Consider if this is intentional or if one should be moved.`,
                metadata: {
                  suggestion_type: 'competitor_conflict',
                  table: tableNum,
                  guests: dupes.map(d => d.full_name),
                },
              });
              totalSuggestions++;
              break; // One conflict per table is enough
            }
            seen.add(c);
          }
        }
      }

      // Process Insight 3: Stale follow-ups
      const staleCount = staleFollowUps[0]?.count || 0;
      if (staleCount > 0 && !recentTypes.has('stale_follow_ups')) {
        await logAgentActivity({
          eventId: event_id,
          workspaceId: workspace_id,
          type: 'observation',
          headline: `${staleCount} scored attendee${staleCount > 1 ? 's' : ''} haven't received follow-ups`,
          detail: `The event is complete but ${staleCount} attendees with relevance scores of 50+ still need follow-up sequences.`,
          metadata: { suggestion_type: 'stale_follow_ups', count: staleCount },
        });
        totalSuggestions++;
      }

      // Process Insight 4: Unscored contacts
      const unscoredCount = unscoredContacts[0]?.unscored_count || 0;
      const objectiveCount = unscoredContacts[0]?.objective_count || 0;
      if (unscoredCount > 0 && objectiveCount > 0 && !recentTypes.has('unscored_contacts')) {
        await logAgentActivity({
          eventId: event_id,
          workspaceId: workspace_id,
          type: 'observation',
          headline: `${unscoredCount} contacts haven't been scored yet`,
          detail: `You have ${objectiveCount} objective${objectiveCount > 1 ? 's' : ''} set but ${unscoredCount} contacts in your pool haven't been scored against them.`,
          metadata: { suggestion_type: 'unscored_contacts', count: unscoredCount },
        });
        totalSuggestions++;
      }

      // Process Insight 5: Pending invitations
      const total = invitationStats[0]?.total || 0;
      const pending = invitationStats[0]?.pending || 0;
      if (total > 0 && pending > 3 && !recentTypes.has('pending_invitations')) {
        await logAgentActivity({
          eventId: event_id,
          workspaceId: workspace_id,
          type: 'observation',
          headline: `${pending} invitation${pending > 1 ? 's' : ''} still pending`,
          detail: `${pending} of ${total} invitations are still pending a response. Consider sending a reminder to boost your confirmation rate.`,
          metadata: { suggestion_type: 'pending_invitations', pending, total },
        });
        totalSuggestions++;
      }
    }

    logger.info('Cron: agent-suggestions completed', {
      eventsProcessed: events.length,
      suggestionsCreated: totalSuggestions,
    });

    return NextResponse.json({
      ok: true,
      events_processed: events.length,
      suggestions_created: totalSuggestions,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cron: agent-suggestions failed', error as Error);
    return NextResponse.json(
      { error: 'Suggestion processing failed' },
      { status: 500 }
    );
  }
}

import { NextRequest } from 'next/server';
import { tryAuthOrWorkspaceFallback, tryAuthOrEventFallback } from '@/lib/auth';
import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

// ─── In-memory cache with 5-min TTL ─────────────────────────────────────────
const promptCache = new Map<string, { prompts: string[]; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Static fallback prompts per page ────────────────────────────────────────
const STATIC_FALLBACKS: Record<string, string[]> = {
  'events-list': [
    'Which event needs the most attention?',
    'Compare acceptance rates across my events',
    'Any guest overlaps between upcoming events?',
  ],
  people: [
    'Who are my most engaged contacts?',
    'Find contacts not invited in 6+ months',
    'Which contacts match multiple criteria?',
  ],
  'event:overview': [
    "What needs my attention before the event?",
    "What's the strategic profile of confirmed guests?",
    'Any risks I should know about?',
  ],
  'event:guest-intelligence': [
    'Who are my highest-priority guests?',
    'Which guests need attention?',
    'Summarize the guest mix',
  ],
  'event:day-of': [
    "Who hasn't arrived yet?",
    "How's check-in going?",
    'Any walk-ins to note?',
  ],
  'event:default': [
    'Who are my top 5 guests?',
    'Summarize the event status',
    "Who hasn't responded yet?",
  ],
};

function getFallback(page: string, tab?: string): string[] {
  if (page === 'events-list' || page === 'people') {
    return STATIC_FALLBACKS[page] || STATIC_FALLBACKS['events-list'];
  }
  // Event page: look up by tab
  const key = `event:${tab || 'default'}`;
  return STATIC_FALLBACKS[key] || STATIC_FALLBACKS['event:default'];
}

/**
 * GET /api/agent/prompts — Dynamic contextual suggested prompts.
 * Returns 3 suggested questions tailored to the current page context.
 * Uses Claude Haiku for fast generation with in-memory caching.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || 'events-list';
    const eventId = searchParams.get('eventId') || undefined;
    const tab = searchParams.get('tab') || undefined;

    // Auth
    let workspaceId: string;
    if (eventId) {
      const auth = await tryAuthOrEventFallback(parseInt(eventId, 10));
      workspaceId = auth.workspaceId;
    } else {
      const auth = await tryAuthOrWorkspaceFallback();
      workspaceId = auth.workspaceId;
    }

    // Check cache
    const cacheKey = `${page}:${eventId || ''}:${tab || ''}`;
    const cached = promptCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return Response.json({ prompts: cached.prompts });
    }

    // Build compact context snapshot
    const contextSnapshot = await buildContextSnapshot(workspaceId, page, eventId, tab);

    // Call Claude Haiku for fast prompt generation
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Based on this event dashboard context, suggest exactly 3 short, specific questions a host would ask right now. Max 60 characters each. Return ONLY a JSON array of 3 strings, nothing else.

Context:
${contextSnapshot}

Page: ${page}${tab ? ` (${tab} tab)` : ''}`,
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse the JSON array from the response
    let prompts: string[];
    try {
      // Handle potential markdown code blocks
      const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      prompts = JSON.parse(cleaned);
      if (!Array.isArray(prompts) || prompts.length < 3) {
        throw new Error('Invalid format');
      }
      // Ensure max 60 chars and exactly 3
      prompts = prompts.slice(0, 3).map((p: string) =>
        typeof p === 'string' ? p.slice(0, 60) : String(p).slice(0, 60)
      );
    } catch {
      // Fallback to static prompts
      prompts = getFallback(page, tab);
    }

    // Cache result
    promptCache.set(cacheKey, {
      prompts,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return Response.json({ prompts });
  } catch (error) {
    logger.error('Failed to generate prompts', error as Error);
    // Return static fallbacks on any error
    const page = new URL(request.url).searchParams.get('page') || 'events-list';
    const tab = new URL(request.url).searchParams.get('tab') || undefined;
    return Response.json({ prompts: getFallback(page, tab) });
  }
}

/**
 * Build a compact context snapshot for the Haiku prompt generation.
 */
async function buildContextSnapshot(
  workspaceId: string,
  page: string,
  eventId?: string,
  tab?: string
): Promise<string> {
  const db = getDb();

  if (page === 'events-list') {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [eventCounts, soonEvents, lowRsvp] = await Promise.all([
      db`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE start_date > ${now.toISOString()} AND status != 'DRAFT') AS upcoming,
          COUNT(*) FILTER (WHERE status = 'DRAFT') AS drafts
        FROM events
        WHERE workspace_id = ${workspaceId}
      `,
      db`
        SELECT title, start_date
        FROM events
        WHERE workspace_id = ${workspaceId}
          AND start_date > ${now.toISOString()}
          AND start_date <= ${next7Days.toISOString()}
          AND status != 'DRAFT'
        ORDER BY start_date ASC
        LIMIT 3
      `,
      db`
        SELECT e.title,
          COUNT(*) AS invited,
          COUNT(*) FILTER (WHERE ci.status = 'ACCEPTED') AS accepted
        FROM events e
        JOIN campaign_invitations ci ON ci.event_id = e.id
        WHERE e.workspace_id = ${workspaceId}
          AND e.start_date > ${now.toISOString()}
          AND e.status = 'PUBLISHED'
        GROUP BY e.id, e.title
        HAVING COUNT(*) >= 5 AND COUNT(*) FILTER (WHERE ci.status = 'ACCEPTED')::float / COUNT(*) < 0.4
        LIMIT 3
      `,
    ]);

    const ec = eventCounts[0] || {};
    const soonList = soonEvents.map((e: Record<string, unknown>) => `"${e.title}" on ${e.start_date}`).join(', ');
    const lowList = lowRsvp.map((e: Record<string, unknown>) => `"${e.title}" (${e.accepted}/${e.invited} accepted)`).join(', ');

    return `${ec.upcoming || 0} upcoming events, ${ec.drafts || 0} drafts.${soonList ? ` Events this week: ${soonList}.` : ''}${lowList ? ` Low RSVP: ${lowList}.` : ''}`;
  }

  if (page === 'people') {
    const stats = await db`
      SELECT
        COUNT(DISTINCT ci.contact_id) AS unique_contacts
      FROM campaign_invitations ci
      JOIN events e ON e.id = ci.event_id
      WHERE e.workspace_id = ${workspaceId}
    `;
    const s = stats[0] || {};
    return `People database with ${s.unique_contacts || 0} unique contacts across all events.`;
  }

  // Event-specific page
  if (eventId) {
    const eventIdNum = parseInt(eventId, 10);
    const [eventRow, statsRow] = await Promise.all([
      db`
        SELECT title, status, start_date, total_capacity
        FROM events WHERE id = ${eventIdNum} LIMIT 1
      `,
      db`
        SELECT
          COUNT(*) AS invited,
          COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS confirmed,
          COUNT(*) FILTER (WHERE status = 'INVITED') AS pending
        FROM campaign_invitations
        WHERE event_id = ${eventIdNum}
      `,
    ]);
    const ev = eventRow[0];
    const st = statsRow[0] || {};
    if (ev) {
      return `Event: "${ev.title}" (${ev.status}), ${ev.start_date}, capacity ${ev.total_capacity || 'N/A'}. ${st.invited || 0} invited, ${st.confirmed || 0} confirmed, ${st.pending || 0} pending. Current tab: ${tab || 'overview'}.`;
    }
  }

  return 'Dashboard page.';
}

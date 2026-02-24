import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { BriefingContent, BriefingGuest } from '@/types/phase3';

const MODEL_VERSION = 'claude-sonnet-4-20250514';

/**
 * Generate a personalized briefing packet for a team member.
 * Includes their assigned guests, top-scored contacts, and strategic notes.
 */
export async function generateBriefingForUser(
  eventId: number,
  workspaceId: string,
  userId: string,
  briefingType: string
): Promise<BriefingContent> {
  const db = getDb();

  // Get event details
  const events = await db`
    SELECT title, description, start_time, end_time, location FROM events WHERE id = ${eventId}
  `;
  const event = events[0];

  // Get team member's assigned guests with scores
  const assignedGuests = await db`
    SELECT
      pc.id AS contact_id, pc.full_name, pc.company, pc.title, pc.tags, pc.ai_summary,
      gs.relevance_score, gs.score_rationale, gs.talking_points
    FROM guest_team_assignments gta
    JOIN people_contacts pc ON pc.id = gta.contact_id
    LEFT JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${eventId}
    WHERE gta.event_id = ${eventId}
      AND gta.workspace_id = ${workspaceId}
      AND gta.assigned_to = ${userId}
    ORDER BY gs.relevance_score DESC NULLS LAST
  `;

  // If no assignments, get top-scored guests
  let guestsForBriefing = assignedGuests;
  if (guestsForBriefing.length === 0) {
    guestsForBriefing = await db`
      SELECT
        pc.id AS contact_id, pc.full_name, pc.company, pc.title, pc.tags, pc.ai_summary,
        gs.relevance_score, gs.score_rationale, gs.talking_points
      FROM guest_scores gs
      JOIN people_contacts pc ON pc.id = gs.contact_id
      WHERE gs.event_id = ${eventId} AND gs.workspace_id = ${workspaceId}
      ORDER BY gs.relevance_score DESC
      LIMIT 15
    `;
  }

  // Build prompt for Claude
  const client = getAnthropicClient();

  const guestList = guestsForBriefing.map((g: any) => ({
    name: g.full_name,
    company: g.company,
    title: g.title,
    score: g.relevance_score,
    rationale: g.score_rationale,
    talking_points: g.talking_points || [],
    summary: g.ai_summary,
  }));

  const prompt = `Generate a personalized event briefing for a team member. Return ONLY raw JSON (no markdown).

## Event
Title: ${event?.title || 'Event'}
Description: ${event?.description || 'N/A'}
Date: ${event?.start_time || 'TBD'}
Briefing Type: ${briefingType}

## Guests to Brief On (${guestsForBriefing.length} guests)
${JSON.stringify(guestList, null, 2)}

Return this JSON structure:
{
  "event_summary": "2-3 sentence event overview and what to focus on",
  "key_guests": [
    {
      "contact_id": "from input",
      "full_name": "name",
      "company": "company or null",
      "title": "title or null",
      "relevance_score": 0-100,
      "talking_points": ["point 1", "point 2"],
      "score_rationale": "why important",
      "key_interests": ["interest 1", "interest 2"],
      "conversation_starters": ["starter 1", "starter 2"]
    }
  ],
  "strategic_notes": "Overall strategy and key connections to make",
  "agenda_highlights": ["highlight 1", "highlight 2"]
}

Focus on actionable intelligence. Keep conversation starters natural and specific.`;

  const response = await client.messages.create({
    model: MODEL_VERSION,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      event_summary: parsed.event_summary || '',
      key_guests: (parsed.key_guests || []).map((g: any) => ({
        contact_id: g.contact_id || '',
        full_name: g.full_name || '',
        company: g.company || null,
        title: g.title || null,
        relevance_score: Math.min(100, Math.max(0, Number(g.relevance_score) || 0)),
        talking_points: Array.isArray(g.talking_points) ? g.talking_points : [],
        score_rationale: g.score_rationale || '',
        key_interests: Array.isArray(g.key_interests) ? g.key_interests : [],
        conversation_starters: Array.isArray(g.conversation_starters) ? g.conversation_starters : [],
      })),
      strategic_notes: parsed.strategic_notes || '',
      agenda_highlights: Array.isArray(parsed.agenda_highlights) ? parsed.agenda_highlights : [],
    };
  } catch (err) {
    logger.error('Failed to parse briefing response', err as Error);
    return {
      event_summary: 'Unable to generate briefing. Please try again.',
      key_guests: guestsForBriefing.map((g: any) => ({
        contact_id: g.contact_id,
        full_name: g.full_name,
        company: g.company,
        title: g.title,
        relevance_score: g.relevance_score || 0,
        talking_points: g.talking_points || [],
        score_rationale: g.score_rationale || '',
        key_interests: [],
        conversation_starters: [],
      })),
      strategic_notes: '',
      agenda_highlights: [],
    };
  }
}

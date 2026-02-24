import { getAnthropicClient } from '@/lib/anthropic';
import { getDb } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

interface GuestForSeating {
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  industry: string | null;
  tags: string[];
  relevance_score: number | null;
  score_rationale: string | null;
  talking_points: string[];
}

interface TableConfig {
  number: number;
  seats: number;
}

interface SeatingAssignment {
  contact_id: string;
  table_number: number;
  seat_number: number | null;
  rationale: string;
  confidence: number;
}

interface IntroductionPairingResult {
  contact_a_id: string;
  contact_b_id: string;
  reason: string;
  mutual_interest: string;
  priority: number;
}

/**
 * Generate AI-powered seating suggestions for an event.
 */
export async function generateSeatingPlan(
  eventId: number,
  workspaceId: string,
  strategy: 'MIXED_INTERESTS' | 'SIMILAR_INTERESTS' | 'SCORE_BALANCED',
  maxPerTable?: number
): Promise<{ batchId: string; assignments: SeatingAssignment[] }> {
  const db = getDb();
  const batchId = crypto.randomUUID();

  // Fetch event details with table config
  const events = await db`
    SELECT title, total_capacity, seating_format, tables_config
    FROM events WHERE id = ${eventId}
  `;
  if (events.length === 0) throw new Error('Event not found');
  const event = events[0];

  // Get tables config
  let tables: TableConfig[] = event.tables_config?.tables || [];
  if (tables.length === 0) {
    // Auto-generate tables from capacity
    const capacity = event.total_capacity || 50;
    const seatsPerTable = maxPerTable || 8;
    const numTables = Math.ceil(capacity / seatsPerTable);
    tables = Array.from({ length: numTables }, (_, i) => ({
      number: i + 1,
      seats: seatsPerTable,
    }));
  }

  // Fetch confirmed/accepted guests with their scores
  const guests = await db`
    SELECT
      c.id AS contact_id,
      c.full_name,
      c.company,
      c.title,
      c.industry,
      c.tags,
      gs.relevance_score,
      gs.score_rationale,
      gs.talking_points
    FROM campaign_invitations ci
    JOIN people_contacts c ON c.id = ci.contact_id
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventId}
    WHERE ci.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
    ORDER BY gs.relevance_score DESC NULLS LAST
  `;

  if (guests.length === 0) {
    return { batchId, assignments: [] };
  }

  const client = getAnthropicClient();

  const prompt = buildSeatingPrompt(
    guests as GuestForSeating[],
    tables,
    event.title,
    strategy
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  const assignments = parseSeatingResponse(text, guests as GuestForSeating[], tables);

  // Save suggestions to DB
  for (const assignment of assignments) {
    await db`
      INSERT INTO seating_suggestions (
        event_id, workspace_id, contact_id,
        table_number, seat_number, rationale, confidence,
        batch_id, model_version
      ) VALUES (
        ${eventId}, ${workspaceId}, ${assignment.contact_id},
        ${assignment.table_number}, ${assignment.seat_number},
        ${assignment.rationale}, ${assignment.confidence},
        ${batchId}, 'claude-sonnet-4-20250514'
      )
    `;
  }

  return { batchId, assignments };
}

/**
 * Generate introduction pairings for guests at an event.
 */
export async function generateIntroductionPairings(
  eventId: number,
  workspaceId: string,
  maxPairings: number = 20
): Promise<{ batchId: string; pairings: IntroductionPairingResult[] }> {
  const db = getDb();
  const batchId = crypto.randomUUID();

  const events = await db`
    SELECT title FROM events WHERE id = ${eventId}
  `;
  if (events.length === 0) throw new Error('Event not found');

  // Fetch objectives for context
  const objectives = await db`
    SELECT objective_text, weight FROM event_objectives
    WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
    ORDER BY weight DESC
  `;

  // Fetch accepted guests with scores
  const guests = await db`
    SELECT
      c.id AS contact_id,
      c.full_name,
      c.company,
      c.title,
      c.industry,
      c.tags,
      gs.relevance_score,
      gs.score_rationale,
      gs.talking_points
    FROM campaign_invitations ci
    JOIN people_contacts c ON c.id = ci.contact_id
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventId}
    WHERE ci.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
    ORDER BY gs.relevance_score DESC NULLS LAST
    LIMIT 100
  `;

  if (guests.length < 2) {
    return { batchId, pairings: [] };
  }

  const client = getAnthropicClient();
  const prompt = buildIntroductionPrompt(
    guests as GuestForSeating[],
    objectives.map((o: any) => o.objective_text),
    events[0].title,
    maxPairings
  );

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('');

  const pairings = parseIntroductionResponse(text, guests as GuestForSeating[], maxPairings);

  // Save pairings to DB
  for (const pairing of pairings) {
    await db`
      INSERT INTO introduction_pairings (
        event_id, workspace_id, contact_a_id, contact_b_id,
        reason, mutual_interest, priority,
        batch_id, model_version
      ) VALUES (
        ${eventId}, ${workspaceId}, ${pairing.contact_a_id}, ${pairing.contact_b_id},
        ${pairing.reason}, ${pairing.mutual_interest}, ${pairing.priority},
        ${batchId}, 'claude-sonnet-4-20250514'
      )
    `;
  }

  return { batchId, pairings };
}

/**
 * Apply AI suggestions to actual campaign_invitations table assignments.
 */
export async function applySeatingAssignment(
  eventId: number,
  workspaceId: string,
  contactId: string,
  tableNumber: number,
  seatNumber?: number | null
): Promise<void> {
  const db = getDb();
  await db`
    UPDATE campaign_invitations
    SET table_assignment = ${tableNumber},
        seat_assignment = ${seatNumber || null}
    WHERE event_id = ${eventId}
      AND contact_id = ${contactId}
  `;
}

/**
 * Get current seating assignments for an event.
 */
export async function getSeatingAssignments(
  eventId: number,
  workspaceId: string
): Promise<any[]> {
  const db = getDb();
  return db`
    SELECT
      ci.id AS invitation_id,
      ci.contact_id,
      c.full_name,
      c.company,
      c.title,
      ci.table_assignment,
      ci.seat_assignment,
      ci.status,
      gs.relevance_score
    FROM campaign_invitations ci
    JOIN people_contacts c ON c.id = ci.contact_id
    LEFT JOIN guest_scores gs ON gs.contact_id = c.id AND gs.event_id = ${eventId}
    WHERE ci.event_id = ${eventId}
      AND ci.status = 'ACCEPTED'
    ORDER BY ci.table_assignment NULLS LAST, ci.seat_assignment NULLS LAST
  `;
}

// ─── Prompt Builders ──────────────────────────────────────────────────────

function buildSeatingPrompt(
  guests: GuestForSeating[],
  tables: TableConfig[],
  eventTitle: string,
  strategy: string
): string {
  const strategyDesc = {
    MIXED_INTERESTS: 'Mix guests from different industries and backgrounds at each table for diverse conversation.',
    SIMILAR_INTERESTS: 'Group guests with similar industries or roles together for deep-dive discussions.',
    SCORE_BALANCED: 'Distribute high-scoring guests evenly across tables, ensuring each table has at least one high-value connection.',
  }[strategy];

  const guestList = guests.map((g, i) => {
    const parts = [`${i}: ${g.full_name}`];
    if (g.company) parts.push(`(${g.company})`);
    if (g.title) parts.push(`- ${g.title}`);
    if (g.industry) parts.push(`[${g.industry}]`);
    if (g.relevance_score) parts.push(`Score: ${g.relevance_score}`);
    if (g.tags?.length) parts.push(`Tags: ${g.tags.join(', ')}`);
    return parts.join(' ');
  }).join('\n');

  const tableList = tables.map(t => `Table ${t.number}: ${t.seats} seats`).join('\n');

  return `Assign guests to tables for the event "${eventTitle}".

## Strategy
${strategyDesc}

## Tables
${tableList}

## Guests (index: name details)
${guestList}

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "assignments": [
    { "guest_index": 0, "table_number": 1, "rationale": "Brief reason", "confidence": 0.85 }
  ]
}

Rules:
- Every guest must be assigned to exactly one table
- Do not exceed the seat limit for any table
- Provide a brief rationale for each placement
- Confidence is 0-1 indicating how well-suited the placement is`;
}

function buildIntroductionPrompt(
  guests: GuestForSeating[],
  objectives: string[],
  eventTitle: string,
  maxPairings: number
): string {
  const guestList = guests.map((g, i) => {
    const parts = [`${i}: ${g.full_name}`];
    if (g.company) parts.push(`(${g.company})`);
    if (g.title) parts.push(`- ${g.title}`);
    if (g.industry) parts.push(`[${g.industry}]`);
    if (g.score_rationale) parts.push(`Context: ${g.score_rationale}`);
    if (g.talking_points?.length) parts.push(`Interests: ${g.talking_points.join('; ')}`);
    return parts.join(' ');
  }).join('\n');

  const objectiveList = objectives.length > 0
    ? `\n## Event Objectives\n${objectives.map(o => `- ${o}`).join('\n')}`
    : '';

  return `Suggest up to ${maxPairings} guest introduction pairings for "${eventTitle}".
These are "these two should meet" recommendations.
${objectiveList}

## Guests
${guestList}

Respond in this exact JSON format (no markdown, just raw JSON):
{
  "pairings": [
    {
      "guest_a_index": 0,
      "guest_b_index": 3,
      "reason": "Why they should meet",
      "mutual_interest": "What they have in common or could collaborate on",
      "priority": 1
    }
  ]
}

Priority: 1 = highest (must-meet), 2 = high, 3 = nice-to-have.
Focus on pairings that create the most business or networking value.`;
}

// ─── Response Parsers ─────────────────────────────────────────────────────

function parseSeatingResponse(
  text: string,
  guests: GuestForSeating[],
  tables: TableConfig[]
): SeatingAssignment[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallbackSeating(guests, tables);

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.assignments)) return fallbackSeating(guests, tables);

    return parsed.assignments
      .filter((a: any) => {
        const gIdx = a.guest_index;
        return typeof gIdx === 'number' && gIdx >= 0 && gIdx < guests.length;
      })
      .map((a: any) => ({
        contact_id: guests[a.guest_index].contact_id,
        table_number: Math.max(1, Math.round(Number(a.table_number) || 1)),
        seat_number: null,
        rationale: a.rationale || '',
        confidence: Math.min(1, Math.max(0, Number(a.confidence) || 0.5)),
      }));
  } catch {
    return fallbackSeating(guests, tables);
  }
}

function fallbackSeating(guests: GuestForSeating[], tables: TableConfig[]): SeatingAssignment[] {
  const assignments: SeatingAssignment[] = [];
  let tableIdx = 0;
  let seatCount: Record<number, number> = {};

  for (const guest of guests) {
    const table = tables[tableIdx % tables.length];
    const currentSeats = seatCount[table.number] || 0;

    if (currentSeats >= table.seats) {
      tableIdx++;
      const nextTable = tables[tableIdx % tables.length];
      assignments.push({
        contact_id: guest.contact_id,
        table_number: nextTable.number,
        seat_number: null,
        rationale: 'Auto-assigned (round-robin)',
        confidence: 0.3,
      });
      seatCount[nextTable.number] = (seatCount[nextTable.number] || 0) + 1;
    } else {
      assignments.push({
        contact_id: guest.contact_id,
        table_number: table.number,
        seat_number: null,
        rationale: 'Auto-assigned (round-robin)',
        confidence: 0.3,
      });
      seatCount[table.number] = currentSeats + 1;
      if (currentSeats + 1 >= table.seats) tableIdx++;
    }
  }

  return assignments;
}

function parseIntroductionResponse(
  text: string,
  guests: GuestForSeating[],
  maxPairings: number
): IntroductionPairingResult[] {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.pairings)) return [];

    return parsed.pairings
      .filter((p: any) => {
        const a = p.guest_a_index;
        const b = p.guest_b_index;
        return typeof a === 'number' && typeof b === 'number' &&
          a >= 0 && a < guests.length && b >= 0 && b < guests.length && a !== b;
      })
      .slice(0, maxPairings)
      .map((p: any) => ({
        contact_a_id: guests[p.guest_a_index].contact_id,
        contact_b_id: guests[p.guest_b_index].contact_id,
        reason: p.reason || '',
        mutual_interest: p.mutual_interest || '',
        priority: Math.min(3, Math.max(1, Math.round(Number(p.priority) || 2))),
      }));
  } catch {
    return [];
  }
}

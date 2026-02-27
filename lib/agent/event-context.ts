import { getDb } from '@/lib/db';
import type {
  FullEventContext,
  CompanyProfile,
  EventContext,
  ObjectiveContext,
  SponsorContext,
  GuestSummary,
  LearnedPreference,
} from '@/types/context';
import { getWorkspacePreferences } from '@/lib/agent/learning';

/**
 * Fetch the full event context in a single call (5+ parallel queries).
 * Used by all AI operations: scoring, seating, briefings, follow-up, chat.
 * When includePreferences is true, also fetches learned workspace preferences.
 */
export async function getFullEventContext(
  eventId: number,
  workspaceId: string,
  options?: { includePreferences?: boolean }
): Promise<FullEventContext> {
  const db = getDb();

  const [companyRows, eventRows, objectiveRows, sponsorRows, guestStatsRows] =
    await Promise.all([
      // 1. Company profile from workspace
      db`
        SELECT name, company_website, company_description, industry, market_position,
               key_leadership, strategic_priorities, competitors, brand_voice,
               company_enriched_at
        FROM workspaces
        WHERE id = ${workspaceId}
        LIMIT 1
      `,

      // 2. Event details (including new Phase 2 fields)
      db`
        SELECT id, title, description, start_date, end_date,
               location::text as location_raw, total_capacity, seating_format, status,
               event_theme, success_criteria,
               key_stakeholders::text as key_stakeholders_raw,
               budget_range, additional_context
        FROM events
        WHERE id = ${eventId}
        LIMIT 1
      `,

      // 3. Objectives
      db`
        SELECT objective_text, weight
        FROM event_objectives
        WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
        ORDER BY weight DESC
      `,

      // 4. Sponsors (from relational table)
      db`
        SELECT name, tier, description, goals, promised_seats,
               table_preference, key_attendees, contact_person
        FROM event_sponsors
        WHERE event_id = ${eventId} AND workspace_id = ${workspaceId}
        ORDER BY sort_order ASC
      `,

      // 5. Guest summary stats
      db`
        SELECT
          COUNT(*) AS total_invited,
          COUNT(*) FILTER (WHERE gs.relevance_score IS NOT NULL) AS scored,
          COUNT(*) FILTER (WHERE gs.relevance_score >= 60) AS qualified,
          COUNT(*) FILTER (WHERE ci.status = 'ACCEPTED') AS confirmed,
          COUNT(*) FILTER (WHERE ci.status = 'PENDING') AS pending_rsvp,
          COUNT(*) FILTER (WHERE ci.status = 'DECLINED') AS declined,
          ROUND(AVG(gs.relevance_score)::numeric, 1) AS avg_score,
          MAX(gs.relevance_score) AS top_score
        FROM campaign_invitations ci
        LEFT JOIN guest_scores gs ON gs.contact_id = ci.contact_id AND gs.event_id = ci.event_id
        WHERE ci.event_id = ${eventId}
      `,
    ]);

  // Parse company
  const ws = companyRows[0];
  const company: CompanyProfile = {
    name: ws?.name || 'Unknown',
    website: ws?.company_website || null,
    description: ws?.company_description || null,
    industry: ws?.industry || null,
    market_position: ws?.market_position || null,
    key_leadership: ws?.key_leadership || [],
    strategic_priorities: ws?.strategic_priorities || [],
    competitors: ws?.competitors || [],
    brand_voice: ws?.brand_voice || null,
    enriched_at: ws?.company_enriched_at || null,
  };

  // Parse event
  const ev = eventRows[0];
  let locationStr: string | null = null;
  if (ev?.location_raw) {
    try {
      const loc = JSON.parse(ev.location_raw);
      locationStr = [loc.venue_name, loc.city, loc.state_province]
        .filter(Boolean)
        .join(', ');
    } catch {
      /* ignore */
    }
  }
  const keyStakeholders = ev?.key_stakeholders_raw
    ? JSON.parse(ev.key_stakeholders_raw)
    : [];

  const event: EventContext = {
    id: ev?.id || eventId,
    title: ev?.title || 'Unknown Event',
    description: ev?.description || null,
    start_date: ev?.start_date || null,
    end_date: ev?.end_date || null,
    location: locationStr,
    total_capacity: ev?.total_capacity || null,
    seating_format: ev?.seating_format || null,
    status: ev?.status || null,
    event_theme: ev?.event_theme || null,
    success_criteria: ev?.success_criteria || null,
    key_stakeholders: keyStakeholders,
    budget_range: ev?.budget_range || null,
    additional_context: ev?.additional_context || null,
  };

  // Parse objectives
  const objectives: ObjectiveContext[] = objectiveRows.map((o: any) => ({
    objective_text: o.objective_text,
    weight: o.weight,
  }));

  // Parse sponsors
  const sponsors: SponsorContext[] = sponsorRows.map((s: any) => ({
    name: s.name,
    tier: s.tier,
    description: s.description,
    goals: s.goals || [],
    promised_seats: s.promised_seats,
    table_preference: s.table_preference,
    key_attendees: s.key_attendees || [],
    contact_person: s.contact_person,
  }));

  // Parse guest stats
  const gs = guestStatsRows[0] || {};
  const guests: GuestSummary = {
    total_invited: Number(gs.total_invited) || 0,
    scored: Number(gs.scored) || 0,
    qualified: Number(gs.qualified) || 0,
    confirmed: Number(gs.confirmed) || 0,
    pending_rsvp: Number(gs.pending_rsvp) || 0,
    declined: Number(gs.declined) || 0,
    avg_score: gs.avg_score ? Number(gs.avg_score) : null,
    top_score: gs.top_score ? Number(gs.top_score) : null,
  };

  // Optionally fetch learned preferences
  let preferences: LearnedPreference[] | undefined;
  if (options?.includePreferences) {
    try {
      const prefs = await getWorkspacePreferences(workspaceId);
      if (prefs.length > 0) {
        preferences = prefs.map((p) => ({
          category: p.category,
          preference_text: p.preference_text,
          confidence: p.confidence,
          observation_count: p.observation_count,
        }));
      }
    } catch {
      // Non-critical — continue without preferences
    }
  }

  return { company, event, objectives, sponsors, guests, preferences };
}

/**
 * Format the full event context into a prompt-ready markdown string.
 * Conditionally includes sections only when data exists.
 */
export function formatContextForPrompt(ctx: FullEventContext): string {
  const sections: string[] = [];

  // Host Company
  if (ctx.company.description || ctx.company.industry) {
    const lines = ['## Host Company'];
    lines.push(`Company: ${ctx.company.name}`);
    if (ctx.company.industry) lines.push(`Industry: ${ctx.company.industry}`);
    if (ctx.company.description) lines.push(`About: ${ctx.company.description}`);
    if (ctx.company.market_position)
      lines.push(`Market Position: ${ctx.company.market_position}`);
    if (ctx.company.key_leadership.length > 0) {
      lines.push(
        `Key Leadership: ${ctx.company.key_leadership.map((l) => `${l.name} (${l.title})`).join(', ')}`
      );
    }
    if (ctx.company.strategic_priorities.length > 0) {
      lines.push(
        `Strategic Priorities: ${ctx.company.strategic_priorities.join('; ')}`
      );
    }
    if (ctx.company.competitors.length > 0) {
      lines.push(`Competitors: ${ctx.company.competitors.join(', ')}`);
    }
    if (ctx.company.brand_voice)
      lines.push(`Brand Voice: ${ctx.company.brand_voice}`);
    sections.push(lines.join('\n'));
  }

  // Event
  {
    const lines = ['## Event'];
    lines.push(`Title: ${ctx.event.title}`);
    if (ctx.event.start_date) lines.push(`Date: ${ctx.event.start_date}`);
    if (ctx.event.location) lines.push(`Location: ${ctx.event.location}`);
    if (ctx.event.total_capacity)
      lines.push(`Capacity: ${ctx.event.total_capacity}`);
    if (ctx.event.seating_format)
      lines.push(`Format: ${ctx.event.seating_format}`);
    if (ctx.event.event_theme) lines.push(`Theme: ${ctx.event.event_theme}`);
    if (ctx.event.success_criteria)
      lines.push(`Success Criteria: ${ctx.event.success_criteria}`);
    if (ctx.event.description) lines.push(`Description: ${ctx.event.description}`);
    if (ctx.event.key_stakeholders.length > 0) {
      lines.push(
        `Key Stakeholders: ${ctx.event.key_stakeholders.map((s) => `${s.name}${s.role ? ` (${s.role})` : ''}`).join(', ')}`
      );
    }
    if (ctx.event.additional_context)
      lines.push(`Additional Context: ${ctx.event.additional_context}`);
    sections.push(lines.join('\n'));
  }

  // Objectives
  if (ctx.objectives.length > 0) {
    const lines = ['## Event Objectives'];
    for (const obj of ctx.objectives) {
      lines.push(`- [Weight ${obj.weight}] ${obj.objective_text}`);
    }
    sections.push(lines.join('\n'));
  }

  // Sponsors
  if (ctx.sponsors.length > 0) {
    const lines = ['## Sponsors'];
    for (const sp of ctx.sponsors) {
      const parts = [sp.name];
      if (sp.tier) parts.push(`(${sp.tier})`);
      if (sp.description) parts.push(`— ${sp.description}`);
      lines.push(parts.join(' '));
      if (sp.goals.length > 0) {
        lines.push(`  Goals: ${sp.goals.join('; ')}`);
      }
      if (sp.key_attendees.length > 0) {
        lines.push(
          `  Key Attendees: ${sp.key_attendees.map((a) => `${a.name}${a.title ? ` (${a.title})` : ''}`).join(', ')}`
        );
      }
      if (sp.table_preference) {
        lines.push(`  Table Preference: ${sp.table_preference}`);
      }
    }
    sections.push(lines.join('\n'));
  }

  // Guest Summary
  {
    const g = ctx.guests;
    const lines = ['## Guest Summary'];
    lines.push(`Total Invited: ${g.total_invited}`);
    lines.push(`Scored: ${g.scored} | Qualified (60+): ${g.qualified}`);
    lines.push(
      `Confirmed: ${g.confirmed} | Pending: ${g.pending_rsvp} | Declined: ${g.declined}`
    );
    if (g.avg_score !== null) lines.push(`Average Score: ${g.avg_score}`);
    if (g.top_score !== null) lines.push(`Top Score: ${g.top_score}`);
    sections.push(lines.join('\n'));
  }

  // Learned Preferences (from past user decisions)
  if (ctx.preferences && ctx.preferences.length > 0) {
    const lines = ['## Learned Preferences (from past decisions)'];
    for (const pref of ctx.preferences) {
      lines.push(
        `- [${pref.category}] ${pref.preference_text} (confidence: ${pref.confidence.toFixed(1)}, observed ${pref.observation_count} time${pref.observation_count !== 1 ? 's' : ''})`
      );
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

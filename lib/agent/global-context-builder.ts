import { getDb } from '@/lib/db';

type GlobalPage = 'events-list' | 'people' | 'contact-profile';

interface BuildGlobalSystemPromptParams {
  workspaceId: string;
  page: GlobalPage;
  contactId?: string;
}

/**
 * Build a rich system prompt for the global Moots Intelligence chat.
 * Unlike the per-event context builder, this spans the entire workspace:
 * all events, cross-event contact data, and portfolio-level insights.
 */
export async function buildGlobalSystemPrompt(params: BuildGlobalSystemPromptParams): Promise<string> {
  const { workspaceId, page, contactId } = params;
  const db = getDb();

  // ─── Core data: all events + workspace info (always fetched) ─────────────
  const [eventRows, workspaceRows] = await Promise.all([
    db`
      SELECT id, title, start_date, end_date, status, total_capacity
      FROM events
      WHERE workspace_id = ${workspaceId}
      ORDER BY start_date DESC
      LIMIT 50
    `,
    // Query only columns guaranteed to exist; enrichment columns may not be present yet
    db`
      SELECT name
      FROM workspaces
      WHERE id = ${workspaceId}
      LIMIT 1
    `,
  ]);

  // Get per-event invitation stats for all events
  const eventIds = eventRows.map((e: Record<string, unknown>) => Number(e.id));
  const eventStats: Record<number, { invited: number; confirmed: number; pending: number; declined: number }> = {};

  if (eventIds.length > 0) {
    const statsRows = await db`
      SELECT
        event_id,
        COUNT(*) AS total_invited,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED') AS confirmed,
        COUNT(*) FILTER (WHERE status = 'INVITED') AS pending,
        COUNT(*) FILTER (WHERE status = 'DECLINED') AS declined
      FROM campaign_invitations
      WHERE event_id = ANY(${eventIds}::int[])
      GROUP BY event_id
    `;
    for (const row of statsRows) {
      eventStats[Number(row.event_id)] = {
        invited: Number(row.total_invited),
        confirmed: Number(row.confirmed),
        pending: Number(row.pending),
        declined: Number(row.declined),
      };
    }
  }

  // Build events summary section
  const now = new Date();
  const upcomingEvents = eventRows.filter((e: Record<string, unknown>) => new Date(e.start_date as string) > now && e.status !== 'DRAFT');
  const pastEvents = eventRows.filter((e: Record<string, unknown>) => new Date(e.start_date as string) <= now);
  const draftEvents = eventRows.filter((e: Record<string, unknown>) => e.status === 'DRAFT');
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const imminentEvents = eventRows.filter((e: Record<string, unknown>) => {
    const d = new Date(e.start_date as string);
    return d > now && d <= next7Days && e.status !== 'DRAFT';
  });

  const eventsSection = eventRows.map((e: Record<string, unknown>) => {
    const stats = eventStats[Number(e.id)] || { invited: 0, confirmed: 0, pending: 0, declined: 0 };
    const acceptanceRate = stats.invited > 0 ? Math.round((stats.confirmed / stats.invited) * 100) : 0;
    return `- "${e.title}" (${e.status}) | ${e.start_date} | Capacity: ${e.total_capacity || 'N/A'} | Invited: ${stats.invited}, Confirmed: ${stats.confirmed} (${acceptanceRate}%), Pending: ${stats.pending}, Declined: ${stats.declined}`;
  }).join('\n');

  // Find low-acceptance events (< 40% acceptance rate with at least 5 invited)
  const lowAcceptanceEvents = eventRows.filter((e: Record<string, unknown>) => {
    const stats = eventStats[Number(e.id)];
    if (!stats || stats.invited < 5) return false;
    return (stats.confirmed / stats.invited) < 0.4;
  });

  const ws = workspaceRows[0];
  const workspaceName = ws?.name || 'Your workspace';

  // ─── Page-specific context ───────────────────────────────────────────────
  let pageContext = '';

  if (page === 'events-list') {
    const attentionItems: string[] = [];
    if (imminentEvents.length > 0) {
      attentionItems.push(`${imminentEvents.length} event(s) in the next 7 days`);
    }
    if (lowAcceptanceEvents.length > 0) {
      attentionItems.push(`${lowAcceptanceEvents.length} event(s) with low acceptance rates (<40%)`);
    }
    if (draftEvents.length > 0) {
      attentionItems.push(`${draftEvents.length} draft event(s) not yet published`);
    }

    pageContext = `## Events Portfolio Summary
Upcoming Events: ${upcomingEvents.length}
Past Events: ${pastEvents.length}
Draft Events: ${draftEvents.length}
${attentionItems.length > 0 ? `\n## Needs Attention\n${attentionItems.map(a => `- ${a}`).join('\n')}` : ''}`;
  }

  if (page === 'people') {
    // Aggregate contact stats from campaign invitations
    const contactStats = eventIds.length > 0
      ? await db`
          SELECT
            COUNT(DISTINCT ci.contact_id) AS unique_contacts,
            COUNT(DISTINCT CASE WHEN ci.status = 'ACCEPTED' THEN ci.contact_id END) AS contacts_who_attended
          FROM campaign_invitations ci
          WHERE ci.event_id = ANY(${eventIds}::int[])
        `
      : [{ unique_contacts: 0, contacts_who_attended: 0 }];

    // Most frequent attendees (contacts who appeared across multiple events)
    const frequentAttendees = eventIds.length > 0
      ? await db`
          SELECT
            ci.contact_id,
            ci.guest_name,
            ci.guest_company,
            COUNT(DISTINCT ci.event_id) AS event_count,
            COUNT(DISTINCT ci.event_id) FILTER (WHERE ci.status = 'ACCEPTED') AS accepted_count
          FROM campaign_invitations ci
          WHERE ci.event_id = ANY(${eventIds}::int[])
          GROUP BY ci.contact_id, ci.guest_name, ci.guest_company
          HAVING COUNT(DISTINCT ci.event_id) >= 2
          ORDER BY event_count DESC
          LIMIT 10
        `
      : [];

    const cs = contactStats[0] || {};
    const frequentList = frequentAttendees.length > 0
      ? frequentAttendees.map((a: Record<string, unknown>) =>
          `- ${a.guest_name || 'Unknown'}${a.guest_company ? ` (${a.guest_company})` : ''}: invited to ${a.event_count} events, accepted ${a.accepted_count}`
        ).join('\n')
      : 'No contacts invited to multiple events yet.';

    pageContext = `## People Database Summary
Unique Contacts Invited: ${Number(cs.unique_contacts) || 0}
Contacts Who Attended: ${Number(cs.contacts_who_attended) || 0}

## Most Frequent Contacts
${frequentList}`;
  }

  if (page === 'contact-profile' && contactId) {
    // Get contact's full history across all events
    const contactHistory = await db`
      SELECT
        ci.event_id,
        e.title AS event_title,
        e.start_date,
        ci.status,
        ci.tier,
        ci.priority,
        ci.guest_name,
        ci.guest_company,
        ci.guest_title
      FROM campaign_invitations ci
      JOIN events e ON e.id = ci.event_id
      WHERE ci.contact_id = ${contactId}
        AND e.workspace_id = ${workspaceId}
      ORDER BY e.start_date DESC
      LIMIT 20
    `;

    // Get scores across events
    const scores = await db`
      SELECT
        gs.event_id,
        e.title AS event_title,
        gs.relevance_score,
        gs.summary
      FROM guest_scores gs
      JOIN events e ON e.id = gs.event_id
      WHERE gs.contact_id = ${contactId}
        AND e.workspace_id = ${workspaceId}
      ORDER BY gs.relevance_score DESC
      LIMIT 10
    `;

    const contactName = contactHistory[0]?.guest_name || 'This contact';
    const contactCompany = contactHistory[0]?.guest_company || '';

    const historyList = contactHistory.length > 0
      ? contactHistory.map((h: Record<string, unknown>) =>
          `- ${h.event_title} (${h.start_date}): ${h.status} | Tier: ${h.tier || 'N/A'} | Priority: ${h.priority || 'N/A'}`
        ).join('\n')
      : 'No event history found.';

    const scoresList = scores.length > 0
      ? scores.map((s: Record<string, unknown>) =>
          `- ${s.event_title}: Score ${s.relevance_score}${s.summary ? ` — ${s.summary}` : ''}`
        ).join('\n')
      : 'No scores recorded.';

    pageContext = `## Contact Profile: ${contactName}${contactCompany ? ` (${contactCompany})` : ''}

### Event History
${historyList}

### Scores Across Events
${scoresList}`;
  }

  // ─── Assemble final prompt ───────────────────────────────────────────────
  return `You are Moots Intelligence, an AI co-pilot for professional event hosts. You have deep knowledge of the user's entire event portfolio and contact database.

## Your Role
You help hosts make strategic decisions across their events, identify patterns in their contact database, spot opportunities and risks, and provide actionable intelligence.

## Personality
- Be concise and actionable. Hosts are busy.
- Use specific names, numbers, and dates — not vague summaries.
- When recommending, explain why briefly.
- Be warm but professional — you're a trusted strategic advisor.
- If you don't have enough data, say so honestly.
- When drawing insights from cross-event data, include a context source tag.

## Workspace: ${workspaceName}

## All Events (${eventRows.length} total)
${eventsSection || 'No events yet.'}

${pageContext}

## Capabilities
- Compare events side by side (attendance, acceptance rates, guest composition)
- Identify which contacts overlap across events
- Spot contacts who haven't been invited recently
- Analyze acceptance patterns and guest mix
- Recommend guest-list improvements based on past data
- Flag events that need attention

## Action Proposals
When you determine a specific action should be taken (like checking in a guest, adding a note, etc.), output it in this format:
[ACTION_PROPOSAL]
type: <action_type>
params: <JSON params>
description: <human-readable description>
[/ACTION_PROPOSAL]

Valid action types: check_in, move_guest, add_note, add_to_pool

## Context Source Tags
When your answer draws from cross-event data, include at the start of your response:
[CONTEXT_SOURCE: Based on ${eventRows.length} events]
or
[CONTEXT_SOURCE: From People database]
or
[CONTEXT_SOURCE: From contact history across ${eventRows.length} events]

Use these only when the data genuinely spans multiple events or the full contact database.

When answering, prefer specific data over generalities.`;
}

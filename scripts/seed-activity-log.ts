/**
 * Seed Activity Log — inserts realistic audit_log entries for the demo event.
 *
 * Run: npx tsx scripts/seed-activity-log.ts
 *
 * Requires DATABASE_URL env var (Neon connection string).
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const EVENT_ID = '86';
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

// ─── Actor Lookup ──────────────────────────────────────────────────────────

interface ActorInfo {
  id: string | null;
  email: string;
  name: string;
}

async function lookupActors(): Promise<{
  sarah: ActorInfo;
  marcus: ActorInfo;
  julia: ActorInfo;
  system: ActorInfo;
}> {
  // Try to find real users by name via workspace_members
  const users = await sql`
    SELECT u.id, u.email, u.full_name
    FROM users u
    JOIN workspace_members wm ON wm.user_id = u.id
    WHERE wm.workspace_id = ${WORKSPACE_ID}::uuid
    ORDER BY u.full_name
  `.catch(() => []);

  function findUser(nameFragment: string): ActorInfo {
    const match = users.find((u: any) =>
      u.full_name?.toLowerCase().includes(nameFragment.toLowerCase())
    );
    if (match) return { id: match.id, email: match.email, name: match.full_name };
    return { id: null, email: `${nameFragment.toLowerCase().replace(' ', '.')}@moots.demo`, name: nameFragment };
  }

  return {
    sarah: findUser('Sarah Chen'),
    marcus: findUser('Marcus Rivera'),
    julia: findUser('Julia Park'),
    system: { id: null, email: 'system', name: 'System' },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeTimestamp(date: string, time: string): string {
  return `${date}T${time}:00.000Z`;
}

interface AuditEntry {
  actor: ActorInfo;
  action: string;
  entityType: string;
  entityId?: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

async function insertAuditLog(entry: AuditEntry) {
  const meta = JSON.stringify({ event_id: EVENT_ID, ...(entry.metadata || {}) });
  const prev = entry.previousValue ? JSON.stringify(entry.previousValue) : null;
  const newVal = entry.newValue ? JSON.stringify(entry.newValue) : null;

  await sql`
    INSERT INTO audit_logs (
      workspace_id, actor_id, actor_email, action, entity_type, entity_id,
      previous_value, new_value, metadata, created_at
    ) VALUES (
      ${WORKSPACE_ID}::uuid,
      ${entry.actor.id}::uuid,
      ${entry.actor.email},
      ${entry.action},
      ${entry.entityType},
      ${entry.entityId || EVENT_ID},
      ${prev}::jsonb,
      ${newVal}::jsonb,
      ${meta}::jsonb,
      ${entry.createdAt}::timestamptz
    )
  `;
}

async function insertAgentActivity(
  activityType: string,
  headline: string,
  detail: string,
  createdAt: string,
  metadata: Record<string, unknown> = {}
) {
  await sql`
    INSERT INTO agent_activity_log (
      event_id, workspace_id, activity_type, headline, detail, metadata, created_at
    ) VALUES (
      86,
      ${WORKSPACE_ID}::uuid,
      ${activityType},
      ${headline},
      ${detail},
      ${JSON.stringify(metadata)}::jsonb,
      ${createdAt}::timestamptz
    )
  `;
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Looking up actors...');
  const { sarah, marcus, julia, system } = await lookupActors();
  console.log(`  Sarah: ${sarah.id || 'no user found, using email'}`);
  console.log(`  Marcus: ${marcus.id || 'no user found, using email'}`);
  console.log(`  Julia: ${julia.id || 'no user found, using email'}`);

  // Clean existing seed data for this event (optional, for re-runnability)
  console.log('Clearing previous seed data...');
  await sql`
    DELETE FROM audit_logs
    WHERE metadata->>'event_id' = ${EVENT_ID}
      AND workspace_id = ${WORKSPACE_ID}::uuid
      AND created_at < '2026-04-20'::timestamptz
  `.catch(() => {});

  await sql`
    DELETE FROM agent_activity_log
    WHERE event_id = 86
      AND workspace_id = ${WORKSPACE_ID}::uuid
      AND created_at < '2026-04-20'::timestamptz
  `.catch(() => {});

  console.log('Inserting seed activity log entries...');

  // ── 2 weeks before: April 3-4 ──────────────────────────────────────────

  await insertAuditLog({
    actor: sarah,
    action: 'event.created',
    entityType: 'event',
    newValue: { event_title: 'Meridian Capital Partners — Q2 Executive Dinner' },
    createdAt: makeTimestamp('2026-04-03', '09:00'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'event.capacity_updated',
    entityType: 'event',
    previousValue: { total_capacity: 0 },
    newValue: { total_capacity: 20 },
    createdAt: makeTimestamp('2026-04-03', '09:15'),
  });

  // Targeting criteria
  const criteria = [
    { name: 'C-Suite or Partner-level at PE/VC firms (AUM > $500M)', weight: 40 },
    { name: 'Active deal-sourcing in technology or healthcare sectors', weight: 35 },
    { name: 'Located in NYC tri-state area or frequent NYC visitor', weight: 25 },
  ];

  for (let i = 0; i < criteria.length; i++) {
    await insertAuditLog({
      actor: sarah,
      action: 'targeting.created',
      entityType: 'event_objective',
      newValue: { criterion_name: criteria[i].name, weight: criteria[i].weight },
      createdAt: makeTimestamp('2026-04-03', `09:${30 + i * 5}`),
    });
  }

  await insertAuditLog({
    actor: sarah,
    action: 'guest.imported',
    entityType: 'contact',
    newValue: { description: 'Imported 200+ contacts to guest pool', count: 214 },
    createdAt: makeTimestamp('2026-04-03', '10:30'),
  });

  // AI scoring
  await insertAgentActivity(
    'scoring',
    'Scored 72 contacts against targeting criteria',
    'Completed AI scoring for 72 contacts against 3 event objectives. Average score: 64/100. Top performers: Charles Montgomery (92), Eleanor Blackwood (88), Elizabeth Waverly (85).',
    makeTimestamp('2026-04-03', '11:00'),
  );

  await insertAuditLog({
    actor: sarah,
    action: 'guest.moved',
    entityType: 'contact',
    newValue: { description: 'Moved 44 qualified contacts to review', count: 44 },
    createdAt: makeTimestamp('2026-04-04', '09:00'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'guest.moved',
    entityType: 'contact',
    newValue: { description: 'Selected 22 contacts for invitation', count: 22 },
    createdAt: makeTimestamp('2026-04-04', '10:00'),
  });

  // ── 10 days before: April 7-8 ──────────────────────────────────────────

  await insertAuditLog({
    actor: sarah,
    action: 'campaign.created',
    entityType: 'invitation_campaign',
    newValue: { name: 'Founding Table', recipient_count: 12 },
    createdAt: makeTimestamp('2026-04-07', '10:00'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'invitation.sent',
    entityType: 'campaign_invitation',
    newValue: { campaign_name: 'Founding Table', count: 12 },
    createdAt: makeTimestamp('2026-04-07', '10:30'),
  });

  // Responses
  const responses = [
    { name: 'Charles Montgomery', response: 'accepted', time: '14:20' },
    { name: 'Elizabeth Waverly', response: 'accepted', time: '15:45' },
    { name: 'Eleanor Blackwood', response: 'accepted', time: '16:10' },
    { name: 'Walter Edmonds', response: 'accepted', time: '17:30' },
    { name: 'David Nakamura', response: 'declined', time: '18:00' },
  ];

  for (const r of responses) {
    await insertAuditLog({
      actor: system,
      action: 'invitation.response',
      entityType: 'campaign_invitation',
      newValue: { guest_name: r.name, response: r.response },
      createdAt: makeTimestamp('2026-04-07', r.time),
    });
  }

  await insertAuditLog({
    actor: sarah,
    action: 'campaign.created',
    entityType: 'invitation_campaign',
    newValue: { name: 'Extended Circle', recipient_count: 10 },
    createdAt: makeTimestamp('2026-04-08', '09:00'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'invitation.sent',
    entityType: 'campaign_invitation',
    newValue: { campaign_name: 'Extended Circle', count: 10 },
    createdAt: makeTimestamp('2026-04-08', '09:30'),
  });

  // ── 1 week before: April 10-11 ─────────────────────────────────────────

  await insertAuditLog({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { guest_name: '8 guests', assigned_to: 'Sarah Chen', count: 8 },
    createdAt: makeTimestamp('2026-04-10', '09:00'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { guest_name: '6 guests', assigned_to: 'Marcus Rivera', count: 6 },
    createdAt: makeTimestamp('2026-04-10', '09:10'),
  });

  await insertAuditLog({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { guest_name: '5 guests', assigned_to: 'Julia Park', count: 5 },
    createdAt: makeTimestamp('2026-04-10', '09:20'),
  });

  // AI briefings
  await insertAgentActivity(
    'briefing',
    'Generated Pre-Event Briefing for Sarah Chen',
    'Compiled briefing with 8 key guests, talking points, and strategic objectives for Sarah Chen.',
    makeTimestamp('2026-04-10', '10:00'),
  );

  await insertAgentActivity(
    'briefing',
    'Generated Morning-of Briefing for Marcus Rivera',
    'Compiled briefing with 6 assigned guests, ice-breaker topics, and check-in notes for Marcus Rivera.',
    makeTimestamp('2026-04-10', '10:05'),
  );

  await insertAgentActivity(
    'briefing',
    'Generated End-of-Day Briefing for Julia Park',
    'Compiled briefing with 5 assigned guests, follow-up priorities, and conversation highlights for Julia Park.',
    makeTimestamp('2026-04-10', '10:10'),
  );

  await insertAuditLog({
    actor: julia,
    action: 'briefing.viewed',
    entityType: 'briefing_packet',
    newValue: { briefing_type: 'Pre-Event' },
    createdAt: makeTimestamp('2026-04-11', '11:00'),
  });

  await insertAuditLog({
    actor: marcus,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Eleanor Blackwood', note_preview: 'Prefers to be seated away from competing fund managers' },
    createdAt: makeTimestamp('2026-04-11', '14:30'),
  });

  // ── Event day: April 17 ─────────────────────────────────────────────────

  const checkins = [
    { actor: marcus, name: 'Walter Edmonds', time: '20:10' },
    { actor: julia, name: 'Fiona O\'Malley', time: '20:12' },
    { actor: julia, name: 'Oliver Pennington', time: '20:13' },
    { actor: marcus, name: 'Eleanor Blackwood', time: '20:15' },
    { actor: marcus, name: 'Charles Montgomery', time: '20:18' },
    { actor: julia, name: 'Patricia Donovan', time: '20:20' },
    { actor: marcus, name: 'Elizabeth Waverly', time: '20:22' },
    { actor: julia, name: 'Philip Wainwright', time: '20:25' },
  ];

  for (const c of checkins) {
    await insertAuditLog({
      actor: c.actor,
      action: 'checkin.guest',
      entityType: 'event_checkin',
      newValue: { guest_name: c.name, status: 'checked_in' },
      createdAt: makeTimestamp('2026-04-17', c.time),
    });
  }

  // Walk-ins
  await insertAuditLog({
    actor: marcus,
    action: 'checkin.walkin',
    entityType: 'event_checkin',
    newValue: { guest_name: 'Yuki Tanaka', source: 'walk-in' },
    createdAt: makeTimestamp('2026-04-17', '20:35'),
  });

  await insertAuditLog({
    actor: julia,
    action: 'checkin.walkin',
    entityType: 'event_checkin',
    newValue: { guest_name: 'Gregory Mansfield', source: 'walk-in' },
    createdAt: makeTimestamp('2026-04-17', '20:40'),
  });

  await insertAuditLog({
    actor: marcus,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Yuki Tanaka', note_preview: 'Came with Charles Montgomery, interested in Fund IV co-investment' },
    createdAt: makeTimestamp('2026-04-17', '20:50'),
  });

  // ── Post-event: April 18 ───────────────────────────────────────────────

  await insertAuditLog({
    actor: sarah,
    action: 'followup.created',
    entityType: 'follow_up_sequence',
    newValue: { description: 'Sent follow-up email to 14 attendees', count: 14 },
    createdAt: makeTimestamp('2026-04-18', '10:00'),
  });

  await insertAgentActivity(
    'follow_up',
    'Generated post-event summary',
    'Compiled post-event analytics: 10 of 12 invited guests attended (83% rate), 2 walk-ins registered. Key follow-up opportunities identified for Charles Montgomery and Eleanor Blackwood.',
    makeTimestamp('2026-04-18', '10:30'),
  );

  await insertAuditLog({
    actor: sarah,
    action: 'followup.updated',
    entityType: 'follow_up_sequence',
    previousValue: { status: 'SENT' },
    newValue: { status: 'MEETING_BOOKED', contact_name: 'Charles Montgomery' },
    createdAt: makeTimestamp('2026-04-18', '15:00'),
  });

  console.log('Done! Seed data inserted successfully.');
  console.log(`Inserted entries for event ${EVENT_ID} in workspace ${WORKSPACE_ID}.`);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});

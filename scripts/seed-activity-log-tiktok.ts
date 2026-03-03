/**
 * Seed Activity Log — TikTok Global Creator Summit 2026 (Event 96)
 *
 * Inserts realistic audit_log + agent_activity_log entries spanning
 * event planning through post-event follow-up.
 *
 * Run: npx tsx scripts/seed-activity-log-tiktok.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const EVENT_ID = '96';
const EVENT_ID_INT = 96;
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

// Event date: June 12, 2026 — timeline works backward from there

// ─── Actor Lookup ──────────────────────────────────────────────────────────

interface ActorInfo {
  id: string | null;
  email: string;
  name: string;
}

async function lookupActors(): Promise<{
  sarah: ActorInfo;
  jake: ActorInfo;
  priya: ActorInfo;
  tonje: ActorInfo;
  system: ActorInfo;
}> {
  const users = await sql`
    SELECT u.id, u.email, u.full_name
    FROM users u
    JOIN workspace_members wm ON wm.user_id = u.id
    WHERE wm.workspace_id = ${WORKSPACE_ID}::uuid
    ORDER BY u.full_name
  `.catch(() => []);

  function findUser(nameFragment: string, fallbackEmail: string): ActorInfo {
    const match = users.find((u: any) =>
      u.full_name?.toLowerCase().includes(nameFragment.toLowerCase()) ||
      u.email?.toLowerCase().includes(nameFragment.toLowerCase())
    );
    if (match) return { id: match.id, email: match.email, name: match.full_name || nameFragment };
    return { id: null, email: fallbackEmail, name: nameFragment };
  }

  return {
    sarah: findUser('Sarah Kim', 'sarah.kim@tiktok.com'),
    jake: findUser('Jake Rivera', 'jake.rivera@tiktok.com'),
    priya: findUser('Priya Nair', 'priya.nair@tiktok.com'),
    tonje: findUser('tonje', 'tonje@trymuse.com'),
    system: { id: null, email: 'system', name: 'System' },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function ts(date: string, time: string): string {
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

async function insertAudit(entry: AuditEntry) {
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

async function insertAgent(
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
      ${EVENT_ID_INT}::int,
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
  const { sarah, jake, priya, tonje, system } = await lookupActors();
  console.log(`  Sarah Kim: ${sarah.id || 'fallback'}`);
  console.log(`  Jake Rivera: ${jake.id || 'fallback'}`);
  console.log(`  Priya Nair: ${priya.id || 'fallback'}`);
  console.log(`  Tonje: ${tonje.id || 'fallback'}`);

  // Clean previous seed data for this event
  console.log('Clearing previous activity log data for event 96...');
  await sql`
    DELETE FROM audit_logs
    WHERE metadata->>'event_id' = ${EVENT_ID}
      AND workspace_id = ${WORKSPACE_ID}::uuid
  `.catch(() => {});

  await sql`
    DELETE FROM agent_activity_log
    WHERE event_id = ${EVENT_ID_INT}::int
      AND workspace_id = ${WORKSPACE_ID}::uuid
  `.catch(() => {});

  console.log('Inserting activity log entries...\n');

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 1: Event Creation & Setup — May 15-16 (4 weeks before)
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 1: Event creation & setup...');

  await insertAudit({
    actor: sarah,
    action: 'event.created',
    entityType: 'event',
    newValue: { event_title: 'TikTok Global Creator Summit 2026', venue: 'The Glasshouse, New York' },
    createdAt: ts('2026-05-15', '10:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'event.capacity_updated',
    entityType: 'event',
    previousValue: { total_capacity: 0 },
    newValue: { total_capacity: 120 },
    createdAt: ts('2026-05-15', '10:20'),
  });

  await insertAudit({
    actor: sarah,
    action: 'event.details_updated',
    entityType: 'event',
    newValue: { field: 'description', description: 'Added event description, sponsors (TikTok, Moots), and co-hosts' },
    createdAt: ts('2026-05-15', '10:45'),
  });

  await insertAudit({
    actor: sarah,
    action: 'event.details_updated',
    entityType: 'event',
    newValue: { field: 'seating_format', seating_format: 'SEATED', tables_count: 8 },
    metadata: { tables_config: '8 tables × 10 seats' },
    createdAt: ts('2026-05-15', '11:00'),
  });

  // Context tab — event documents & links
  await insertAudit({
    actor: jake,
    action: 'context.document_uploaded',
    entityType: 'event_document',
    newValue: { filename: 'TikTok_Creator_Summit_RunOfShow.pdf', size_kb: 340 },
    createdAt: ts('2026-05-15', '14:00'),
  });

  await insertAudit({
    actor: jake,
    action: 'context.document_uploaded',
    entityType: 'event_document',
    newValue: { filename: 'Venue_FloorPlan_Glasshouse.pdf', size_kb: 1200 },
    createdAt: ts('2026-05-15', '14:15'),
  });

  await insertAudit({
    actor: jake,
    action: 'context.link_added',
    entityType: 'event_link',
    newValue: { url: 'https://tiktok.com/creator-summit-2026', label: 'Public landing page' },
    createdAt: ts('2026-05-15', '14:30'),
  });

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 2: Targeting & Guest Curation — May 16-20 (3-4 weeks before)
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 2: Targeting & guest curation...');

  const criteria = [
    { name: 'Creator economy leaders with 1M+ audience reach and brand deal experience', weight: 40 },
    { name: 'Brand/agency decision-makers with $5M+ annual influencer marketing spend', weight: 35 },
    { name: 'Platform executives and VC investors shaping the creator ecosystem', weight: 25 },
  ];

  for (let i = 0; i < criteria.length; i++) {
    await insertAudit({
      actor: sarah,
      action: 'targeting.created',
      entityType: 'event_objective',
      newValue: { criterion_name: criteria[i].name, weight: criteria[i].weight },
      createdAt: ts('2026-05-16', `09:${15 + i * 10}`),
    });
  }

  await insertAudit({
    actor: priya,
    action: 'guest.imported',
    entityType: 'contact',
    newValue: { description: 'Imported creator and influencer contacts from TikTok partnerships CRM', count: 85 },
    metadata: { source: 'csv_import' },
    createdAt: ts('2026-05-16', '11:00'),
  });

  await insertAudit({
    actor: jake,
    action: 'guest.imported',
    entityType: 'contact',
    newValue: { description: 'Imported brand and agency executive contacts', count: 64 },
    metadata: { source: 'csv_import' },
    createdAt: ts('2026-05-16', '13:00'),
  });

  await insertAudit({
    actor: priya,
    action: 'guest.imported',
    entityType: 'contact',
    newValue: { description: 'Imported VC and media contacts from Notion database', count: 42 },
    metadata: { source: 'notion_import' },
    createdAt: ts('2026-05-16', '15:00'),
  });

  // AI enrichment
  await insertAgent(
    'enrichment',
    'Enriched 191 contacts with public profile data',
    'Processed 191 contacts through enrichment pipeline. Found LinkedIn profiles for 178 (93%), updated company/title for 52 contacts with stale data. Flagged 8 duplicates for manual review.',
    ts('2026-05-16', '16:00'),
    { contacts_enriched: 191, linkedin_found: 178, duplicates_flagged: 8 },
  );

  // AI scoring
  await insertAgent(
    'scoring',
    'Scored 191 contacts against 3 targeting criteria',
    'Completed AI scoring for all 191 contacts. Average score: 58/100. Top performers: Charli D\'Amelio (96), Khaby Lame (94), Vanessa Pappas (93), Marc Pritchard (91), Li Jin (90). 35 contacts scored above 75 (qualified tier).',
    ts('2026-05-17', '09:00'),
    { total_scored: 191, avg_score: 58, above_75: 35, top_score: 96 },
  );

  await insertAudit({
    actor: sarah,
    action: 'guest.moved',
    entityType: 'contact',
    newValue: { description: 'Moved 35 top-scoring contacts to qualified pipeline', count: 35 },
    createdAt: ts('2026-05-17', '10:30'),
  });

  // Manual review and curation
  await insertAudit({
    actor: sarah,
    action: 'guest.moved',
    entityType: 'contact',
    newValue: { description: 'Promoted 8 additional contacts from review queue (industry balance)', count: 8 },
    createdAt: ts('2026-05-18', '09:00'),
  });

  await insertAudit({
    actor: priya,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Evan Spiegel', note_preview: 'Confirmed via TikTok BD team — Evan is interested but needs personal invite from Vanessa' },
    createdAt: ts('2026-05-18', '11:30'),
  });

  await insertAudit({
    actor: jake,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'David Droga', note_preview: 'David prefers smaller group settings — seat him at the VIP table, not the main stage area' },
    createdAt: ts('2026-05-18', '14:00'),
  });

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3: Invitation Campaigns — May 20-28 (2-3 weeks before)
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 3: Invitation campaigns...');

  await insertAudit({
    actor: sarah,
    action: 'campaign.created',
    entityType: 'invitation_campaign',
    newValue: { name: 'VIP Creator Table', recipient_count: 15, tier: 'VIP' },
    createdAt: ts('2026-05-20', '10:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'invitation.sent',
    entityType: 'campaign_invitation',
    newValue: { campaign_name: 'VIP Creator Table', count: 15 },
    createdAt: ts('2026-05-20', '10:30'),
  });

  // VIP responses (fast — these are the high-priority creators)
  const vipResponses = [
    { name: 'Charli D\'Amelio', response: 'accepted', date: '2026-05-20', time: '12:15' },
    { name: 'Khaby Lame', response: 'accepted', date: '2026-05-20', time: '14:40' },
    { name: 'Tabitha Brown', response: 'accepted', date: '2026-05-20', time: '16:00' },
    { name: 'Addison Rae', response: 'accepted', date: '2026-05-21', time: '09:20' },
    { name: 'MrBeast Donaldson', response: 'accepted', date: '2026-05-21', time: '11:00' },
    { name: 'Vanessa Pappas', response: 'accepted', date: '2026-05-21', time: '13:30' },
    { name: 'Li Jin', response: 'accepted', date: '2026-05-21', time: '15:00' },
    { name: 'Bella Poarch', response: 'declined', date: '2026-05-21', time: '17:00' },
    { name: 'Zach King', response: 'accepted', date: '2026-05-22', time: '10:10' },
    { name: 'Evan Spiegel', response: 'accepted', date: '2026-05-22', time: '14:30' },
    { name: 'Alix Earle', response: 'accepted', date: '2026-05-22', time: '16:45' },
    { name: 'Hank Green', response: 'accepted', date: '2026-05-23', time: '08:30' },
    { name: 'Noah Beck', response: 'tentative', date: '2026-05-23', time: '11:00' },
  ];

  for (const r of vipResponses) {
    await insertAudit({
      actor: system,
      action: 'invitation.response',
      entityType: 'campaign_invitation',
      newValue: { guest_name: r.name, response: r.response, campaign: 'VIP Creator Table' },
      createdAt: ts(r.date, r.time),
    });
  }

  // Second wave — Industry Leaders
  await insertAudit({
    actor: sarah,
    action: 'campaign.created',
    entityType: 'invitation_campaign',
    newValue: { name: 'Industry Leaders', recipient_count: 20, tier: 'PRIORITY' },
    createdAt: ts('2026-05-23', '10:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'invitation.sent',
    entityType: 'campaign_invitation',
    newValue: { campaign_name: 'Industry Leaders', count: 20 },
    createdAt: ts('2026-05-23', '10:30'),
  });

  const industryResponses = [
    { name: 'Marc Pritchard', response: 'accepted', date: '2026-05-23', time: '14:00' },
    { name: 'Asmita Dubey', response: 'accepted', date: '2026-05-23', time: '16:30' },
    { name: 'David Droga', response: 'accepted', date: '2026-05-24', time: '09:15' },
    { name: 'Andrew Chen', response: 'accepted', date: '2026-05-24', time: '11:00' },
    { name: 'Blake Chandlee', response: 'accepted', date: '2026-05-24', time: '13:45' },
    { name: 'Rebecca Waring', response: 'accepted', date: '2026-05-24', time: '15:30' },
    { name: 'Carolyn Everson', response: 'accepted', date: '2026-05-25', time: '10:00' },
    { name: 'Josh Constine', response: 'accepted', date: '2026-05-25', time: '11:30' },
    { name: 'Taylor Lorenz', response: 'accepted', date: '2026-05-25', time: '14:00' },
    { name: 'Sofia Hernandez', response: 'accepted', date: '2026-05-25', time: '16:00' },
    { name: 'Willem Dinger', response: 'declined', date: '2026-05-26', time: '09:00' },
    { name: 'Nisha Dua', response: 'accepted', date: '2026-05-26', time: '10:30' },
    { name: 'Raj Sarkar', response: 'accepted', date: '2026-05-26', time: '14:00' },
    { name: 'Adam Mosseri', response: 'declined', date: '2026-05-27', time: '11:00' },
    { name: 'Jason Stein', response: 'accepted', date: '2026-05-27', time: '13:00' },
    { name: 'Sujay Jaswa', response: 'accepted', date: '2026-05-27', time: '15:30' },
  ];

  for (const r of industryResponses) {
    await insertAudit({
      actor: system,
      action: 'invitation.response',
      entityType: 'campaign_invitation',
      newValue: { guest_name: r.name, response: r.response, campaign: 'Industry Leaders' },
      createdAt: ts(r.date, r.time),
    });
  }

  // Re-score after responses
  await insertAgent(
    'scoring',
    'Re-scored 28 confirmed attendees with updated context',
    'Updated relevance scores incorporating RSVP confirmations, latest LinkedIn activity, and recent brand partnership announcements. Notable score changes: Carolyn Everson +12 (new Nike campaign), Josh Constine +8 (published creator economy report).',
    ts('2026-05-28', '09:00'),
    { rescored: 28, avg_change: 4.2 },
  );

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 4: Team Assignments & Prep — June 2-8 (1-2 weeks before)
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 4: Team assignments & prep...');

  await insertAudit({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { description: 'VIP creators and platform execs', assigned_to: 'Sarah Kim', count: 10 },
    createdAt: ts('2026-06-02', '09:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { description: 'Brand and agency leaders', assigned_to: 'Jake Rivera', count: 9 },
    createdAt: ts('2026-06-02', '09:15'),
  });

  await insertAudit({
    actor: sarah,
    action: 'team.assigned',
    entityType: 'guest_team_assignment',
    newValue: { description: 'VC investors and media', assigned_to: 'Priya Nair', count: 9 },
    createdAt: ts('2026-06-02', '09:30'),
  });

  // AI seating suggestions
  await insertAgent(
    'seating',
    'Generated seating arrangement for 28 confirmed guests across 4 tables',
    'Optimized seating for cross-pollination between creators, brand execs, and investors. Kept TikTok execs distributed across tables for maximum networking. Separated competing brands (Nike/Adidas, L\'Oreal/P&G) per host preferences. VIP Table 1: Charli D\'Amelio, Marc Pritchard, Li Jin, Vanessa Pappas + 4 others.',
    ts('2026-06-03', '10:00'),
    { tables_used: 4, guests_seated: 28, conflicts_resolved: 3 },
  );

  await insertAudit({
    actor: sarah,
    action: 'seating.manual_override',
    entityType: 'seating_assignment',
    previousValue: { contact_name: 'David Droga', table: 3 },
    newValue: { contact_name: 'David Droga', table: 1, reason: 'Host preference — wants smaller VIP table' },
    createdAt: ts('2026-06-03', '11:00'),
  });

  await insertAudit({
    actor: jake,
    action: 'seating.manual_override',
    entityType: 'seating_assignment',
    previousValue: { contact_name: 'Evan Spiegel', table: 1 },
    newValue: { contact_name: 'Evan Spiegel', table: 2, reason: 'Separate from TikTok C-suite for comfort' },
    createdAt: ts('2026-06-03', '11:30'),
  });

  // AI briefings
  await insertAgent(
    'briefing',
    'Generated pre-event briefing for Sarah Kim (10 guests)',
    'Compiled dossier-style briefings for 10 assigned guests including talking points, mutual connections, recent activity highlights, and strategic conversation starters. Key focus: Charli D\'Amelio (potential brand ambassador), Vanessa Pappas (platform roadmap insights), Marc Pritchard (P&G TikTok budget).',
    ts('2026-06-05', '08:00'),
    { guest_count: 10, talking_points: 32 },
  );

  await insertAgent(
    'briefing',
    'Generated pre-event briefing for Jake Rivera (9 guests)',
    'Compiled briefing for 9 brand/agency guests. Highlighted: David Droga recently merged Accenture Interactive into Accenture Song — potential for creator economy pivot. Carolyn Everson leading Nike\'s first TikTok-native campaign. Rebecca Waring\'s WPP team evaluating creator platforms for 2027 media plans.',
    ts('2026-06-05', '08:05'),
    { guest_count: 9, talking_points: 27 },
  );

  await insertAgent(
    'briefing',
    'Generated pre-event briefing for Priya Nair (9 guests)',
    'Compiled briefing for 9 VC/media guests. Key intel: Li Jin\'s Variant Fund closing new creator tools fund ($150M). Andrew Chen publishing creator economy thesis — wants data from summit. Taylor Lorenz preparing feature piece on TikTok\'s enterprise pivot. Josh Constine\'s SignalFire actively deploying in creator infra.',
    ts('2026-06-05', '08:10'),
    { guest_count: 9, talking_points: 28 },
  );

  await insertAudit({
    actor: jake,
    action: 'briefing.viewed',
    entityType: 'briefing_packet',
    newValue: { briefing_type: 'Pre-Event', viewer: 'Jake Rivera' },
    createdAt: ts('2026-06-08', '09:00'),
  });

  await insertAudit({
    actor: priya,
    action: 'briefing.viewed',
    entityType: 'briefing_packet',
    newValue: { briefing_type: 'Pre-Event', viewer: 'Priya Nair' },
    createdAt: ts('2026-06-08', '10:30'),
  });

  // Introduction pairings
  await insertAgent(
    'introduction',
    'Generated 12 strategic introduction pairings',
    'Identified 12 high-value introductions: (1) Charli D\'Amelio ↔ Marc Pritchard — P&G exploring creator-led campaigns, (2) Li Jin ↔ Raj Sarkar — Patreon monetization aligns with Variant thesis, (3) Hank Green ↔ Andrew Chen — educational creator economy model, (4) Khaby Lame ↔ Carolyn Everson — Nike global creator program. Each pairing includes mutual interest rationale and ice-breaker topics.',
    ts('2026-06-08', '14:00'),
    { pairings_created: 12, avg_relevance: 87 },
  );

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 5: Day-of Operations — June 11-12
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 5: Event day...');

  // Morning-of briefing
  await insertAgent(
    'briefing',
    'Generated morning-of briefing with real-time updates',
    'Updated briefings with same-day intel: Charli D\'Amelio posted about the summit to 155M followers (trending), MrBeast arriving 30min late (flight delay), Taylor Lorenz confirmed she\'ll be live-tweeting. Weather: Clear, 72°F — rooftop reception is a go.',
    ts('2026-06-12', '08:00'),
    { updates: 6, social_mentions: 14 },
  );

  await insertAudit({
    actor: sarah,
    action: 'briefing.viewed',
    entityType: 'briefing_packet',
    newValue: { briefing_type: 'Morning-of', viewer: 'Sarah Kim' },
    createdAt: ts('2026-06-12', '08:30'),
  });

  // Check-ins (event starts at 6pm)
  const checkins = [
    { actor: jake, name: 'Marc Pritchard', time: '17:45', method: 'QR scan' },
    { actor: jake, name: 'Carolyn Everson', time: '17:48', method: 'QR scan' },
    { actor: priya, name: 'Li Jin', time: '17:50', method: 'QR scan' },
    { actor: priya, name: 'Andrew Chen', time: '17:52', method: 'QR scan' },
    { actor: jake, name: 'David Droga', time: '17:55', method: 'manual' },
    { actor: jake, name: 'Rebecca Waring', time: '17:58', method: 'QR scan' },
    { actor: priya, name: 'Josh Constine', time: '18:00', method: 'QR scan' },
    { actor: sarah, name: 'Charli D\'Amelio', time: '18:02', method: 'VIP escort' },
    { actor: sarah, name: 'Khaby Lame', time: '18:03', method: 'VIP escort' },
    { actor: jake, name: 'Asmita Dubey', time: '18:05', method: 'QR scan' },
    { actor: priya, name: 'Taylor Lorenz', time: '18:07', method: 'QR scan' },
    { actor: sarah, name: 'Vanessa Pappas', time: '18:08', method: 'QR scan' },
    { actor: jake, name: 'Jason Stein', time: '18:10', method: 'QR scan' },
    { actor: sarah, name: 'Addison Rae', time: '18:12', method: 'VIP escort' },
    { actor: priya, name: 'Nisha Dua', time: '18:14', method: 'QR scan' },
    { actor: sarah, name: 'Tabitha Brown', time: '18:15', method: 'QR scan' },
    { actor: jake, name: 'Blake Chandlee', time: '18:18', method: 'QR scan' },
    { actor: priya, name: 'Hank Green', time: '18:20', method: 'QR scan' },
    { actor: sarah, name: 'Zach King', time: '18:22', method: 'QR scan' },
    { actor: jake, name: 'Sofia Hernandez', time: '18:25', method: 'QR scan' },
    { actor: priya, name: 'Sujay Jaswa', time: '18:28', method: 'QR scan' },
    { actor: sarah, name: 'Alix Earle', time: '18:30', method: 'QR scan' },
    { actor: priya, name: 'Raj Sarkar', time: '18:32', method: 'QR scan' },
    { actor: sarah, name: 'Evan Spiegel', time: '18:35', method: 'personal greeting' },
    { actor: jake, name: 'Karen Costello', time: '18:38', method: 'QR scan' },
    { actor: sarah, name: 'MrBeast Donaldson', time: '18:45', method: 'VIP escort' },
    { actor: jake, name: 'Spencer Knight', time: '18:48', method: 'QR scan' },
  ];

  for (const c of checkins) {
    await insertAudit({
      actor: c.actor,
      action: 'checkin.guest',
      entityType: 'event_checkin',
      newValue: { guest_name: c.name, status: 'checked_in', method: c.method },
      createdAt: ts('2026-06-12', c.time),
    });
  }

  // Walk-ins
  const walkins = [
    { actor: jake, name: 'Liza Koshy', company: 'Self / YouTube', note: 'Came with Charli, major creator (60M+ followers)', time: '18:40' },
    { actor: priya, name: 'Casey Neistat', company: '368 / YouTube', note: 'Invited last minute by Hank Green, legendary creator', time: '18:55' },
    { actor: jake, name: 'Gary Vaynerchuk', company: 'VaynerMedia', note: 'Heard about event from Jason Stein, wants to discuss TikTok strategy for VaynerMedia clients', time: '19:10' },
  ];

  for (const w of walkins) {
    await insertAudit({
      actor: w.actor,
      action: 'checkin.walkin',
      entityType: 'event_checkin',
      newValue: { guest_name: w.name, company: w.company, source: 'walk-in' },
      createdAt: ts('2026-06-12', w.time),
    });
  }

  // Live notes during event
  await insertAudit({
    actor: sarah,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Charli D\'Amelio', note_preview: 'Very interested in P&G brand ambassador role — connected her with Marc directly at Table 1' },
    createdAt: ts('2026-06-12', '19:30'),
  });

  await insertAudit({
    actor: priya,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Li Jin', note_preview: 'Variant Fund wants to partner with TikTok on creator tools accelerator — scheduling follow-up with Blake' },
    createdAt: ts('2026-06-12', '19:45'),
  });

  await insertAudit({
    actor: jake,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Gary Vaynerchuk', note_preview: 'Walk-in but incredibly valuable — pitched VaynerMedia as TikTok\'s agency of record for SMB creators' },
    createdAt: ts('2026-06-12', '20:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'note.added',
    entityType: 'contact_note',
    newValue: { contact_name: 'Taylor Lorenz', note_preview: 'Writing a positive feature — shared key stats on creator monetization. Article likely next week' },
    createdAt: ts('2026-06-12', '20:30'),
  });

  // AI observation during event
  await insertAgent(
    'observation',
    'Event momentum update: 27 of 28 invited guests checked in (96%)',
    'Exceptional attendance rate. Only Noah Beck (tentative) has not arrived. 3 high-value walk-ins registered. Social media buzz: 47 posts/stories mentioning the summit, 2.3M combined impressions so far. TikTok hashtag #CreatorSummit2026 trending in NYC.',
    ts('2026-06-12', '19:00'),
    { attendance_rate: 0.96, walkins: 3, social_mentions: 47, impressions: 2300000 },
  );

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 6: Post-Event — June 13-15
  // ════════════════════════════════════════════════════════════════════════

  console.log('  Phase 6: Post-event follow-up...');

  await insertAgent(
    'follow_up',
    'Generated post-event summary and follow-up recommendations',
    'Event summary: 30 total attendees (27 invited + 3 walk-ins), 96% invited attendance rate. Top networking moments: Charli × Marc Pritchard (brand deal), Li Jin × Blake Chandlee (VC partnership), Casey Neistat × Vanessa Pappas (platform feature). Recommended 8 priority follow-ups within 48 hours, 15 standard follow-ups within 1 week.',
    ts('2026-06-13', '08:00'),
    { total_attendees: 30, priority_followups: 8, standard_followups: 15 },
  );

  await insertAudit({
    actor: sarah,
    action: 'followup.created',
    entityType: 'follow_up_sequence',
    newValue: { description: 'Sent personalized thank-you emails to all 30 attendees', count: 30 },
    createdAt: ts('2026-06-13', '10:00'),
  });

  await insertAudit({
    actor: sarah,
    action: 'followup.created',
    entityType: 'follow_up_sequence',
    newValue: { description: 'Priority follow-up: Charli D\'Amelio × P&G partnership intro', type: 'meeting_request' },
    createdAt: ts('2026-06-13', '10:30'),
  });

  await insertAudit({
    actor: priya,
    action: 'followup.created',
    entityType: 'follow_up_sequence',
    newValue: { description: 'Priority follow-up: Li Jin × Blake Chandlee creator tools discussion', type: 'meeting_request' },
    createdAt: ts('2026-06-13', '11:00'),
  });

  await insertAudit({
    actor: jake,
    action: 'followup.created',
    entityType: 'follow_up_sequence',
    newValue: { description: 'Priority follow-up: Gary Vaynerchuk — VaynerMedia agency partnership proposal', type: 'meeting_request' },
    createdAt: ts('2026-06-13', '11:30'),
  });

  // Follow-up outcomes
  await insertAudit({
    actor: sarah,
    action: 'followup.updated',
    entityType: 'follow_up_sequence',
    previousValue: { status: 'SENT' },
    newValue: { status: 'MEETING_BOOKED', contact_name: 'Charli D\'Amelio', meeting_date: '2026-06-18' },
    createdAt: ts('2026-06-13', '16:00'),
  });

  await insertAudit({
    actor: priya,
    action: 'followup.updated',
    entityType: 'follow_up_sequence',
    previousValue: { status: 'SENT' },
    newValue: { status: 'MEETING_BOOKED', contact_name: 'Andrew Chen', meeting_date: '2026-06-19' },
    createdAt: ts('2026-06-14', '09:30'),
  });

  await insertAudit({
    actor: jake,
    action: 'followup.updated',
    entityType: 'follow_up_sequence',
    previousValue: { status: 'SENT' },
    newValue: { status: 'MEETING_BOOKED', contact_name: 'Gary Vaynerchuk', meeting_date: '2026-06-17' },
    createdAt: ts('2026-06-14', '11:00'),
  });

  await insertAgent(
    'observation',
    'Post-event ROI tracking: 3 meetings booked, $2.4M pipeline attributed',
    'Within 48 hours of the summit: 3 strategic meetings booked (Charli/P&G, Li Jin/TikTok, VaynerMedia partnership). Taylor Lorenz article published — 89K views, positive sentiment. Creator Summit hashtag reached 12M total impressions. Estimated pipeline value from new connections: $2.4M.',
    ts('2026-06-15', '09:00'),
    { meetings_booked: 3, pipeline_value: 2400000, article_views: 89000, total_impressions: 12000000 },
  );

  console.log('\nDone! Seed data inserted for TikTok Creator Summit (event 96).');
  console.log(`  Workspace: ${WORKSPACE_ID}`);
  console.log(`  Event ID: ${EVENT_ID}`);
}

main().catch((err) => {
  console.error('Seed script failed:', err);
  process.exit(1);
});

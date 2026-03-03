/**
 * Seed script: TikTok Global Creator Summit 2026
 *
 * Creates a realistic TikTok-themed demo dataset:
 * - 1 event: "TikTok Global Creator Summit 2026"
 * - 35 contacts (creators, brand execs, platform execs, media/VC)
 * - 3 targeting criteria
 * - Guest scores for all 35 contacts
 * - 2 invitation campaigns (VIP Table + Industry Leaders)
 * - 8 check-ins
 * - 3 follow-up sequences
 * - 3 briefing packets
 *
 * Usage: npx tsx scripts/seed-tiktok-summit.ts
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

// ─── Helpers ────────────────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID();
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Contact Data ───────────────────────────────────────────────────

const CONTACTS = [
  // Top Creators / Influencers (10)
  { first: 'Charli', last: 'D\'Amelio', company: 'D\'Amelio Brands', title: 'Co-Founder & Creator', industry: 'Creator Economy', seniority: 'CEO', tags: ['Creator', 'Fashion', 'VIP'] },
  { first: 'Khaby', last: 'Lame', company: 'Khaby Studios', title: 'Creator & Entrepreneur', industry: 'Creator Economy', seniority: 'CEO', tags: ['Creator', 'Comedy', 'VIP'] },
  { first: 'Addison', last: 'Rae', company: 'Item Beauty', title: 'Founder & Creator', industry: 'Beauty', seniority: 'CEO', tags: ['Creator', 'Beauty', 'VIP'] },
  { first: 'MrBeast', last: 'Donaldson', company: 'MrBeast LLC', title: 'Founder & Creator', industry: 'Entertainment', seniority: 'CEO', tags: ['Creator', 'Philanthropy', 'VIP'] },
  { first: 'Bella', last: 'Poarch', company: 'Poarch Media', title: 'Creator & Recording Artist', industry: 'Music', seniority: 'CEO', tags: ['Creator', 'Music'] },
  { first: 'Zach', last: 'King', company: 'King Studio', title: 'Filmmaker & Creator', industry: 'Digital Media', seniority: 'CEO', tags: ['Creator', 'Visual Effects'] },
  { first: 'Alix', last: 'Earle', company: 'Earle Enterprises', title: 'Content Creator & Brand Partner', industry: 'Lifestyle', seniority: 'CEO', tags: ['Creator', 'Lifestyle'] },
  { first: 'Spencer', last: 'Knight', company: 'SpencerX Music', title: 'Beatboxer & Creator', industry: 'Music', seniority: 'CEO', tags: ['Creator', 'Music'] },
  { first: 'Tabitha', last: 'Brown', company: 'Tab Time LLC', title: 'Creator & Author', industry: 'Food & Wellness', seniority: 'CEO', tags: ['Creator', 'Food', 'VIP'] },
  { first: 'Noah', last: 'Beck', company: 'Beck Media', title: 'Creator & Model', industry: 'Fashion', seniority: 'CEO', tags: ['Creator', 'Fashion'] },

  // Brand / Agency Executives (10)
  { first: 'Carolyn', last: 'Everson', company: 'Nike', title: 'VP Global Digital Marketing', industry: 'Sportswear', seniority: 'VP', tags: ['Brand', 'Digital Marketing'] },
  { first: 'Asmita', last: 'Dubey', company: 'L\'Oreal', title: 'Chief Digital & Marketing Officer', industry: 'Beauty', seniority: 'C-Suite', tags: ['Brand', 'Beauty', 'VIP'] },
  { first: 'Willem', last: 'Dinger', company: 'Unilever', title: 'Global VP Media & Digital', industry: 'CPG', seniority: 'VP', tags: ['Brand', 'CPG'] },
  { first: 'Rebecca', last: 'Waring', company: 'WPP', title: 'Global Head of Influencer', industry: 'Advertising', seniority: 'C-Suite', tags: ['Agency', 'Influencer Marketing'] },
  { first: 'Marc', last: 'Pritchard', company: 'Procter & Gamble', title: 'Chief Brand Officer', industry: 'CPG', seniority: 'C-Suite', tags: ['Brand', 'CPG', 'VIP'] },
  { first: 'Jason', last: 'Stein', company: 'Laundry Service / Cycle', title: 'Founder & CEO', industry: 'Social Agency', seniority: 'CEO', tags: ['Agency', 'Social Media'] },
  { first: 'Tamara', last: 'Littleton', company: 'The Social Element', title: 'CEO', industry: 'Social Agency', seniority: 'CEO', tags: ['Agency', 'Social Media'] },
  { first: 'David', last: 'Droga', company: 'Accenture Song', title: 'CEO & Creative Chairman', industry: 'Advertising', seniority: 'CEO', tags: ['Agency', 'Creative', 'VIP'] },
  { first: 'Nisha', last: 'Dua', company: 'BBG Ventures', title: 'Managing Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Creator Economy'] },
  { first: 'Karen', last: 'Costello', company: 'Deutsch LA', title: 'Chief Creative Officer', industry: 'Advertising', seniority: 'C-Suite', tags: ['Agency', 'Creative'] },

  // Platform / Tech Executives (8)
  { first: 'Vanessa', last: 'Pappas', company: 'TikTok', title: 'COO', industry: 'Social Media', seniority: 'C-Suite', tags: ['Platform', 'TikTok', 'VIP'] },
  { first: 'Adam', last: 'Mosseri', company: 'Instagram', title: 'Head of Instagram', industry: 'Social Media', seniority: 'C-Suite', tags: ['Platform', 'Meta'] },
  { first: 'Amjad', last: 'Hanif', company: 'YouTube', title: 'VP Product, Creator Ecosystem', industry: 'Video Platform', seniority: 'VP', tags: ['Platform', 'YouTube'] },
  { first: 'Evan', last: 'Spiegel', company: 'Snap Inc.', title: 'CEO', industry: 'Social Media', seniority: 'CEO', tags: ['Platform', 'Snap', 'VIP'] },
  { first: 'Blake', last: 'Chandlee', company: 'TikTok', title: 'President, Global Business Solutions', industry: 'Ad Tech', seniority: 'C-Suite', tags: ['Platform', 'TikTok', 'Advertising'] },
  { first: 'Liz', last: 'Plank', company: 'Substack', title: 'Head of Creator Partnerships', industry: 'Publishing', seniority: 'Director', tags: ['Platform', 'Publishing'] },
  { first: 'Raj', last: 'Sarkar', company: 'Patreon', title: 'CMO', industry: 'Creator Tools', seniority: 'C-Suite', tags: ['Platform', 'Monetization'] },
  { first: 'Sofia', last: 'Hernandez', company: 'TikTok', title: 'Head of Global Business Marketing', industry: 'Social Media', seniority: 'VP', tags: ['Platform', 'TikTok', 'Marketing'] },

  // Media / VC Investors in Creator Economy (7)
  { first: 'Li', last: 'Jin', company: 'Variant Fund', title: 'General Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Creator Economy', 'VIP'] },
  { first: 'Josh', last: 'Constine', company: 'SignalFire', title: 'Head of Content & Creator Economy Investor', industry: 'Venture Capital', seniority: 'VP', tags: ['VC', 'Media'] },
  { first: 'Taylor', last: 'Lorenz', company: 'The Washington Post', title: 'Technology Reporter', industry: 'Media', seniority: 'Senior', tags: ['Media', 'Creator Economy'] },
  { first: 'Hank', last: 'Green', company: 'Complexly / DFTBA', title: 'Co-Founder & Creator', industry: 'Creator Economy', seniority: 'CEO', tags: ['Creator', 'Education', 'Media'] },
  { first: 'Kaya', last: 'Yurieff', company: 'The Information', title: 'Senior Reporter, Creator Economy', industry: 'Media', seniority: 'Senior', tags: ['Media', 'Tech Journalism'] },
  { first: 'Andrew', last: 'Chen', company: 'Andreessen Horowitz', title: 'General Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Growth', 'Networks'] },
  { first: 'Sujay', last: 'Jaswa', company: 'WndrCo', title: 'Managing Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Media', 'Creator Economy'] },
];

// ─── Scoring Data ───────────────────────────────────────────────────

const OBJECTIVE_TEMPLATES = [
  {
    text: 'Creator economy leaders with 1M+ audience reach and brand deal experience',
    weight: 2.0,
    ai_interpretation: "I'll prioritize creators who have built significant followings (1M+ combined platform reach) and have demonstrated ability to execute brand partnerships. Creators with their own product lines or media companies score highest, as they represent the most sophisticated end of the creator economy.",
    ai_questions: [
      'Should reach be measured across all platforms or TikTok-specific?',
      'Weight brand deal revenue more heavily than follower count',
    ],
    qualifying_count: 14,
  },
  {
    text: 'Brand/agency decision-makers with $5M+ annual influencer marketing spend',
    weight: 1.5,
    ai_interpretation: "I'll focus on CMOs, VPs of Digital, and agency leads who control significant influencer marketing budgets ($5M+). Priority goes to decision-makers at Fortune 500 brands and top holding company agencies who are actively increasing their TikTok-specific spend.",
    ai_questions: [
      'Include agency holding company execs or only direct brand-side?',
      'Prioritize brands already spending on TikTok vs. those exploring the platform',
    ],
    qualifying_count: 10,
  },
  {
    text: 'Platform and technology executives shaping content monetization',
    weight: 1.8,
    ai_interpretation: "I'll target senior executives at social platforms (TikTok, YouTube, Instagram, Snap) and creator economy infrastructure companies (Patreon, Substack, etc.) who influence product decisions around creator monetization, ad revenue sharing, and content distribution algorithms.",
    ai_questions: [
      'Weight TikTok executives higher given the event theme',
      'Include creator economy VCs as they shape ecosystem direction',
    ],
    qualifying_count: 12,
  },
];

const TALKING_POINTS_POOL = [
  'Just closed a $50M brand partnership deal with three Fortune 500 companies — discuss deal structure trends',
  'Their platform just launched a new creator fund worth $1B — ask about eligibility and strategy',
  'Published viral thread on creator burnout and sustainable content strategies. Timely conversation',
  'Pioneered the "creator-to-CEO" model — built a $100M+ business from social media following',
  'Their agency manages $200M+ in influencer spend — strong opinions on ROI measurement',
  'Recently advocated for creator equity in platform revenue sharing. Passionate about the topic',
  'Led the brand\'s pivot from traditional media to 80% digital/influencer spend. Case study gold',
  'Their fund just invested $30M in creator tools and infrastructure. Active deal flow',
  'Known for contrarian views on short-form vs. long-form content monetization. Good debate material',
  'Built the platform\'s creator marketplace from scratch — understands both sides deeply',
  'Connected to 50+ top creators through personal relationships. Key network node',
  'Their reporting on the creator economy is widely cited — handle with diplomacy on off-record topics',
  'Launched a creator accelerator program that produced 10 creators with 5M+ followings',
  'Brokered the largest creator brand deal in history ($100M+). Industry reference point',
  'Champion of creator-first platform policies. Strong opinions on transparency and fair compensation',
];

const RATIONALE_TEMPLATES = [
  'Exceptional fit for the Creator Summit. {name} at {company} represents the pinnacle of the {industry} space with direct influence on creator economy trends and significant audience reach.',
  'Strong brand-side match. {name} leads digital/influencer strategy at {company}, controlling major influencer marketing budgets. Their participation signals brand commitment to the creator ecosystem.',
  'Key platform voice. {name} at {company} shapes the tools and policies that define how creators build and monetize. Their insights on platform economics are invaluable for the summit.',
  'Strategic investor perspective. {name} brings deep knowledge of creator economy business models from {company}. Their investment thesis and portfolio connections add unique value.',
  'Moderate alignment. {name} at {company} works in {industry}, which intersects with the creator economy. While not a direct creator or platform exec, their perspective on the broader digital media landscape is valuable.',
];

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding TikTok Creator Summit data...\n');

  // Step 0: Clean up previous seed runs
  console.log('0/10 — Cleaning up previous seed data...');
  const prevEvents = await sql`SELECT id FROM events WHERE title LIKE 'TikTok Global Creator Summit%'`;
  for (const ev of prevEvents) {
    await sql`DELETE FROM agent_activity_log WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM agent_conversations WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM override_log WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM guest_scores WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM event_objectives WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM event_join_requests WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM event_checkins WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM follow_up_sequences WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM briefing_packets WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM broadcast_messages WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM campaign_invitations WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM invitation_campaigns WHERE event_id = ${ev.id}`;
    await sql`DELETE FROM event_sponsors WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM introduction_pairings WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM guest_team_assignments WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM event_generated_context WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM event_activities WHERE event_id = ${ev.id}`.catch(() => {});
    await sql`DELETE FROM events WHERE id = ${ev.id}`;
    console.log(`   Deleted previous event #${ev.id}`);
  }
  // Clean up previously seeded contacts
  const prevContacts = await sql`SELECT COUNT(*) as c FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT'`;
  if (Number(prevContacts[0].c) > 0) {
    await sql`DELETE FROM guest_scores WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT')`;
    await sql`DELETE FROM follow_up_sequences WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT')`;
    await sql`DELETE FROM campaign_invitations WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT')`;
    await sql`DELETE FROM event_checkins WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT')`;
    await sql`DELETE FROM people_contacts WHERE source_detail = 'SEED_TIKTOK_SUMMIT'`;
    console.log(`   Deleted ${prevContacts[0].c} previous seed contacts and related records`);
  }

  // Step 1: Find existing workspace
  console.log('1/10 — Finding workspace...');

  let workspaceId: string;
  let userId: string;

  const existingWorkspaces = await sql`SELECT id, owner_id FROM workspaces LIMIT 1`;

  if (existingWorkspaces.length > 0) {
    workspaceId = existingWorkspaces[0].id;
    userId = existingWorkspaces[0].owner_id;
    console.log(`   Using existing workspace: ${workspaceId}`);
  } else {
    console.error('No workspace found. Run seed-pe-dinner.ts first to create a workspace.');
    process.exit(1);
  }

  // Step 1a: Rename owner user to Tonje Bakang
  await sql`UPDATE users SET full_name = 'Tonje Bakang' WHERE id = ${userId}`;
  console.log(`   Renamed workspace owner to Tonje Bakang`);

  // Step 1b: Create TikTok team members
  console.log('1b/13 — Creating TikTok team members...');

  const tiktokTeamMembers = [
    { name: 'Sarah Kim', email: 'sarah.kim@tiktok.com', role: 'ADMIN' },
    { name: 'Jake Rivera', email: 'jake.rivera@tiktok.com', role: 'TEAM_MEMBER' },
    { name: 'Priya Nair', email: 'priya.nair@tiktok.com', role: 'TEAM_MEMBER' },
    { name: 'Marcus Li', email: 'marcus.li@tiktok.com', role: 'EXTERNAL_PARTNER' },
  ];

  const teamMemberUserIds: string[] = [];

  for (const member of tiktokTeamMembers) {
    const memberId = uuid();
    await sql`
      INSERT INTO users (id, email, full_name, email_verified)
      VALUES (${memberId}, ${member.email}, ${member.name}, true)
      ON CONFLICT (email) DO NOTHING
    `;
    const mResult = await sql`SELECT id FROM users WHERE email = ${member.email}`;
    const actualUserId = mResult[0].id;
    teamMemberUserIds.push(actualUserId);
    await sql`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, accepted_at)
      VALUES (${uuid()}, ${workspaceId}, ${actualUserId}, ${member.role}::workspace_role, NOW())
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    `;
  }

  console.log(`   Created ${tiktokTeamMembers.length} TikTok team members`);

  // Step 2: Create the event
  console.log('2/10 — Creating event...');

  const eventResult = await sql`
    INSERT INTO events (
      title, location, start_date, end_date, timezone,
      is_private, approve_mode, status, workspace_id,
      total_capacity, seating_format, tables_config,
      hosts, sponsors,
      event_theme, success_criteria, key_stakeholders, additional_context,
      hosting_company, dress_code, description, event_goal
    ) VALUES (
      'TikTok Global Creator Summit 2026',
      ${JSON.stringify({
        venue_name: 'The Glasshouse',
        street_address: '660 12th Avenue',
        city: 'New York',
        state_province: 'NY',
        country: 'USA',
      })}::jsonb,
      '2026-06-12T22:00:00Z',
      '2026-06-13T01:00:00Z',
      'America/New_York',
      true,
      'MANUAL',
      'PUBLISHED',
      ${workspaceId},
      40,
      'SEATED',
      ${JSON.stringify({ tables: [
        { number: 1, seats: 10 },
        { number: 2, seats: 10 },
        { number: 3, seats: 10 },
        { number: 4, seats: 10 },
      ]})}::jsonb,
      ${JSON.stringify([
        { name: 'TikTok', url: 'https://tiktok.com' },
        { name: 'Moots', url: 'https://moots.app' },
      ])}::jsonb,
      ${JSON.stringify([
        { title: 'TikTok', subtitle: 'Presenting Partner', url: 'https://tiktok.com', logo_url: null, description: 'The leading destination for short-form mobile video.' },
        { title: 'Moots', subtitle: 'Event Partner', url: 'https://moots.app', logo_url: null, description: 'Curated event intelligence and guest management.' },
      ])}::jsonb,
      'The Future of the Creator Economy',
      'Connect top creators with brand decision-makers, surface partnership opportunities, and position our platform as the essential venue for creator economy leadership.',
      ${JSON.stringify([
        { name: 'Tonje Bakang', role: 'Founder & CEO, Moots — primary host' },
        { name: 'Elena Rodriguez', role: 'Creator partnerships lead' },
        { name: 'Blake Chandlee', role: 'TikTok business solutions — co-host' },
      ])}::jsonb,
      'This is a curated 40-person dinner connecting the most influential creators, brand executives, platform leaders, and investors shaping the creator economy. Format: cocktail reception followed by seated dinner with facilitated introductions.',
      'TikTok',
      'Creative Black Tie — elevated evening wear with a modern, expressive edge. Think fashion-forward: bold colors welcome, creator personality encouraged.',
      'An intimate summit bringing together 40 of the most influential voices in the creator economy — top TikTok creators, Fortune 500 brand executives, platform leaders, and creator economy investors — for an evening of strategic conversation, partnership-building, and curated introductions at The Glasshouse in New York City.',
      'Generate 10+ creator-brand partnership conversations, secure 3 co-hosting commitments for Q3/Q4 events, and establish Moots as the go-to intelligence platform for high-value creator economy gatherings.'
    )
    RETURNING id
  `;

  const eventId = eventResult[0].id;
  console.log(`   Created event #${eventId}: TikTok Global Creator Summit 2026`);

  // Step 3: Create 35 contacts
  console.log('3/10 — Creating 35 contacts...');

  const contactIds: string[] = [];

  const SOURCE_DISTRIBUTION = [
    ...Array(15).fill('MANUAL'),
    ...Array(10).fill('EVENT_IMPORT'),
    ...Array(5).fill('CSV_IMPORT'),
    ...Array(5).fill('RSVP_SUBMISSION'),
  ];

  for (let ci = 0; ci < CONTACTS.length; ci++) {
    const c = CONTACTS[ci];
    const contactId = uuid();
    contactIds.push(contactId);
    const email = `${c.first.toLowerCase().replace(/[^a-z]/g, '')}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '')}.com`;
    const contactSource = SOURCE_DISTRIBUTION[ci % SOURCE_DISTRIBUTION.length];

    await sql`
      INSERT INTO people_contacts (
        id, workspace_id, full_name, first_name, last_name,
        emails, company, title, role_seniority, industry,
        linkedin_url, tags, source, source_detail, enrichment_status,
        ai_summary
      ) VALUES (
        ${contactId}, ${workspaceId},
        ${c.first + ' ' + c.last}, ${c.first}, ${c.last},
        ${JSON.stringify([{ email, label: 'work' }])}::jsonb,
        ${c.company}, ${c.title}, ${c.seniority}, ${c.industry},
        ${'https://linkedin.com/in/' + c.first.toLowerCase().replace(/[^a-z]/g, '') + c.last.toLowerCase().replace(/[^a-z]/g, '')},
        ${c.tags},
        ${contactSource},
        'SEED_TIKTOK_SUMMIT',
        ${pick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING'])}::enrichment_status,
        ${`${c.first} ${c.last} is ${c.title} at ${c.company}, a key figure in the ${c.industry} space. Known for ${pick(['pioneering content strategies', 'building creator-first brands', 'driving digital transformation', 'scaling creator partnerships', 'innovating monetization models', 'championing creator equity'])} with a ${pick(['visionary', 'data-driven', 'collaborative', 'entrepreneurial', 'strategic'])} approach.`}
      )
      ON CONFLICT DO NOTHING
    `;
  }

  console.log(`   Created ${CONTACTS.length} contacts`);

  // Step 3b: Create contacts for TikTok team members (so they appear in Guest Intelligence, Check-in, Seating)
  console.log('3b/13 — Creating team member contacts...');

  const teamContactData = [
    { name: 'Sarah Kim', email: 'sarah.kim@tiktok.com', company: 'TikTok', title: 'Head of Creator Partnerships', industry: 'Social Media', seniority: 'Director', tags: ['Team', 'TikTok', 'Partnerships'] },
    { name: 'Jake Rivera', email: 'jake.rivera@tiktok.com', company: 'TikTok', title: 'Senior Brand Strategist', industry: 'Social Media', seniority: 'Senior', tags: ['Team', 'TikTok', 'Brand Strategy'] },
    { name: 'Priya Nair', email: 'priya.nair@tiktok.com', company: 'TikTok', title: 'Platform Relations Manager', industry: 'Social Media', seniority: 'Manager', tags: ['Team', 'TikTok', 'Platform'] },
    { name: 'Marcus Li', email: 'marcus.li@tiktok.com', company: 'TikTok', title: 'Business Development Lead', industry: 'Social Media', seniority: 'Senior', tags: ['Team', 'TikTok', 'BizDev'] },
  ];

  const teamContactIds: string[] = [];

  for (const tc of teamContactData) {
    const contactId = uuid();
    teamContactIds.push(contactId);
    const [first, ...lastParts] = tc.name.split(' ');
    const last = lastParts.join(' ');

    await sql`
      INSERT INTO people_contacts (
        id, workspace_id, full_name, first_name, last_name,
        emails, company, title, role_seniority, industry,
        linkedin_url, tags, source, source_detail, enrichment_status,
        ai_summary, guest_role
      ) VALUES (
        ${contactId}, ${workspaceId},
        ${tc.name}, ${first}, ${last},
        ${JSON.stringify([{ email: tc.email, label: 'work' }])}::jsonb,
        ${tc.company}, ${tc.title}, ${tc.seniority}, ${tc.industry},
        ${'https://linkedin.com/in/' + tc.name.toLowerCase().replace(/\s+/g, '')},
        ${tc.tags},
        'MANUAL',
        'SEED_TIKTOK_SUMMIT',
        'COMPLETED'::enrichment_status,
        ${`${tc.name} is ${tc.title} at ${tc.company}. Core team member responsible for event execution and guest relationship management.`},
        'TEAM_MEMBER'
      )
      ON CONFLICT DO NOTHING
    `;
  }

  // Also create a contact for the owner (Tonje Bakang)
  const ownerContactId = uuid();
  teamContactIds.push(ownerContactId);
  teamContactData.push({
    name: 'Tonje Bakang', email: 'test@moots.app', company: 'Moots', title: 'Founder & CEO',
    industry: 'Event Intelligence', seniority: 'C-Level', tags: ['Team', 'Moots', 'Host'],
  });

  await sql`
    INSERT INTO people_contacts (
      id, workspace_id, full_name, first_name, last_name,
      emails, company, title, role_seniority, industry,
      linkedin_url, tags, source, source_detail, enrichment_status,
      ai_summary, guest_role
    ) VALUES (
      ${ownerContactId}, ${workspaceId},
      'Tonje Bakang', 'Tonje', 'Bakang',
      ${JSON.stringify([{ email: 'test@moots.app', label: 'work' }])}::jsonb,
      'Moots', 'Founder & CEO', 'C-Level', 'Event Intelligence',
      'https://linkedin.com/in/tonjebakang',
      ${['Team', 'Moots', 'Host']},
      'MANUAL',
      'SEED_TIKTOK_SUMMIT',
      'COMPLETED'::enrichment_status,
      'Tonje Bakang is Founder & CEO of Moots, the event intelligence platform. Primary host responsible for overall event strategy, VIP relationships, and stakeholder engagement.',
      'TEAM_MEMBER'
    )
    ON CONFLICT DO NOTHING
  `;

  console.log(`   Created ${teamContactData.length} team member contacts (incl. owner)`);

  // Step 4: Create event objectives
  console.log('4/10 — Creating event objectives...');

  const objectiveIds: string[] = [];
  for (let i = 0; i < OBJECTIVE_TEMPLATES.length; i++) {
    const objId = uuid();
    objectiveIds.push(objId);
    await sql`
      INSERT INTO event_objectives (
        id, event_id, workspace_id, objective_text, weight, criteria_config, sort_order,
        ai_interpretation, qualifying_count, ai_questions
      ) VALUES (
        ${objId}, ${eventId}, ${workspaceId},
        ${OBJECTIVE_TEMPLATES[i].text},
        ${OBJECTIVE_TEMPLATES[i].weight},
        '{}'::jsonb,
        ${i},
        ${OBJECTIVE_TEMPLATES[i].ai_interpretation},
        ${OBJECTIVE_TEMPLATES[i].qualifying_count},
        ${JSON.stringify(OBJECTIVE_TEMPLATES[i].ai_questions)}::jsonb
      )
    `;
  }

  console.log(`   Created ${OBJECTIVE_TEMPLATES.length} objectives`);

  // Step 5: Create guest scores for all 35 contacts
  console.log('5/10 — Scoring all 35 contacts...');

  for (let idx = 0; idx < CONTACTS.length; idx++) {
    const c = CONTACTS[idx];
    const contactId = contactIds[idx];

    // Score based on tier
    let baseScore: number;
    if (idx < 10) baseScore = randomInt(75, 98);        // Creators — high
    else if (idx < 20) baseScore = randomInt(60, 90);    // Brand/agency — medium-high
    else if (idx < 28) baseScore = randomInt(70, 95);    // Platform execs — high
    else baseScore = randomInt(55, 85);                   // Media/VC — medium

    const score = Math.min(100, Math.max(0, baseScore));
    const rationale = pick(RATIONALE_TEMPLATES)
      .replace('{name}', `${c.first} ${c.last}`)
      .replace('{company}', c.company)
      .replace('{industry}', c.industry);

    const talkingPoints = shuffle(TALKING_POINTS_POOL).slice(0, randomInt(2, 4));
    const matchedObjectives = objectiveIds
      .map((objId) => ({
        objective_id: objId,
        match_score: Math.min(100, Math.max(0, score + randomInt(-20, 15))),
        explanation: `${pick(['Strong', 'Moderate', 'Partial'])} alignment — ${c.title} at ${c.company} ${pick(['directly contributes to', 'supports', 'tangentially relates to'])} this criterion.`,
      }))
      .sort((a, b) => b.match_score - a.match_score);

    await sql`
      INSERT INTO guest_scores (
        id, contact_id, event_id, workspace_id,
        relevance_score, matched_objectives, score_rationale,
        talking_points, scored_at, model_version
      ) VALUES (
        ${uuid()}, ${contactId}, ${eventId}, ${workspaceId},
        ${score},
        ${JSON.stringify(matchedObjectives)}::jsonb,
        ${rationale},
        ${JSON.stringify(talkingPoints)}::jsonb,
        NOW(),
        'claude-sonnet-4-5-20250514'
      )
      ON CONFLICT (contact_id, event_id) DO NOTHING
    `;
  }

  console.log(`   Scored all 35 contacts`);

  // Step 5b: Score team member contacts
  console.log('5b/13 — Scoring team member contacts...');

  for (let ti = 0; ti < teamContactData.length; ti++) {
    const tc = teamContactData[ti];
    const contactId = teamContactIds[ti];
    const score = randomInt(70, 85); // Team members score moderately — they're hosts, not guests

    const matchedObjectives = objectiveIds.map((objId) => ({
      objective_id: objId,
      match_score: randomInt(50, 75),
      explanation: `${tc.name} is a host team member — alignment reflects their facilitation role rather than guest fit.`,
    }));

    await sql`
      INSERT INTO guest_scores (
        id, contact_id, event_id, workspace_id,
        relevance_score, matched_objectives, score_rationale,
        talking_points, scored_at, model_version
      ) VALUES (
        ${uuid()}, ${contactId}, ${eventId}, ${workspaceId},
        ${score},
        ${JSON.stringify(matchedObjectives)}::jsonb,
        ${`${tc.name} is a core team member (${tc.title} at ${tc.company}) attending as host staff. Scored for event logistics and relationship management rather than guest fit.`},
        ${JSON.stringify(['Coordinate creator arrivals and VIP greetings', 'Facilitate brand-creator introductions at their assigned table', 'Capture key conversation outcomes for follow-up'])}::jsonb,
        NOW(),
        'claude-sonnet-4-5-20250514'
      )
      ON CONFLICT (contact_id, event_id) DO NOTHING
    `;
  }

  console.log(`   Scored ${teamContactData.length} team member contacts`);

  // Step 5c: Score ALL remaining workspace contacts (so Guest Pool = Scored)
  console.log('5c/13 — Scoring all remaining workspace contacts...');

  // Fetch all workspace contacts that don't have a score for this event yet
  const unscoredContacts = await sql`
    SELECT c.id, c.full_name, c.first_name, c.last_name, c.company, c.title, c.industry, c.tags, c.ai_summary
    FROM people_contacts c
    WHERE c.workspace_id = ${workspaceId}
      AND c.id NOT IN (
        SELECT gs.contact_id FROM guest_scores gs WHERE gs.event_id = ${eventId}
      )
    ORDER BY c.full_name
  `;

  const LOW_SCORE_RATIONALE_TEMPLATES = [
    '{name} at {company} works in {industry}. While not a primary target for this creator-focused summit, their background provides potential for cross-industry conversation and networking value.',
    '{name} ({company}) brings a {industry} perspective. Tangential alignment with the creator economy — could offer unexpected insights on the intersection of their domain with digital content.',
    'Moderate relevance. {name} from {company} operates in {industry}, which connects to the broader digital ecosystem but is not directly creator-focused. Potential for exploratory conversations.',
    '{name} at {company} has expertise in {industry}. Limited overlap with core summit themes (creator economy, brand partnerships, platform strategy), but their network and perspective add diversity.',
    'Lower alignment for this specific event. {name} ({company}, {industry}) doesn\'t directly map to the three summit objectives, but their seniority and connections make them worth considering if capacity allows.',
  ];

  const GENERAL_TALKING_POINTS = [
    'Ask about their perspective on how the creator economy is impacting their industry',
    'Explore how their company is adapting to influencer-driven marketing trends',
    'Discuss potential cross-industry collaboration opportunities with creator brands',
    'Understand how their network might benefit from exposure to top creators and platform executives',
    'Ask about their views on content-driven commerce and its impact on traditional business models',
    'Explore how AI tools are changing content creation and distribution in their space',
    'Discuss the convergence of traditional media and creator-driven content',
    'Ask about investment trends they\'re seeing at the intersection of creator economy and their sector',
  ];

  let scoredRemaining = 0;
  for (const contact of unscoredContacts) {
    const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
    const company = contact.company || 'Unknown Company';
    const industry = contact.industry || 'General Business';
    const title = contact.title || '';

    // Score lower — these aren't curated for this event (15–60 range)
    const score = randomInt(15, 60);

    const rationale = pick(LOW_SCORE_RATIONALE_TEMPLATES)
      .replace('{name}', name)
      .replace('{company}', company)
      .replace('{industry}', industry);

    const talkingPoints = shuffle(GENERAL_TALKING_POINTS).slice(0, randomInt(2, 3));

    const matchedObjectives = objectiveIds
      .map((objId) => ({
        objective_id: objId,
        match_score: Math.min(100, Math.max(0, score + randomInt(-15, 10))),
        explanation: `${pick(['Weak', 'Limited', 'Partial', 'Tangential'])} alignment — ${title ? title + ' at ' : ''}${company} has ${pick(['limited direct connection to', 'indirect relevance to', 'potential but unconfirmed fit with'])} this criterion.`,
      }))
      .sort((a, b) => b.match_score - a.match_score);

    await sql`
      INSERT INTO guest_scores (
        id, contact_id, event_id, workspace_id,
        relevance_score, matched_objectives, score_rationale,
        talking_points, scored_at, model_version
      ) VALUES (
        ${uuid()}, ${contact.id}, ${eventId}, ${workspaceId},
        ${score},
        ${JSON.stringify(matchedObjectives)}::jsonb,
        ${rationale},
        ${JSON.stringify(talkingPoints)}::jsonb,
        NOW(),
        'claude-sonnet-4-5-20250514'
      )
      ON CONFLICT (contact_id, event_id) DO NOTHING
    `;
    scoredRemaining++;
  }

  console.log(`   Scored ${scoredRemaining} additional workspace contacts (total: ${35 + teamContactData.length + scoredRemaining})`);

  // Step 6: Create invitation campaigns
  console.log('6/10 — Creating 2 invitation campaigns...');

  // Campaign 1: VIP Table (15 invitations)
  const campaign1Id = uuid();
  await sql`
    INSERT INTO invitation_campaigns (
      id, event_id, name, description, status,
      email_subject, email_body,
      total_invited, total_accepted, total_declined, total_considering
    ) VALUES (
      ${campaign1Id}, ${eventId},
      'Creator Summit — VIP Table',
      'Top creators and platform executives — personal outreach',
      'ACTIVE',
      'You''re Invited: TikTok Creator Summit — June 12, NYC',
      'We would be honored to have you join an intimate gathering of the most influential voices in the creator economy...',
      0, 0, 0, 0
    )
  `;

  // Campaign 2: Industry Leaders (20 invitations)
  const campaign2Id = uuid();
  await sql`
    INSERT INTO invitation_campaigns (
      id, event_id, name, description, status,
      email_subject, email_body,
      total_invited, total_accepted, total_declined, total_considering
    ) VALUES (
      ${campaign2Id}, ${eventId},
      'Creator Summit — Industry Leaders',
      'Brand executives, agency leads, investors, and media — curated for cross-pollination',
      'ACTIVE',
      'Exclusive Invitation: TikTok Global Creator Summit 2026',
      'Join 40 hand-picked leaders shaping the future of the creator economy for an evening of strategic conversation...',
      0, 0, 0, 0
    )
  `;

  // Campaign 1 invitations: 15 from creators + platform execs
  // indices 0-9 (creators) + 20-24 (platform execs) = 15
  const campaign1Indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 20, 21, 22, 23, 24];
  // 10 ACCEPTED, 3 CONSIDERING, 2 DECLINED
  const campaign1Statuses = [
    'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED',
    'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED',
    'CONSIDERING', 'CONSIDERING', 'CONSIDERING',
    'DECLINED', 'DECLINED',
  ];

  const allInvitationIds: string[] = [];
  const allInvitationContactIndices: number[] = [];

  for (let i = 0; i < campaign1Indices.length; i++) {
    const idx = campaign1Indices[i];
    const c = CONTACTS[idx];
    const contactId = contactIds[idx];
    const email = `${c.first.toLowerCase().replace(/[^a-z]/g, '')}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '')}.com`;
    const invStatus = campaign1Statuses[i];
    const tier = i < 5 ? 'TIER_1' : i < 10 ? 'TIER_2' : 'TIER_3';
    const priority = i < 4 ? 'VIP' : i < 10 ? 'HIGH' : 'NORMAL';
    const invId = uuid();
    allInvitationIds.push(invId);
    allInvitationContactIndices.push(idx);

    const hoursAgo = randomInt(2, 96);
    const staggeredTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO campaign_invitations (
        id, campaign_id, event_id, contact_id,
        full_name, email,
        status, tier, priority,
        internal_notes, expected_plus_ones,
        created_at, updated_at
      ) VALUES (
        ${invId}, ${campaign1Id}, ${eventId}, ${contactId},
        ${c.first + ' ' + c.last}, ${email},
        ${invStatus}::invitation_status,
        ${tier}::invitation_tier,
        ${priority}::invitation_priority,
        ${pick(['VIP creator — personal relationship', 'Key platform executive', 'Top 10 TikTok creator globally', 'Must-have for credibility', null])},
        ${pick([0, 0, 0, 1])},
        ${staggeredTime}::timestamptz,
        ${staggeredTime}::timestamptz
      )
    `;
  }

  // Campaign 2 invitations: 20 from brand/agency + remaining platform + media/VC
  // indices 10-19 (brand/agency) + 25-27 (remaining platform) + 28-34 (media/VC) = 20
  const campaign2Indices = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34];
  // 12 ACCEPTED, 5 CONSIDERING, 2 DECLINED, 1 INVITED
  const campaign2Statuses = [
    'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED',
    'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED', 'ACCEPTED',
    'CONSIDERING', 'CONSIDERING', 'CONSIDERING', 'CONSIDERING', 'CONSIDERING',
    'DECLINED', 'DECLINED',
    'INVITED',
  ];

  for (let i = 0; i < campaign2Indices.length; i++) {
    const idx = campaign2Indices[i];
    const c = CONTACTS[idx];
    const contactId = contactIds[idx];
    const email = `${c.first.toLowerCase().replace(/[^a-z]/g, '')}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '')}.com`;
    const invStatus = campaign2Statuses[i];
    const tier = i < 8 ? 'TIER_1' : i < 15 ? 'TIER_2' : 'TIER_3';
    const priority = i < 5 ? 'HIGH' : 'NORMAL';
    const invId = uuid();
    allInvitationIds.push(invId);
    allInvitationContactIndices.push(idx);

    const hoursAgo = randomInt(2, 72);
    const staggeredTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO campaign_invitations (
        id, campaign_id, event_id, contact_id,
        full_name, email,
        status, tier, priority,
        internal_notes, expected_plus_ones,
        created_at, updated_at
      ) VALUES (
        ${invId}, ${campaign2Id}, ${eventId}, ${contactId},
        ${c.first + ' ' + c.last}, ${email},
        ${invStatus}::invitation_status,
        ${tier}::invitation_tier,
        ${priority}::invitation_priority,
        ${pick(['Controls $10M+ influencer budget', 'Key agency relationship', 'Top investor in creator economy', 'Influential journalist — handle carefully', null, null])},
        ${pick([0, 0, 0, 1])},
        ${staggeredTime}::timestamptz,
        ${staggeredTime}::timestamptz
      )
    `;
  }

  console.log(`   Created 2 campaigns: VIP Table (15 invitations) + Industry Leaders (20 invitations)`);

  // Step 6b: Create Team — Auto Confirmed campaign (team members are auto-confirmed, not invited)
  console.log('6b/13 — Creating team campaign (auto-confirmed)...');

  const teamCampaignId = uuid();
  await sql`
    INSERT INTO invitation_campaigns (
      id, event_id, name, description, status,
      email_subject, email_body,
      total_invited, total_accepted, total_declined, total_considering
    ) VALUES (
      ${teamCampaignId}, ${eventId},
      'Team — Auto Confirmed',
      'Host team members — automatically confirmed. Status can be edited by the team.',
      'ACTIVE',
      '',
      '',
      ${teamContactData.length}, ${teamContactData.length}, 0, 0
    )
  `;

  const teamInvitationIds: string[] = [];
  // Table assignments: Sarah Kim→T1, Jake→T2, Priya→T3, Marcus Li→T4, Tonje→T1 (host table)
  const teamTableAssignments = [1, 2, 3, 4, 1];
  const teamSeatAssignments = [1, 1, 1, 1, 2]; // Tonje sits at Table 1 seat 2 (next to Sarah)

  for (let ti = 0; ti < teamContactData.length; ti++) {
    const tc = teamContactData[ti];
    const contactId = teamContactIds[ti];
    const invId = uuid();
    teamInvitationIds.push(invId);

    const createdTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // Created when event was set up
    const tableNum = teamTableAssignments[ti];
    const seatNum = teamSeatAssignments[ti];

    await sql`
      INSERT INTO campaign_invitations (
        id, campaign_id, event_id, contact_id,
        full_name, email,
        status, tier, priority,
        internal_notes, expected_plus_ones,
        table_assignment, seat_assignment,
        created_at, updated_at
      ) VALUES (
        ${invId}, ${teamCampaignId}, ${eventId}, ${contactId},
        ${tc.name}, ${tc.email},
        ${'ACCEPTED'}::invitation_status,
        ${'TIER_1'}::invitation_tier,
        ${'HIGH'}::invitation_priority,
        ${ti === teamContactData.length - 1 ? 'Primary host — overseeing all tables, seated at Table 1' : 'Host team — facilitating at Table ' + tableNum},
        ${0},
        ${tableNum}, ${seatNum},
        ${createdTime}::timestamptz,
        ${createdTime}::timestamptz
      )
    `;
  }

  console.log(`   Created "Team — Auto Confirmed" campaign with ${teamContactData.length} members (all ACCEPTED, seated)`);

  // Step 7: Create check-ins from ACCEPTED guests + team members
  console.log('7/13 — Creating check-in records...');

  // 8 regular guests
  for (let i = 0; i < 8; i++) {
    const idx = campaign1Indices[i];
    const c = CONTACTS[idx];
    const contactId = contactIds[idx];
    const email = `${c.first.toLowerCase().replace(/[^a-z]/g, '')}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, '')}.com`;
    const minutesOffset = randomInt(0, 60);
    const checkinTime = new Date('2026-06-12T22:00:00Z');
    checkinTime.setMinutes(checkinTime.getMinutes() + minutesOffset);

    await sql`
      INSERT INTO event_checkins (
        id, event_id, workspace_id, contact_id, invitation_id,
        full_name, email, company, title,
        source, checked_in_by, notes, created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${contactId}, ${allInvitationIds[i]},
        ${c.first + ' ' + c.last}, ${email}, ${c.company}, ${c.title},
        ${'INVITATION'}::checkin_source,
        ${userId},
        ${pick([null, null, 'Arrived with manager', 'VIP — greeted personally', null])},
        ${checkinTime.toISOString()}, ${checkinTime.toISOString()}
      )
    `;

    // Update campaign_invitations checked_in flag
    await sql`
      UPDATE campaign_invitations
      SET checked_in = true, checked_in_at = ${checkinTime.toISOString()}::timestamptz
      WHERE id = ${allInvitationIds[i]}
    `;
  }

  // Team member check-ins (all 5 arrive early — they're hosts)
  for (let ti = 0; ti < teamContactData.length; ti++) {
    const tc = teamContactData[ti];
    const contactId = teamContactIds[ti];
    const checkinTime = new Date('2026-06-12T21:30:00Z'); // 30 min before event
    checkinTime.setMinutes(checkinTime.getMinutes() + ti * 5); // Stagger by 5 min

    await sql`
      INSERT INTO event_checkins (
        id, event_id, workspace_id, contact_id, invitation_id,
        full_name, email, company, title,
        source, checked_in_by, notes, created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${contactId}, ${teamInvitationIds[ti]},
        ${tc.name}, ${tc.email}, ${tc.company}, ${tc.title},
        ${'INVITATION'}::checkin_source,
        ${userId},
        ${'Host team — arrived early for setup'},
        ${checkinTime.toISOString()}, ${checkinTime.toISOString()}
      )
    `;

    await sql`
      UPDATE campaign_invitations
      SET checked_in = true, checked_in_at = ${checkinTime.toISOString()}::timestamptz
      WHERE id = ${teamInvitationIds[ti]}
    `;
  }

  console.log(`   Created ${8 + teamContactData.length} check-ins (8 guests + ${teamContactData.length} team members)`);

  // Step 8: Create 3 follow-up sequences
  console.log('8/10 — Creating 3 follow-up sequences...');

  const followUpData = [
    { idx: 0, status: 'SENT', subject: 'Great connecting at the Creator Summit' },
    { idx: 1, status: 'SENT', subject: 'Thank you for joining us, Khaby' },
    { idx: 2, status: 'SENT', subject: 'Wonderful meeting you at The Glasshouse' },
  ];

  for (const fu of followUpData) {
    const cIdx = campaign1Indices[fu.idx];
    const c = CONTACTS[cIdx];
    const contactId = contactIds[cIdx];
    const sentAt = new Date('2026-06-13T14:00:00Z').toISOString();

    await sql`
      INSERT INTO follow_up_sequences (
        id, event_id, workspace_id, contact_id,
        status, subject, content, personalization_context,
        model_version, generated_at, sent_at,
        created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${contactId},
        ${'SENT'}::follow_up_status,
        ${fu.subject},
        ${`Dear ${c.first},\n\nThank you for joining us at the TikTok Global Creator Summit at The Glasshouse last evening. Your perspective on ${pick(['the future of creator-brand partnerships', 'monetization strategies for the next generation of creators', 'how platforms can better serve creator needs', 'the intersection of commerce and content'])} was truly insightful.\n\n${pick(['I\'d love to continue our conversation about potential collaboration.', 'Your work at ' + c.company + ' is setting the standard — we should explore how to amplify that.', 'Let\'s find time to discuss the partnership opportunities we touched on.'])}\n\nWould you be open to a 30-minute call next week?\n\nBest,\nTonje Bakang`},
        ${JSON.stringify({ score: randomInt(80, 97), company: c.company, title: c.title, talking_points: ['Creator partnerships', 'Brand deal structure'] })}::jsonb,
        'claude-sonnet-4-5-20250514',
        ${new Date('2026-06-13T13:00:00Z').toISOString()},
        ${sentAt},
        ${new Date('2026-06-13T13:00:00Z').toISOString()},
        ${new Date('2026-06-13T14:00:00Z').toISOString()}
      )
    `;
  }

  console.log(`   Created 3 follow-up sequences (all SENT)`);

  // Step 9: Create briefing packets
  console.log('9/10 — Creating briefing packets...');

  const topScoredForBriefing = campaign1Indices.slice(0, 6).map(idx => {
    const c = CONTACTS[idx];
    return {
      contact_id: contactIds[idx],
      full_name: `${c.first} ${c.last}`,
      company: c.company,
      title: c.title,
      relevance_score: randomInt(82, 98),
      talking_points: shuffle(TALKING_POINTS_POOL).slice(0, 3),
      score_rationale: `${c.first} ${c.last} is a high-value attendee as ${c.title} at ${c.company}. Key figure in the creator economy.`,
      key_interests: shuffle(['Brand partnerships', 'Content monetization', 'Creator tools', 'Platform policy', 'Audience growth', 'Commerce integration']).slice(0, 3),
      conversation_starters: [
        `Ask about ${c.company}'s approach to ${pick(['brand partnerships', 'content strategy', 'audience growth', 'monetization'])}`,
        `Discuss the evolution of the creator economy and where it's headed`,
        `Explore collaboration opportunities between their brand and our event portfolio`,
      ],
    };
  });

  // PRE_EVENT briefing
  await sql`
    INSERT INTO briefing_packets (
      id, event_id, workspace_id, generated_for,
      briefing_type, status, title, content,
      guest_count, model_version, generated_at, created_at, updated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId}, ${userId},
      'PRE_EVENT'::briefing_type, 'READY'::briefing_status,
      'Pre-Event Briefing — TikTok Creator Summit',
      ${JSON.stringify({
        event_summary: 'The TikTok Global Creator Summit at The Glasshouse brings together 35 invited guests spanning top creators, brand executives, platform leaders, and creator economy investors. The guest list has been curated against three objectives: creator leaders with 1M+ reach, brand decision-makers with $5M+ influencer spend, and platform executives shaping monetization. Average relevance score: 82.',
        key_guests: topScoredForBriefing,
        strategic_notes: 'Key dynamics: Three TikTok executives attending (Pappas, Chandlee, Hernandez) — coordinate messaging. Charli D\'Amelio and MrBeast should not be seated together as they attract too much attention as a pair. Seat brand execs (Nike, L\'Oreal, P&G) with complementary creators for partnership conversations.',
        agenda_highlights: [
          '6:00 PM — Cocktail reception on the terrace — focus on creator-brand introductions',
          '7:00 PM — Seated dinner begins — Host welcome by Tonje Bakang',
          '7:30 PM — Lightning talks: 3 creators share 5-minute "future of" perspectives',
          '8:30 PM — Table-facilitated discussions on creator economy themes',
          '9:30 PM — Open networking and dessert — key moment for partnership scheduling',
          '10:00 PM — Event concludes',
        ],
      })}::jsonb,
      ${topScoredForBriefing.length},
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-06-12T16:00:00Z').toISOString()},
      ${new Date('2026-06-12T16:00:00Z').toISOString()},
      ${new Date('2026-06-12T16:00:00Z').toISOString()}
    )
  `;

  // MORNING briefing
  await sql`
    INSERT INTO briefing_packets (
      id, event_id, workspace_id, generated_for,
      briefing_type, status, title, content,
      guest_count, model_version, generated_at, created_at, updated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId}, ${userId},
      'MORNING'::briefing_type, 'READY'::briefing_status,
      'Morning-of Briefing — TikTok Creator Summit',
      ${JSON.stringify({
        event_summary: 'Good morning. Tonight\'s Creator Summit at The Glasshouse is on track. 22 of 35 invitees have confirmed (10 from VIP Table, 12 from Industry Leaders). Last-minute update: Addison Rae will arrive 20 minutes late. MrBeast\'s team confirmed he will attend the full evening.',
        key_guests: topScoredForBriefing.slice(0, 4),
        strategic_notes: 'VIP arrival protocol: Charli D\'Amelio and Vanessa Pappas (TikTok COO) should be greeted personally. Marc Pritchard (P&G CBO) is bringing his head of digital — extra seat accommodated at Table 2. Security team briefed on creator arrivals. Photographer positioned for key moments but no social media until approved.',
        agenda_highlights: [
          '3:00 PM — Final venue walkthrough with Glasshouse events team',
          '5:00 PM — Team briefing at venue',
          '5:30 PM — AV check for lightning talk presentations',
          '6:00 PM — Doors open — cocktail reception on terrace',
          '7:00 PM — Transition to seated dinner',
          '10:00 PM — Event concludes — team debrief at 10:30 PM',
        ],
      })}::jsonb,
      4,
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-06-12T12:00:00Z').toISOString()},
      ${new Date('2026-06-12T12:00:00Z').toISOString()},
      ${new Date('2026-06-12T12:00:00Z').toISOString()}
    )
  `;

  // END_OF_DAY briefing
  await sql`
    INSERT INTO briefing_packets (
      id, event_id, workspace_id, generated_for,
      briefing_type, status, title, content,
      guest_count, model_version, generated_at, created_at, updated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId}, ${userId},
      'END_OF_DAY'::briefing_type, 'READY'::briefing_status,
      'End-of-Day Briefing — TikTok Creator Summit',
      ${JSON.stringify({
        event_summary: 'Excellent evening. 8 guests checked in so far with more arriving. Strong energy between creators and brand executives. Highlight: Charli D\'Amelio and Carolyn Everson (Nike) had a 20-minute conversation about a potential collaboration. Li Jin (Variant Fund) connected with 4 creators about investment opportunities.',
        key_guests: topScoredForBriefing.slice(0, 5),
        strategic_notes: 'Immediate follow-up priorities: (1) Charli D\'Amelio x Nike conversation — schedule follow-up call this week. (2) Li Jin wants to meet Tabitha Brown about a creator fund investment — make intro. (3) Marc Pritchard asked about hosting a P&G-specific creator dinner in Q3. (4) Vanessa Pappas offered to co-host a TikTok creator workshop at our next event.',
        agenda_highlights: [
          'Attendance: 8 checked in from VIP Table campaign',
          'Key conversion: Nike x Charli D\'Amelio partnership discussion initiated',
          'Follow-up emails to be sent by 2 PM tomorrow — AI drafts ready for review',
          '3 partnership conversations logged — all need follow-up this week',
          'Team debrief notes captured — see action items in Follow-Up tab',
        ],
      })}::jsonb,
      5,
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-06-13T02:00:00Z').toISOString()},
      ${new Date('2026-06-13T02:00:00Z').toISOString()},
      ${new Date('2026-06-13T02:00:00Z').toISOString()}
    )
  `;

  console.log(`   Created 3 briefing packets (pre-event, morning, end-of-day)`);

  // Step 10: Create agent activity log entries
  console.log('10/10 — Creating agent activity log entries...');

  const agentActivities = [
    {
      type: 'scoring',
      headline: 'Scored 35 contacts against 3 targeting criteria',
      detail: '22 qualify with a score of 70+. Top match: Charli D\'Amelio (98). Strong creator-brand balance across the guest list.',
      metadata: { total_scored: 35, qualified: 22, top_score: 98 },
      daysAgo: 3,
    },
    {
      type: 'enrichment',
      headline: 'Enriched 30 contact profiles',
      detail: 'Updated social media metrics, brand deal history, and audience demographics for 30 contacts. 2 contacts could not be enriched — manual review recommended.',
      metadata: { completed: 30, failed: 2, total: 32 },
      daysAgo: 3,
    },
    {
      type: 'observation',
      headline: '5 high-scoring creators (85+) confirmed attendance',
      detail: 'Charli D\'Amelio, Khaby Lame, MrBeast, Tabitha Brown, and Addison Rae have all accepted. Combined audience: 500M+ followers.',
      metadata: { contact_count: 5 },
      daysAgo: 2,
    },
    {
      type: 'scoring',
      headline: 'Re-scored after enrichment — 3 contacts moved above threshold',
      detail: 'Alix Earle, Spencer Knight, and Noah Beck moved above 80 after social metrics update. Average score change: +9 points.',
      metadata: { total_scored: 10, newly_qualified: 3, avg_change: 9 },
      daysAgo: 2,
    },
    {
      type: 'briefing',
      headline: 'Generated pre-event briefing with 6 key guest profiles',
      detail: 'Prepared talking points and conversation starters for top creators and executives. Strategic seating suggestions included.',
      metadata: { briefing_type: 'PRE_EVENT', guest_count: 6 },
      daysAgo: 1,
    },
    {
      type: 'follow_up',
      headline: 'Drafted personalized follow-ups for 3 attendees',
      detail: 'Each follow-up references specific conversation topics and partnership opportunities from the event.',
      metadata: { created: 3, skipped: 0, auto_generated: true },
      hoursAgo: 8,
    },
  ];

  for (const activity of agentActivities) {
    const createdAt = activity.hoursAgo
      ? new Date(Date.now() - activity.hoursAgo * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - (activity.daysAgo || 1) * 24 * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO agent_activity_log (
        id, event_id, workspace_id, activity_type, headline, detail, metadata, created_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId},
        ${activity.type}, ${activity.headline}, ${activity.detail},
        ${JSON.stringify(activity.metadata)}::jsonb,
        ${createdAt}::timestamptz
      )
    `;
  }

  console.log(`   Created ${agentActivities.length} agent activity log entries`);

  // Step 11: Create guest team assignments
  console.log('11/13 — Creating guest team assignments...');

  // All team member user IDs: [userId (owner), ...tiktokTeamMembers]
  const allTeamUserIds = [userId, ...teamMemberUserIds];
  const allTeamNames = ['Tonje Bakang', ...tiktokTeamMembers.map(t => t.name)];

  // Assign 8 checked-in guests + 6 additional confirmed guests to team members
  const assignmentPairs = [
    // Sarah Kim (ADMIN) — owns VIP creator relationships
    { contactIdx: 0, teamIdx: 1, role: 'PRIMARY', notes: 'VIP creator — Sarah manages all D\'Amelio relationships' },
    { contactIdx: 1, teamIdx: 1, role: 'PRIMARY', notes: 'Khaby Lame — Sarah is primary point of contact' },
    { contactIdx: 3, teamIdx: 1, role: 'PRIMARY', notes: 'MrBeast — key VIP, needs personal attention' },
    { contactIdx: 8, teamIdx: 1, role: 'PRIMARY', notes: 'Tabitha Brown — wellness/food creator, Sarah handles' },
    // Jake Rivera (TEAM_MEMBER) — handles brand/agency execs
    { contactIdx: 10, teamIdx: 2, role: 'PRIMARY', notes: 'Nike VP — Jake managing brand-creator introductions' },
    { contactIdx: 11, teamIdx: 2, role: 'PRIMARY', notes: 'L\'Oreal CDO — key brand partner for creator deals' },
    { contactIdx: 14, teamIdx: 2, role: 'PRIMARY', notes: 'P&G CBO — highest-value brand exec at the event' },
    { contactIdx: 17, teamIdx: 2, role: 'PRIMARY', notes: 'Accenture Song CEO — agency relationship' },
    // Priya Nair (TEAM_MEMBER) — handles platform execs & investors
    { contactIdx: 20, teamIdx: 3, role: 'PRIMARY', notes: 'TikTok COO — Priya is internal liaison' },
    { contactIdx: 24, teamIdx: 3, role: 'PRIMARY', notes: 'TikTok Business Solutions — Priya coordinates' },
    { contactIdx: 28, teamIdx: 3, role: 'PRIMARY', notes: 'Li Jin (Variant Fund) — creator economy VC, Priya owns' },
    { contactIdx: 33, teamIdx: 3, role: 'PRIMARY', notes: 'Andrew Chen (a16z) — high-value VC connection' },
    // Tonje Bakang (OWNER) — handles key VIP relationships personally
    { contactIdx: 2, teamIdx: 0, role: 'PRIMARY', notes: 'Addison Rae — Tonje greeting personally on arrival' },
    { contactIdx: 23, teamIdx: 0, role: 'PRIMARY', notes: 'Evan Spiegel (Snap CEO) — Tonje hosts directly' },
    // Marcus Li (EXTERNAL_PARTNER) — TikTok internal support
    { contactIdx: 27, teamIdx: 4, role: 'SECONDARY', notes: 'Sofia Hernandez — TikTok marketing, Marcus Li supports' },
    { contactIdx: 4, teamIdx: 4, role: 'SECONDARY', notes: 'Bella Poarch — TikTok native, Marcus Li backstop' },
  ];

  for (const ap of assignmentPairs) {
    const contactId = contactIds[ap.contactIdx];
    const assignedTo = allTeamUserIds[ap.teamIdx];
    await sql`
      INSERT INTO guest_team_assignments (
        id, event_id, workspace_id, contact_id, assigned_to, role, notes, created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId},
        ${contactId}, ${assignedTo}, ${ap.role}, ${ap.notes},
        NOW(), NOW()
      )
      ON CONFLICT (event_id, contact_id, assigned_to) DO NOTHING
    `;
  }

  console.log(`   Created ${assignmentPairs.length} guest-to-team assignments across ${allTeamNames.length} members`);

  // Step 12: Create generated context (Context tab)
  console.log('12/13 — Creating generated context...');

  await sql`
    INSERT INTO event_generated_context (
      id, event_id, workspace_id,
      sponsors, strategic_significance, market_context, completeness,
      model_version, generated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId},
      ${JSON.stringify([
        { name: 'TikTok', role: 'Presenting Partner — hosting the flagship creator economy event', tier: 'Primary' },
        { name: 'Moots', role: 'Event Partner — curated guest intelligence and experience management', tier: 'Gold' },
      ])}::jsonb,
      ${'This summit positions the host organization at the epicenter of the $250B creator economy. By convening TikTok\'s C-suite (Pappas, Chandlee, Hernandez) alongside the world\'s most influential creators and the brand executives who fund them, this event creates a unique power dynamic. Key strategic plays: (1) Charli D\'Amelio and MrBeast together at a 40-person dinner signals extreme curation and exclusivity — every attendee will feel they\'re in the right room. (2) The Nike, L\'Oreal, and P&G executives collectively control $500M+ in influencer spend — seating them with creators enables direct deal-making. (3) Li Jin (Variant Fund) and Andrew Chen (a16z) provide the investment lens that validates the creator economy as institutional-grade.'},
      ${'The creator economy reached $250B in 2025 and is projected to hit $480B by 2028. TikTok remains the dominant discovery platform with 1.8B monthly active users, though YouTube Shorts and Instagram Reels are closing the gap in monetization features. Key trends shaping this summit: (1) Creator-to-brand deals are shifting from one-off sponsorships to equity partnerships — Charli D\'Amelio\'s deal with Prada and MrBeast\'s Feastables ($500M valuation) exemplify this. (2) Brand spend on influencer marketing grew 29% YoY to $34B in 2025, with TikTok capturing 42% of new budget allocation. (3) Platform economics are evolving — TikTok\'s Creator Fund 2.0 now shares ad revenue directly, while YouTube offers 45% of Shorts ad revenue. (4) AI-generated content is both a threat and opportunity — 67% of creators now use AI tools for ideation and editing, but brand authenticity concerns are rising.'},
      ${JSON.stringify([
        { label: 'Event Details', done: true, source: 'manual' },
        { label: 'Partners', done: true, source: 'manual' },
        { label: 'Guest List', done: true, source: 'scoring' },
        { label: 'Targeting Criteria', done: true, source: 'manual' },
        { label: 'Market Research', done: true, source: 'ai' },
        { label: 'Strategic Analysis', done: true, source: 'ai' },
        { label: 'Team Assignments', done: true, source: 'manual' },
        { label: 'Seating Plan', done: false },
        { label: 'Run of Show', done: false },
      ])}::jsonb,
      'claude-sonnet-4-5-20250514',
      ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}::timestamptz
    )
  `;

  console.log(`   Created generated context (strategic significance, market context, 78% completeness)`);

  // Step 12b: Create context activity feed
  console.log('12b/13 — Creating context activity feed...');

  const contextActivities = [
    {
      type: 'reading',
      text: 'Analyzing event details: TikTok Global Creator Summit 2026 at The Glasshouse, NYC. 40-person curated dinner format.',
      daysAgo: 2, minutesOffset: 0,
    },
    {
      type: 'extracted',
      text: 'Identified 2 event partners: TikTok (Presenting Partner) and Moots (Event Partner). Extracted 3 targeting criteria focused on creator economy leaders, brand decision-makers, and platform executives.',
      details: ['TikTok — Presenting Partner', 'Moots — Event Partner', '3 targeting criteria configured'],
      daysAgo: 2, minutesOffset: 1,
    },
    {
      type: 'researching',
      text: 'Researching the creator economy landscape, TikTok platform economics, and recent brand-creator partnership trends...',
      daysAgo: 2, minutesOffset: 2,
    },
    {
      type: 'found',
      text: 'Found: Creator economy reached $250B in 2025, projected $480B by 2028. TikTok has 1.8B MAUs. Brand spend on influencer marketing grew 29% YoY to $34B.',
      details: [
        'Creator economy: $250B (2025) → $480B (2028)',
        'TikTok: 1.8B monthly active users',
        'Influencer marketing spend: $34B (+29% YoY)',
        'TikTok captures 42% of new budget allocation',
      ],
      daysAgo: 2, minutesOffset: 3,
    },
    {
      type: 'found',
      text: 'Found: Key attendee context — Charli D\'Amelio (150M+ followers), MrBeast (Feastables valued at $500M), combined attendee audience reach exceeds 800M.',
      details: [
        'Charli D\'Amelio: 150M+ followers, Prada equity partnership',
        'MrBeast: Feastables at $500M valuation',
        'Combined audience reach: 800M+',
        'Brand exec attendees control $500M+ in influencer spend',
      ],
      daysAgo: 2, minutesOffset: 4,
    },
    {
      type: 'insight',
      text: 'Strategic insight: This is a rare concentration of creator economy power. The 3 TikTok executives (Pappas, Chandlee, Hernandez) alongside top creators and Fortune 500 brand leads creates a unique deal-making environment. Recommend seating brand execs adjacent to complementary creators.',
      daysAgo: 2, minutesOffset: 5,
    },
    {
      type: 'suggestion',
      text: 'Suggestion: Consider adding a "Creator x Brand Speed Networking" segment during the cocktail hour. With Nike, L\'Oreal, P&G, and Unilever execs all confirmed, structured 5-minute introductions could generate 10+ partnership conversations.',
      actions: [
        { id: uuid(), label: 'Add to run of show', primary: true, actionType: 'update_context' },
        { id: uuid(), label: 'Skip for now', primary: false, actionType: 'update_context' },
      ],
      daysAgo: 2, minutesOffset: 6,
    },
    {
      type: 'complete',
      text: 'Context generation complete. Strategic significance, market context, and partner analysis are ready. Context completeness: 78% — seating plan and run of show still needed.',
      daysAgo: 2, minutesOffset: 7,
    },
  ];

  for (const ca of contextActivities) {
    const createdAt = new Date(Date.now() - (ca.daysAgo || 1) * 24 * 60 * 60 * 1000 + (ca.minutesOffset || 0) * 60 * 1000);

    await sql`
      INSERT INTO event_activities (
        id, event_id, workspace_id, type, text, details, actions, created_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId},
        ${ca.type}, ${ca.text},
        ${ca.details ? JSON.stringify(ca.details) : null}::jsonb,
        ${(ca as any).actions ? JSON.stringify((ca as any).actions) : null}::jsonb,
        ${createdAt.toISOString()}::timestamptz
      )
    `;
  }

  console.log(`   Created ${contextActivities.length} context activity feed items`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ TikTok Creator Summit seed complete!\n');
  console.log(`   Event:         #${eventId} — TikTok Global Creator Summit 2026`);
  console.log(`   Workspace:     ${workspaceId}`);
  console.log(`   Team:          ${allTeamNames.length} members (${allTeamNames.join(', ')})`);
  console.log(`   Contacts:      35 (creators, brand execs, platform execs, media/VC)`);
  console.log(`   Objectives:    3`);
  console.log(`   Scored:        All workspace contacts (39 curated + ${scoredRemaining} additional)`);
  console.log(`   Campaigns:     3 (VIP Table: 15, Industry Leaders: 20, Team Auto Confirmed: 4)`);
  console.log(`   Confirmed:     27 (10 + 12 + 5 team ACCEPTED)`);
  console.log(`   Considering:   8 (3 + 5)`);
  console.log(`   Check-ins:     8`);
  console.log(`   Assignments:   ${assignmentPairs.length} guests assigned to team members`);
  console.log(`   Follow-ups:    3 (all SENT)`);
  console.log(`   Briefings:     3 (pre-event, morning, end-of-day)`);
  console.log(`   Context:       Generated (strategic significance + market context, 78%)`);
  console.log(`\n   Open: http://localhost:3000/dashboard/${eventId}/overview`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

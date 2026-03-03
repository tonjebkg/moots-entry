/**
 * Round 3 seed data — platform review fixes
 *
 * 1. Ensures campaigns exist with full invitation records (fix #3)
 * 2. Sets roles on people_contacts for all contacts (fix #4)
 * 3. Creates event_notes table (fix #5)
 * 4. Updates denormalized campaign counts
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_cs1PUwVQx2lv@ep-lively-shape-a8jf1wnz.eastus2.azure.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

const EVENT_ID = 86;
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

// ─── Role assignments per the review doc ──────────────────────────────
const ROLE_MAP: Record<string, string> = {
  // Speaker
  'James Harrington': 'SPEAKER',
  // Partner
  'Martin Cross': 'PARTNER',
  // Team
  'Sarah Chen': 'TEAM_MEMBER',
  'Marcus Rivera': 'TEAM_MEMBER',
  'Julia Park': 'TEAM_MEMBER',
};

// ─── Campaign guest lists ─────────────────────────────────────────────

interface GuestSeed {
  name: string;
  email: string;
  status: string;
  tier: string;
  priority: string;
  rsvp_sent: string;
  rsvp_responded: string | null;
}

const FOUNDING_GUESTS: GuestSeed[] = [
  { name: 'Patricia Donovan', email: 'patricia.donovan@calpers.ca.gov', status: 'ACCEPTED', tier: 'TIER_1', priority: 'VIP', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-21T09:15:00Z' },
  { name: 'Philip Wainwright', email: 'p.wainwright@wainwrightfdn.org', status: 'ACCEPTED', tier: 'TIER_1', priority: 'VIP', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-21T11:30:00Z' },
  { name: 'Walter Edmonds', email: 'wedmonds@temasek.com.sg', status: 'ACCEPTED', tier: 'TIER_1', priority: 'VIP', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-22T08:45:00Z' },
  { name: 'Andrew Sterling', email: 'a.sterling@thomabravo.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'HIGH', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-21T16:20:00Z' },
  { name: 'James Harrington', email: 'jharrington@blackstone.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'VIP', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-20T18:30:00Z' },
  { name: 'Elizabeth Waverly', email: 'ewaverly@waverly-advisory.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'HIGH', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-22T14:15:00Z' },
  { name: 'Diana Okonkwo', email: 'd.okonkwo@vistaequity.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'HIGH', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-21T13:45:00Z' },
  { name: 'Lisa Chang', email: 'lchang@snowflake.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'NORMAL', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-23T09:30:00Z' },
  { name: 'Louise Hensley', email: 'l.hensley@mckinsey.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'NORMAL', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-22T17:00:00Z' },
  { name: 'Oliver Pennington', email: 'opennington@evercore.com', status: 'ACCEPTED', tier: 'TIER_1', priority: 'NORMAL', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-24T08:20:00Z' },
  { name: 'David Nakamura', email: 'd.nakamura@nakamura-partners.jp', status: 'DECLINED', tier: 'TIER_1', priority: 'HIGH', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: '2026-03-24T09:15:00Z' },
  { name: 'Robert Kensington', email: 'r.kensington@kensington-capital.com', status: 'INVITED', tier: 'TIER_1', priority: 'HIGH', rsvp_sent: '2026-03-20T14:00:00Z', rsvp_responded: null },
];

const EXTENDED_GUESTS: GuestSeed[] = [
  { name: 'Eleanor Blackwood', email: 'e.blackwood@blackwoodpartners.com', status: 'ACCEPTED', tier: 'TIER_2', priority: 'HIGH', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-29T10:30:00Z' },
  { name: 'Martin Cross', email: 'm.cross@deloitte.com', status: 'ACCEPTED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-29T14:00:00Z' },
  { name: "Fiona O'Malley", email: 'fiona.omalley@ilpa.org', status: 'ACCEPTED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-30T09:45:00Z' },
  { name: 'Brian Callahan', email: 'bcallahan@toast.com', status: 'ACCEPTED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-29T16:30:00Z' },
  { name: 'Sofia Chen-Ramirez', email: 's.chenramirez@advent.com', status: 'ACCEPTED', tier: 'TIER_2', priority: 'HIGH', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-30T11:15:00Z' },
  { name: 'Ian MacGregor', email: 'imacgregor@bridgepoint.com', status: 'ACCEPTED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-31T08:00:00Z' },
  { name: 'Evelyn Marshall', email: 'emarshall@notion.so', status: 'ACCEPTED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-30T15:20:00Z' },
  { name: 'Victoria Langley', email: 'v.langley@langley-capital.com', status: 'DECLINED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-30T09:00:00Z' },
  { name: 'Sarah Worthington', email: 's.worthington@worthington-grp.com', status: 'DECLINED', tier: 'TIER_2', priority: 'LOW', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: '2026-03-31T11:45:00Z' },
  { name: 'Dahlia Rosenberg', email: 'd.rosenberg@rosenberg-ventures.com', status: 'INVITED', tier: 'TIER_2', priority: 'NORMAL', rsvp_sent: '2026-03-28T14:00:00Z', rsvp_responded: null },
];

async function main() {
  console.log('=== Round 3 seed data ===\n');

  // ─── 0. Add address column to people_contacts if missing ────────────
  console.log('0. Ensuring address column on people_contacts...');
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'people_contacts' AND column_name = 'address'
      ) THEN
        ALTER TABLE people_contacts ADD COLUMN address TEXT;
      END IF;
    END $$
  `;
  console.log('   address column ready');

  // ─── 1. Create event_notes table ─────────────────────────────────────
  console.log('1. Creating event_notes table...');
  await sql`
    CREATE TABLE IF NOT EXISTS event_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id INTEGER NOT NULL REFERENCES events(id),
      contact_id UUID NOT NULL REFERENCES people_contacts(id) ON DELETE CASCADE,
      workspace_id UUID NOT NULL,
      author_id UUID REFERENCES users(id),
      author_name TEXT,
      note_text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_notes_event_contact ON event_notes(event_id, contact_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_event_notes_workspace ON event_notes(workspace_id)`;
  console.log('   event_notes table ready');

  // ─── 2. Ensure campaigns exist ───────────────────────────────────────
  console.log('\n2. Setting up invitation campaigns...');

  // Delete existing campaigns for clean slate
  await sql`DELETE FROM campaign_invitations WHERE event_id = ${EVENT_ID}`;
  await sql`DELETE FROM invitation_campaigns WHERE event_id = ${EVENT_ID}`;
  console.log('   Cleared existing campaign data');

  // Create Founding Table campaign
  const founding = await sql`
    INSERT INTO invitation_campaigns (event_id, name, description, status)
    VALUES (
      ${EVENT_ID},
      'Q2 Executive Dinner — Founding Table',
      'First wave: 12 highest-priority guests for the core dinner table',
      'COMPLETED'
    ) RETURNING id
  `;
  const foundingId = founding[0].id;
  console.log(`   Created Founding Table: ${foundingId}`);

  // Create Extended Circle campaign
  const extended = await sql`
    INSERT INTO invitation_campaigns (event_id, name, description, status)
    VALUES (
      ${EVENT_ID},
      'Q2 Executive Dinner — Extended Circle',
      'Second wave: 10 additional guests to fill remaining seats',
      'COMPLETED'
    ) RETURNING id
  `;
  const extendedId = extended[0].id;
  console.log(`   Created Extended Circle: ${extendedId}`);

  // ─── 3. Insert campaign invitations ──────────────────────────────────
  console.log('\n3. Creating campaign invitations...');

  // Helper to find or create contact_id
  async function getContactId(name: string, email: string): Promise<string | null> {
    const existing = await sql`
      SELECT id FROM people_contacts
      WHERE workspace_id = ${WORKSPACE_ID} AND (full_name = ${name} OR emails @> ${JSON.stringify([{email}])}::jsonb)
      LIMIT 1
    `;
    return existing[0]?.id || null;
  }

  async function insertInvitations(campaignId: string, guests: GuestSeed[]) {
    for (const g of guests) {
      const contactId = await getContactId(g.name, g.email);
      await sql`
        INSERT INTO campaign_invitations (
          campaign_id, event_id, full_name, email, status, tier, priority,
          contact_id, rsvp_email_sent_at, rsvp_responded_at
        ) VALUES (
          ${campaignId}, ${EVENT_ID}, ${g.name}, ${g.email},
          ${g.status}::invitation_status, ${g.tier}::invitation_tier, ${g.priority}::invitation_priority,
          ${contactId}, ${g.rsvp_sent}, ${g.rsvp_responded}
        )
      `;
    }
  }

  await insertInvitations(foundingId, FOUNDING_GUESTS);
  console.log(`   Inserted ${FOUNDING_GUESTS.length} Founding Table invitations`);

  await insertInvitations(extendedId, EXTENDED_GUESTS);
  console.log(`   Inserted ${EXTENDED_GUESTS.length} Extended Circle invitations`);

  // ─── 4. Update denormalized campaign counts ──────────────────────────
  console.log('\n4. Updating campaign counts...');

  for (const cid of [foundingId, extendedId]) {
    await sql`
      UPDATE invitation_campaigns SET
        total_considering = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${cid} AND status = 'CONSIDERING'),
        total_invited = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${cid} AND status IN ('INVITED', 'ACCEPTED', 'DECLINED')),
        total_accepted = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${cid} AND status = 'ACCEPTED'),
        total_declined = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${cid} AND status = 'DECLINED')
      WHERE id = ${cid}
    `;
  }
  console.log('   Campaign counts updated');

  // ─── 5. Set roles on people_contacts ─────────────────────────────────
  console.log('\n5. Setting guest roles...');

  for (const [name, role] of Object.entries(ROLE_MAP)) {
    const result = await sql`
      UPDATE people_contacts SET guest_role = ${role}
      WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${name}
    `;
    const count = (result as any).count ?? result.length ?? 0;
    if (count > 0) {
      console.log(`   ${name} → ${role}`);
    } else {
      console.log(`   ${name} → ${role} (not found in contacts)`);
    }
  }

  // Clear any invented roles that aren't in the standard set
  const VALID_ROLES = Object.values(ROLE_MAP);
  const uniqueRoles = [...new Set(VALID_ROLES)];
  console.log(`   Valid roles: ${uniqueRoles.join(', ')}`);

  // ─── 6. Seed sample event notes ──────────────────────────────────────
  console.log('\n6. Seeding sample event notes...');

  const SARAH_ID = 'a760548b-b5f9-43da-b680-be4378b72797';

  const noteSeeds = [
    { name: 'Patricia Donovan', note: 'Very interested in Fund IV co-investment. Wants to discuss North American deal flow specifically. Follow up with Q3 pipeline deck.' },
    { name: 'James Harrington', note: 'Keynote went extremely well. Several attendees approached him afterward. Mentioned interest in hosting a similar dinner in London.' },
    { name: 'Walter Edmonds', note: 'First time at our event. Impressed by the format. Asked about recurring dinner series. Connect with Marcus for Asian market insights.' },
    { name: 'Andrew Sterling', note: 'Brought up potential co-investment opportunity in enterprise SaaS. Wants a follow-up call next week with the deal team.' },
    { name: 'Diana Okonkwo', note: 'Strong connection with Patricia Donovan — they discussed cross-border PE allocations. Consider seating them together at future events.' },
  ];

  for (const ns of noteSeeds) {
    const contact = await sql`
      SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${ns.name} LIMIT 1
    `;
    if (contact[0]) {
      // Delete existing notes for this contact+event
      await sql`DELETE FROM event_notes WHERE event_id = ${EVENT_ID} AND contact_id = ${contact[0].id}`;
      await sql`
        INSERT INTO event_notes (event_id, contact_id, workspace_id, author_id, author_name, note_text)
        VALUES (${EVENT_ID}, ${contact[0].id}, ${WORKSPACE_ID}, ${SARAH_ID}, 'Sarah Chen', ${ns.note})
      `;
      console.log(`   Note for ${ns.name}`);
    }
  }

  console.log('\n=== Round 3 seed complete ===');
}

main().catch(console.error);

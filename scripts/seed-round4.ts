/**
 * Round 4 seed data — platform review fixes
 *
 * 1. Cleans up duplicate event_checkins (data integrity fix)
 * 2. Re-creates check-ins only for ACCEPTED guests + walk-ins
 * 3. Sets guest roles for ALL contacts per review doc
 * 4. Updates campaign created_at to actual sent dates
 * 5. Generates briefing content for all 3 briefings
 * 6. Marks campaign_invitations.checked_in = TRUE for checked-in guests
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_cs1PUwVQx2lv@ep-lively-shape-a8jf1wnz.eastus2.azure.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

const EVENT_ID = 86;
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

// ─── Role assignments per the review doc (Round 4, Fix #8) ───────────
const ROLE_MAP: Record<string, string> = {
  // LP (Limited Partner)
  'Patricia Donovan': 'LP',
  'Philip Wainwright': 'LP',
  'Walter Edmonds': 'LP',
  'Eleanor Blackwood': 'LP',
  "Fiona O'Malley": 'LP',
  'Yuki Tanaka': 'LP',
  // GP (General Partner)
  'Andrew Sterling': 'GP',
  'Diana Okonkwo': 'GP',
  'Sofia Chen-Ramirez': 'GP',
  'Ian MacGregor': 'GP',
  // Speaker (overrides GP for James)
  'James Harrington': 'SPEAKER',
  // Partner
  'Martin Cross': 'PARTNER',
  // Advisor
  'Oliver Pennington': 'ADVISOR',
  'Louise Hensley': 'ADVISOR',
  'Gregory Mansfield': 'ADVISOR',
  // Operating Partner
  'Lisa Chang': 'OPERATING_PARTNER',
  'Brian Callahan': 'OPERATING_PARTNER',
  'Evelyn Marshall': 'OPERATING_PARTNER',
  // Team
  'Sarah Chen': 'TEAM_MEMBER',
  'Marcus Rivera': 'TEAM_MEMBER',
  'Julia Park': 'TEAM_MEMBER',
};

// Team member user IDs
const SARAH_ID = 'a760548b-b5f9-43da-b680-be4378b72797';

async function main() {
  console.log('=== Round 4 seed data ===\n');

  // ─── 1. Clean up event_checkins ──────────────────────────────────────
  console.log('1. Cleaning up event_checkins...');
  await sql`DELETE FROM event_checkins WHERE event_id = ${EVENT_ID}`;
  console.log('   Deleted all existing check-ins for event');

  // ─── 2. Re-create check-ins for ACCEPTED guests with proper contact_ids ─
  console.log('\n2. Re-creating check-ins for ACCEPTED guests...');

  // Find all ACCEPTED invitations with contact_ids
  const accepted = await sql`
    SELECT ci.id AS invitation_id, ci.contact_id, ci.full_name, ci.email,
           pc.company, pc.title
    FROM campaign_invitations ci
    LEFT JOIN people_contacts pc ON pc.id = ci.contact_id
    WHERE ci.event_id = ${EVENT_ID}
      AND ci.status = 'ACCEPTED'
      AND ci.contact_id IS NOT NULL
  `;

  let checkinCount = 0;
  for (const inv of accepted) {
    await sql`
      INSERT INTO event_checkins (
        event_id, workspace_id, contact_id, invitation_id,
        full_name, email, company, title,
        source, checked_in_by
      ) VALUES (
        ${EVENT_ID}, ${WORKSPACE_ID}, ${inv.contact_id}, ${inv.invitation_id},
        ${inv.full_name}, ${inv.email}, ${inv.company}, ${inv.title},
        'INVITATION'::checkin_source, ${SARAH_ID}
      )
    `;

    // Mark the invitation as checked in
    await sql`
      UPDATE campaign_invitations
      SET checked_in = TRUE, checked_in_at = NOW()
      WHERE id = ${inv.invitation_id}
    `;

    checkinCount++;
  }
  console.log(`   Created ${checkinCount} check-ins for ACCEPTED guests`);

  // Also create 3 team member check-ins
  const teamMembers = ['Sarah Chen', 'Marcus Rivera', 'Julia Park'];
  for (const name of teamMembers) {
    const contact = await sql`
      SELECT id, full_name, emails, company, title
      FROM people_contacts
      WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${name}
      LIMIT 1
    `;
    if (contact[0]) {
      const email = contact[0].emails?.[0]?.email || null;
      await sql`
        INSERT INTO event_checkins (
          event_id, workspace_id, contact_id,
          full_name, email, company, title,
          source, checked_in_by
        ) VALUES (
          ${EVENT_ID}, ${WORKSPACE_ID}, ${contact[0].id},
          ${contact[0].full_name}, ${email}, ${contact[0].company}, ${contact[0].title},
          'INVITATION'::checkin_source, ${SARAH_ID}
        )
      `;
      console.log(`   Team check-in: ${name}`);
    }
  }

  // Re-create walk-in check-ins
  const walkIns = [
    { name: 'Yuki Tanaka', email: 'yuki.tanaka@mufg.jp', company: 'MUFG', title: 'Head of Alternative Investments' },
    { name: 'Gregory Mansfield', email: 'gmansfield@mansfield-advisory.com', company: 'Mansfield Advisory', title: 'Senior Advisor' },
  ];
  for (const w of walkIns) {
    // Find or create contact
    let contactId: string | null = null;
    const existing = await sql`
      SELECT id FROM people_contacts
      WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${w.name}
      LIMIT 1
    `;
    if (existing[0]) {
      contactId = existing[0].id;
    }
    await sql`
      INSERT INTO event_checkins (
        event_id, workspace_id, contact_id,
        full_name, email, company, title,
        source, checked_in_by
      ) VALUES (
        ${EVENT_ID}, ${WORKSPACE_ID}, ${contactId},
        ${w.name}, ${w.email}, ${w.company}, ${w.title},
        'WALK_IN'::checkin_source, ${SARAH_ID}
      )
    `;
    console.log(`   Walk-in check-in: ${w.name}`);
  }

  // ─── 3. Set guest roles for ALL contacts ─────────────────────────────
  console.log('\n3. Setting guest roles for all contacts...');

  for (const [name, role] of Object.entries(ROLE_MAP)) {
    const result = await sql`
      UPDATE people_contacts SET guest_role = ${role}
      WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${name}
    `;
    const count = (result as any).count ?? result.length ?? 0;
    console.log(`   ${name} → ${role}${count > 0 ? '' : ' (not found)'}`);
  }

  // ─── 4. Fix campaign created_at to match sent dates ──────────────────
  console.log('\n4. Fixing campaign sent dates...');

  // Founding Table was sent March 20
  await sql`
    UPDATE invitation_campaigns
    SET created_at = '2026-03-20T14:00:00Z'
    WHERE event_id = ${EVENT_ID}
      AND name LIKE '%Founding Table%'
  `;
  console.log('   Founding Table → 2026-03-20');

  // Extended Circle was sent March 28
  await sql`
    UPDATE invitation_campaigns
    SET created_at = '2026-03-28T14:00:00Z'
    WHERE event_id = ${EVENT_ID}
      AND name LIKE '%Extended Circle%'
  `;
  console.log('   Extended Circle → 2026-03-28');

  // ─── 5. Update denormalized campaign counts (re-run from round 3) ────
  console.log('\n5. Updating campaign counts...');

  const campaigns = await sql`
    SELECT id FROM invitation_campaigns WHERE event_id = ${EVENT_ID}
  `;
  for (const c of campaigns) {
    await sql`
      UPDATE invitation_campaigns SET
        total_considering = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${c.id} AND status = 'CONSIDERING'),
        total_invited = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${c.id} AND status IN ('INVITED', 'ACCEPTED', 'DECLINED')),
        total_accepted = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${c.id} AND status = 'ACCEPTED'),
        total_declined = (SELECT COUNT(*) FROM campaign_invitations WHERE campaign_id = ${c.id} AND status = 'DECLINED')
      WHERE id = ${c.id}
    `;
  }
  console.log('   Campaign counts updated');

  // ─── 6. Generate briefing content ────────────────────────────────────
  console.log('\n6. Generating briefing content...');

  // Delete existing briefings for clean slate
  await sql`DELETE FROM briefing_packets WHERE event_id = ${EVENT_ID}`;

  // Get team member user IDs
  const sarahUser = await sql`SELECT id FROM users WHERE full_name = 'Sarah Chen' LIMIT 1`;
  const marcusUser = await sql`SELECT id FROM users WHERE full_name = 'Marcus Rivera' LIMIT 1`;
  const juliaUser = await sql`SELECT id FROM users WHERE full_name = 'Julia Park' LIMIT 1`;

  const sarahUserId = sarahUser[0]?.id || SARAH_ID;
  const marcusUserId = marcusUser[0]?.id || sarahUserId;
  const juliaUserId = juliaUser[0]?.id || sarahUserId;

  // Get guest data for briefings
  const allGuests = await sql`
    SELECT pc.id, pc.full_name, pc.company, pc.title, pc.guest_role,
           gs.relevance_score, gs.score_rationale, gs.talking_points, gs.matched_objectives,
           gta.assigned_to
    FROM people_contacts pc
    LEFT JOIN guest_scores gs ON gs.contact_id = pc.id AND gs.event_id = ${EVENT_ID}
    LEFT JOIN guest_team_assignments gta ON gta.contact_id = pc.id AND gta.event_id = ${EVENT_ID}
    WHERE pc.workspace_id = ${WORKSPACE_ID}
      AND pc.id IN (
        SELECT contact_id FROM campaign_invitations
        WHERE event_id = ${EVENT_ID} AND status = 'ACCEPTED' AND contact_id IS NOT NULL
      )
    ORDER BY gs.relevance_score DESC NULLS LAST
  `;

  function buildGuestBriefing(guest: any) {
    return {
      contact_id: guest.id,
      full_name: guest.full_name,
      company: guest.company,
      title: guest.title,
      relevance_score: guest.relevance_score || 0,
      talking_points: guest.talking_points || [],
      score_rationale: guest.score_rationale || '',
      key_interests: [],
      conversation_starters: [],
    };
  }

  // Divide guests among team members
  const sarahGuests = allGuests.filter((g: any) => g.assigned_to === sarahUserId);
  const marcusGuests = allGuests.filter((g: any) => g.assigned_to === marcusUserId);
  const juliaGuests = allGuests.filter((g: any) => g.assigned_to === juliaUserId);

  // If assignments are empty, distribute evenly
  const assignedGuestIds = new Set([...sarahGuests, ...marcusGuests, ...juliaGuests].map((g: any) => g.id));
  const unassigned = allGuests.filter((g: any) => !assignedGuestIds.has(g.id));

  // Distribute unassigned guests round-robin
  const groups = [sarahGuests, marcusGuests, juliaGuests];
  unassigned.forEach((g: any, i: number) => {
    groups[i % 3].push(g);
  });

  // Pre-Event Briefing — Sarah Chen
  const preEventContent = {
    event_summary: 'Meridian Capital Partners Q2 Executive Dinner at The NoMad Restaurant, April 17, 2026 at 7:00 PM. 20-seat capacity with 17 confirmed guests plus 3 team members. Strategic focus: Fund IV LP conversations, co-investment pipeline development, and relationship deepening with Tier 1 allocators.',
    key_guests: sarahGuests.map(buildGuestBriefing),
    strategic_notes: 'Three priority conversations tonight: (1) Patricia Donovan on Fund IV co-investment — she manages $2.8B in alternatives at CalPERS and has expressed interest in North American deal flow. (2) James Harrington keynote follow-up — leverage his Blackstone network for future speaker pipeline. (3) Walter Edmonds introduction — first time at our event, represents Temasek\'s $380B sovereign wealth fund.',
    agenda_highlights: [
      '6:30 PM — Team arrives for final setup and briefing',
      '7:00 PM — Guest arrival and cocktails',
      '7:30 PM — Welcome remarks by Sarah Chen',
      '7:45 PM — Keynote: James Harrington on "The Next Decade in Private Equity"',
      '8:15 PM — Dinner service begins, facilitated introductions',
      '9:30 PM — Dessert and open networking',
      '10:00 PM — Event concludes',
    ],
  };

  await sql`
    INSERT INTO briefing_packets (
      event_id, workspace_id, generated_for, briefing_type,
      status, title, content, guest_count, generated_at
    ) VALUES (
      ${EVENT_ID}, ${WORKSPACE_ID}, ${sarahUserId}, 'PRE_EVENT',
      'READY', 'Pre-Event Briefing — Sarah Chen',
      ${JSON.stringify(preEventContent)}::jsonb,
      ${sarahGuests.length}, NOW()
    )
  `;
  console.log(`   Pre-Event Briefing: ${sarahGuests.length} guests`);

  // Morning-of Briefing — Marcus Rivera
  const morningContent = {
    event_summary: 'Day-of logistics for the Q2 Executive Dinner. Venue: The NoMad Restaurant, 1170 Broadway. Doors open at 6:30 PM for team, 7:00 PM for guests. Marcus is responsible for door management, guest arrivals, and walk-in protocol.',
    key_guests: marcusGuests.map(buildGuestBriefing),
    strategic_notes: 'Walk-in protocol: Any unannounced guest should be welcomed, registered via the walk-in form, and seated if space allows. Escalate to Sarah if the guest claims a connection to Meridian or references an invitation. Two walk-ins expected based on informal RSVPs: Yuki Tanaka (MUFG) and Gregory Mansfield (advisory).',
    agenda_highlights: [
      'Confirm venue setup: 20 seats at 4 round tables of 5',
      'Test QR check-in system at door',
      'Brief door staff on VIP arrival protocol',
      'Coordinate with kitchen on dietary restrictions',
      'Set up name cards at assigned seats',
      'Prepare walk-in registration tablets',
    ],
  };

  await sql`
    INSERT INTO briefing_packets (
      event_id, workspace_id, generated_for, briefing_type,
      status, title, content, guest_count, generated_at
    ) VALUES (
      ${EVENT_ID}, ${WORKSPACE_ID}, ${marcusUserId}, 'MORNING',
      'READY', 'Morning-of Briefing — Marcus Rivera',
      ${JSON.stringify(morningContent)}::jsonb,
      ${marcusGuests.length}, NOW()
    )
  `;
  console.log(`   Morning-of Briefing: ${marcusGuests.length} guests`);

  // End-of-Day Briefing — Julia Park
  const eodContent = {
    event_summary: 'Post-event recap for the Q2 Executive Dinner. All 17 confirmed guests attended plus 2 walk-ins (Yuki Tanaka, Gregory Mansfield), bringing total attendance to 22 (including 3 team). Event ran from 7:00 PM to 10:15 PM.',
    key_guests: juliaGuests.map(buildGuestBriefing),
    strategic_notes: 'Key outcomes: (1) Patricia Donovan committed to a follow-up call re: Fund IV co-investment — schedule for next Tuesday. (2) Andrew Sterling raised enterprise SaaS co-investment opportunity — connect with deal team. (3) Diana Okonkwo and Patricia Donovan had strong chemistry — seat together at future events. (4) Yuki Tanaka (walk-in from MUFG) showed strong interest in Asian market allocation — add to Tier 1 for next event.',
    agenda_highlights: [
      'Send thank-you emails to all attendees within 24 hours',
      'Schedule follow-up call with Patricia Donovan (Fund IV)',
      'Schedule follow-up call with Andrew Sterling (SaaS co-invest)',
      'Add Yuki Tanaka and Gregory Mansfield to contact database',
      'Update guest scores based on event interactions',
      'Begin planning Q3 dinner based on tonight\'s insights',
    ],
  };

  await sql`
    INSERT INTO briefing_packets (
      event_id, workspace_id, generated_for, briefing_type,
      status, title, content, guest_count, generated_at
    ) VALUES (
      ${EVENT_ID}, ${WORKSPACE_ID}, ${juliaUserId}, 'END_OF_DAY',
      'READY', 'End-of-Day Briefing — Julia Park',
      ${JSON.stringify(eodContent)}::jsonb,
      ${juliaGuests.length}, NOW()
    )
  `;
  console.log(`   End-of-Day Briefing: ${juliaGuests.length} guests`);

  console.log('\n=== Round 4 seed complete ===');

  // Final counts verification
  const finalCheckins = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE source = 'WALK_IN')::int AS walk_ins
    FROM event_checkins WHERE event_id = ${EVENT_ID}
  `;
  const finalAccepted = await sql`
    SELECT COUNT(*)::int AS count
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${EVENT_ID} AND ci.status = 'ACCEPTED'
  `;
  const finalNotArrived = await sql`
    SELECT COUNT(*)::int AS count
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    JOIN people_contacts c ON c.id = ci.contact_id
    LEFT JOIN event_checkins ec ON ec.contact_id = c.id AND ec.event_id = ${EVENT_ID}
    WHERE ic.event_id = ${EVENT_ID}
      AND ci.status = 'ACCEPTED'
      AND ec.id IS NULL
  `;

  console.log('\n── Verification ──');
  console.log(`Total check-ins: ${finalCheckins[0].total} (${finalCheckins[0].walk_ins} walk-ins)`);
  console.log(`Accepted invitations: ${finalAccepted[0].count}`);
  console.log(`Not arrived (should be 0): ${finalNotArrived[0].count}`);
}

main().catch(console.error);

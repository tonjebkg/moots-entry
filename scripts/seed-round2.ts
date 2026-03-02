/**
 * Round 2 seed data — fixes from platform review
 *
 * This script:
 * 1. Links campaign_invitations to the correct invitation_campaigns
 * 2. Seeds briefings with real content for team members
 * 3. Adds team members as checked-in guests with Team badge
 * 4. Updates James Harrington → Speaker role, Martin Cross → Partner role
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_cs1PUwVQx2lv@ep-lively-shape-a8jf1wnz.eastus2.azure.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

const EVENT_ID = 86;
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

// Team member user IDs (actual DB values)
const SARAH_ID = 'a760548b-b5f9-43da-b680-be4378b72797';
const MARCUS_ID = '5ada8014-c458-4005-a2c7-eec0f09d48de';
const JULIA_ID = '40adc4fb-c373-472a-9ddc-4e31ba2e17b8';

async function main() {
  console.log('=== Round 2 seed data ===\n');

  // ─── 1. Ensure campaigns exist and link invitations ─────────────────

  console.log('1. Setting up invitation campaigns...');

  // Get existing campaigns
  const existingCampaigns = await sql`
    SELECT id, name FROM invitation_campaigns WHERE event_id = ${EVENT_ID}
  `;
  console.log(`   Found ${existingCampaigns.length} existing campaigns`);

  let foundingId: string;
  let extendedId: string;

  // Check for Founding Table campaign
  const founding = existingCampaigns.find((c: any) => c.name?.includes('Founding'));
  if (founding) {
    foundingId = founding.id;
    console.log(`   Using existing Founding Table campaign: ${foundingId}`);
  } else {
    const result = await sql`
      INSERT INTO invitation_campaigns (event_id, name, description, status, total_invited, total_accepted, total_declined)
      VALUES (
        ${EVENT_ID},
        'Q2 Executive Dinner — Founding Table',
        'First wave: 12 highest-priority guests for the core dinner table',
        'COMPLETED',
        12, 10, 1
      )
      RETURNING id
    `;
    foundingId = result[0].id;
    console.log(`   Created Founding Table campaign: ${foundingId}`);
  }

  // Check for Extended Circle campaign
  const extended = existingCampaigns.find((c: any) => c.name?.includes('Extended'));
  if (extended) {
    extendedId = extended.id;
    console.log(`   Using existing Extended Circle campaign: ${extendedId}`);
  } else {
    const result = await sql`
      INSERT INTO invitation_campaigns (event_id, name, description, status, total_invited, total_accepted, total_declined)
      VALUES (
        ${EVENT_ID},
        'Q2 Executive Dinner — Extended Circle',
        'Second wave: 10 additional guests to fill remaining seats',
        'COMPLETED',
        10, 7, 2
      )
      RETURNING id
    `;
    extendedId = result[0].id;
    console.log(`   Created Extended Circle campaign: ${extendedId}`);
  }

  // Update campaign stats
  await sql`
    UPDATE invitation_campaigns SET
      status = 'COMPLETED',
      total_invited = 12, total_accepted = 10, total_declined = 1
    WHERE id = ${foundingId}
  `;
  await sql`
    UPDATE invitation_campaigns SET
      status = 'COMPLETED',
      total_invited = 10, total_accepted = 7, total_declined = 2
    WHERE id = ${extendedId}
  `;

  // Get all invitations
  const invitations = await sql`
    SELECT id, full_name, email, status, campaign_id FROM campaign_invitations WHERE event_id = ${EVENT_ID}
  `;
  console.log(`   Found ${invitations.length} invitations`);

  // Founding Table guests (12): highest priority
  const foundingGuests = [
    'Patricia Donovan', 'Philip Wainwright', 'Walter Edmonds', 'Andrew Sterling',
    'James Harrington', 'Charles Montgomery', 'Elizabeth Waverly', 'Diana Okonkwo',
    'Lisa Chang', 'Louise Hensley', 'Oliver Pennington', 'David Nakamura'
  ];

  // Extended Circle guests (10)
  const extendedGuests = [
    'Eleanor Blackwood', 'Martin Cross', 'Fiona O\'Malley', 'Brian Callahan',
    'Sofia Chen-Ramirez', 'Dahlia Rosenberg', 'Robert Kensington',
    'Victoria Langley', 'Sarah Worthington', 'Yuki Tanaka'
  ];

  for (const inv of invitations) {
    const name = inv.full_name;
    if (foundingGuests.includes(name)) {
      await sql`UPDATE campaign_invitations SET campaign_id = ${foundingId} WHERE id = ${inv.id}`;
    } else if (extendedGuests.includes(name)) {
      await sql`UPDATE campaign_invitations SET campaign_id = ${extendedId} WHERE id = ${inv.id}`;
    }
  }

  // Set specific statuses per narrative
  const declinedNames = ['David Nakamura', 'Victoria Langley', 'Sarah Worthington'];
  const pendingNames = ['Dahlia Rosenberg', 'Robert Kensington'];

  for (const name of declinedNames) {
    await sql`
      UPDATE campaign_invitations SET status = 'DECLINED'
      WHERE event_id = ${EVENT_ID} AND full_name = ${name}
    `;
  }
  for (const name of pendingNames) {
    await sql`
      UPDATE campaign_invitations SET status = 'INVITED'
      WHERE event_id = ${EVENT_ID} AND full_name = ${name}
    `;
  }

  // Set RSVP dates for accepted guests
  await sql`
    UPDATE campaign_invitations SET
      rsvp_email_sent_at = COALESCE(rsvp_email_sent_at, '2026-03-20T14:00:00.000Z'),
      rsvp_responded_at = COALESCE(rsvp_responded_at, '2026-03-22T10:30:00.000Z')
    WHERE event_id = ${EVENT_ID} AND status = 'ACCEPTED'
  `;
  await sql`
    UPDATE campaign_invitations SET
      rsvp_email_sent_at = COALESCE(rsvp_email_sent_at, '2026-03-20T14:00:00.000Z'),
      rsvp_responded_at = COALESCE(rsvp_responded_at, '2026-03-24T09:15:00.000Z')
    WHERE event_id = ${EVENT_ID} AND status = 'DECLINED'
  `;
  await sql`
    UPDATE campaign_invitations SET
      rsvp_email_sent_at = COALESCE(rsvp_email_sent_at, '2026-03-28T14:00:00.000Z')
    WHERE event_id = ${EVENT_ID} AND status = 'INVITED'
  `;

  console.log('   Campaign invitations linked and statuses set');

  // ─── 2. Add team members as checked-in guests ──────────────────────

  console.log('\n2. Adding team members as checked-in guests...');

  const teamCheckins = [
    { userId: JULIA_ID, name: 'Julia Park', title: 'Operations Lead', company: 'Meridian Capital Partners', time: '2026-04-17T22:15:00.000Z' },
    { userId: SARAH_ID, name: 'Sarah Chen', title: 'Event Lead', company: 'Meridian Capital Partners', time: '2026-04-17T22:30:00.000Z' },
    { userId: MARCUS_ID, name: 'Marcus Rivera', title: 'Guest Relations', company: 'Meridian Capital Partners', time: '2026-04-17T22:30:00.000Z' },
  ];

  for (const tm of teamCheckins) {
    // Check if already checked in
    const existing = await sql`
      SELECT id FROM event_checkins WHERE event_id = ${EVENT_ID} AND full_name = ${tm.name}
    `;
    if (existing.length > 0) {
      console.log(`   ${tm.name} already checked in, skipping`);
      continue;
    }

    // Find their contact_id
    const contacts = await sql`
      SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${tm.name} LIMIT 1
    `;
    const contactId = contacts[0]?.id || null;

    await sql`
      INSERT INTO event_checkins (event_id, workspace_id, contact_id, full_name, email, company, title, source, checked_in_by, notes)
      VALUES (
        ${EVENT_ID}, ${WORKSPACE_ID}, ${contactId}, ${tm.name}, ${tm.name.toLowerCase().replace(' ', '.') + '@meridian.com'},
        ${tm.company}, ${tm.title}, 'INVITATION', ${SARAH_ID}, 'Team member'
      )
    `;

    // Set the timestamp
    await sql`
      UPDATE event_checkins SET created_at = ${tm.time}
      WHERE event_id = ${EVENT_ID} AND full_name = ${tm.name}
    `;

    console.log(`   Added ${tm.name} as checked-in (${tm.title})`);
  }

  // Ensure team members have people_contacts records with team role
  for (const tm of teamCheckins) {
    const existing = await sql`
      SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${tm.name}
    `;
    if (existing.length === 0) {
      await sql`
        INSERT INTO people_contacts (workspace_id, full_name, company, title, source, source_detail, guest_role)
        VALUES (${WORKSPACE_ID}, ${tm.name}, ${tm.company}, ${tm.title}, 'MANUAL', 'Team member', 'TEAM_MEMBER')
      `;
      console.log(`   Created contact record for ${tm.name}`);
    } else {
      await sql`
        UPDATE people_contacts SET guest_role = 'TEAM_MEMBER', company = ${tm.company}, title = ${tm.title}
        WHERE id = ${existing[0].id}
      `;
    }
  }

  // ─── 3. Update role diversity ──────────────────────────────────────

  console.log('\n3. Updating guest roles for demo diversity...');

  // James Harrington → Speaker
  await sql`
    UPDATE people_contacts SET guest_role = 'SPEAKER'
    WHERE workspace_id = ${WORKSPACE_ID} AND full_name = 'James Harrington'
  `;
  console.log('   James Harrington → Speaker');

  // Martin Cross → Partner
  await sql`
    UPDATE people_contacts SET guest_role = 'PARTNER'
    WHERE workspace_id = ${WORKSPACE_ID} AND full_name = 'Martin Cross'
  `;
  console.log('   Martin Cross → Partner');

  // ─── 4. Seed briefings with real content ───────────────────────────

  console.log('\n4. Seeding briefings...');

  // Delete existing briefings for this event
  await sql`DELETE FROM briefing_packets WHERE event_id = ${EVENT_ID}`;

  const briefings = [
    {
      type: 'PRE_EVENT',
      title: 'Pre-Event Briefing — Sarah Chen',
      generatedFor: SARAH_ID,
      content: {
        event_summary: "Tonight's Q2 Executive Dinner brings together 17 senior institutional investors and advisors at The Langham, New York. As Event Lead, you're responsible for VIP guest engagement and ensuring strategic conversations happen organically. Your 8 assigned guests represent $4.2B in combined AUM — focus on Patricia Donovan (CalPERS) and Philip Wainwright (ADIA) as the two highest-value relationships tonight.",
        agenda_highlights: [
          '6:30 PM — Team arrival and venue walkthrough',
          '7:00 PM — Guest arrival begins; cocktail reception in the Garden Lounge',
          '7:30 PM — Welcome remarks from Managing Partner',
          '7:45 PM — James Harrington (Blackstone) keynote: Q2 Market Outlook',
          '8:15 PM — Seated dinner service begins',
          '9:30 PM — Dessert and open networking',
          '10:00 PM — Wrap-up'
        ],
        strategic_notes: "Key objective: deepen LP relationships ahead of Fund IV launch in Q3. Patricia Donovan is evaluating emerging managers — tonight is our chance to establish trust before the formal pitch. Elizabeth Waverly (ADIA) has signaled interest in co-investment opportunities; introduce her to Andrew Sterling (Meridian Fund III) to discuss direct deal flow. Watch for David Nakamura — he declined but his colleague Diana Okonkwo is attending; she may have insights on their allocation decisions.",
        key_guests: [
          {
            contact_id: '',
            full_name: 'Patricia Donovan',
            company: 'CalPERS',
            title: 'Director of Alternative Investments',
            relevance_score: 97,
            talking_points: [
              'CalPERS recently increased PE allocation to 13% — ask about their emerging manager mandate',
              'She led CalPERS\' investment in Meridian Fund II ($25M) — express appreciation and share Fund III performance update',
              'Her daughter just graduated from Stanford MBA — natural conversation starter'
            ],
            score_rationale: 'Top LP relationship. CalPERS is expanding emerging manager allocations, directly aligned with Fund IV fundraise.',
            key_interests: ['Emerging managers', 'ESG integration', 'GP transparency'],
            conversation_starters: ['How is CalPERS thinking about private equity allocations post-2025?', 'I heard the emerging manager program is expanding — congratulations']
          },
          {
            contact_id: '',
            full_name: 'Philip Wainwright',
            company: 'Abu Dhabi Investment Authority',
            title: 'Senior Portfolio Director',
            relevance_score: 95,
            talking_points: [
              'ADIA doubled their mid-market PE allocation last year — explore co-investment appetite',
              'He\'s evaluating US market re-entry strategies — position Meridian\'s sector expertise',
              'Known wine enthusiast — the sommelier has a 2018 Barolo selected for his table'
            ],
            score_rationale: 'ADIA represents sovereign wealth capital at scale. Co-investment interest aligns with our LP strategy.',
            key_interests: ['Co-investments', 'US mid-market', 'Technology sector'],
            conversation_starters: ['How is ADIA approaching US mid-market exposure in the current environment?']
          },
          {
            contact_id: '',
            full_name: 'Andrew Sterling',
            company: 'Meridian Fund III',
            title: 'Portfolio Director',
            relevance_score: 92,
            talking_points: [
              'Fund III is at 2.1x MOIC — use this as a proof point in LP conversations tonight',
              'His recent Nextera Health exit returned 4.3x — great case study for institutional LPs',
              'Facilitate introduction with Elizabeth Waverly (ADIA) for co-investment discussion'
            ],
            score_rationale: 'Key internal leader. His Fund III track record is our strongest pitch asset for Fund IV.',
            key_interests: ['Healthcare exits', 'Fund performance', 'LP engagement'],
            conversation_starters: ['The Nextera exit was impressive — LPs will want to hear the story directly']
          },
          {
            contact_id: '',
            full_name: 'Walter Edmonds',
            company: 'Ontario Teachers\' Pension Plan',
            title: 'Managing Director, Private Equity',
            relevance_score: 90,
            talking_points: [
              'OTPP is increasing US PE exposure — they\'re evaluating 6 new GP relationships this year',
              'He was skeptical of mid-market after 2023 — show him our recent vintage performance data',
              'Mutual connection through HBS class of 2008'
            ],
            score_rationale: 'OTPP has massive PE allocation ($45B+) and is actively seeking new GP relationships.',
            key_interests: ['Vintage analysis', 'Mid-market value creation', 'GP governance'],
            conversation_starters: ['I understand OTPP is expanding GP relationships — we\'d love to share our approach']
          },
          {
            contact_id: '',
            full_name: 'Elizabeth Waverly',
            company: 'Abu Dhabi Investment Authority',
            title: 'Deputy Director, Private Equity',
            relevance_score: 94,
            talking_points: [
              'ADIA co-investment desk has $2B annual deployment target — significant opportunity',
              'She championed ADIA\'s investment in our Fund II alongside Philip Wainwright',
              'Introduce her to Andrew Sterling to discuss direct deal flow in healthcare sector'
            ],
            score_rationale: 'Senior ADIA decision-maker with co-investment mandate aligned with our LP strategy.',
            key_interests: ['Co-investments', 'Healthcare', 'Direct deal sourcing'],
            conversation_starters: ['Philip mentioned your co-investment desk is particularly active this year']
          }
        ]
      }
    },
    {
      type: 'MORNING',
      title: 'Morning-of Briefing — Marcus Rivera',
      generatedFor: MARCUS_ID,
      content: {
        event_summary: "You're on door and check-in duty tonight at The Langham. 17 confirmed guests plus 2 potential walk-ins makes this a full house for our 20-seat capacity. Your 5 assigned guests include our keynote speaker James Harrington and walk-in Gregory Mansfield — keep a close eye on arrivals between 7:00-7:15 PM when the bulk will arrive. Remember: every guest should feel like the most important person in the room from the moment they step in.",
        agenda_highlights: [
          '6:15 PM — Julia Park arrives for venue coordination',
          '6:30 PM — You and Sarah arrive; test check-in system, review guest photos',
          '6:45 PM — Verify name cards, table assignments, gift bags',
          '7:00 PM — Doors open, begin check-in process',
          '7:30 PM — All confirmed guests should have arrived',
          '7:45 PM — James Harrington keynote begins (ensure AV is ready by 7:40)',
          'Walk-in protocol: QR code registration at door, route to Sarah for vetting'
        ],
        strategic_notes: "James Harrington (Blackstone) is our keynote speaker — he needs to be escorted directly to the staging area upon arrival, not into the cocktail reception. Gregory Mansfield is a walk-in referral from Philip Wainwright — treat him as VIP despite not being on the original list. Lisa Chang (Goldman) tends to arrive late; text Sarah if she hasn't checked in by 7:20. Diana Okonkwo (Sony) is attending in place of David Nakamura who declined — she may need extra context on the evening's agenda.",
        key_guests: [
          {
            contact_id: '',
            full_name: 'James Harrington',
            company: 'Blackstone',
            title: 'Managing Director, Private Equity',
            relevance_score: 88,
            talking_points: [
              'He\'s giving the keynote on Q2 Market Outlook — make sure he has water and his notes',
              'Escort him to the staging area immediately upon arrival, not to cocktails',
              'His assistant confirmed arrival at 7:15 PM sharp'
            ],
            score_rationale: 'Keynote speaker and senior Blackstone contact. His presence elevates the event for all attendees.',
            key_interests: ['Market outlook', 'Deal flow', 'LP sentiment'],
            conversation_starters: ['Welcome, James. Let me take you straight to the staging area.']
          },
          {
            contact_id: '',
            full_name: 'Gregory Mansfield',
            company: 'Wellington Management',
            title: 'Partner, Alternative Investments',
            relevance_score: 82,
            talking_points: [
              'Walk-in referral from Philip Wainwright — treat as VIP',
              'Wellington has $50B in alternatives — significant institutional capital',
              'First time meeting our team — make a strong first impression'
            ],
            score_rationale: 'New relationship opportunity. Wellington is expanding PE allocations.',
            key_interests: ['PE allocation expansion', 'Manager selection', 'Risk management'],
            conversation_starters: ['Philip mentioned you\'d be joining us tonight — wonderful to have you']
          },
          {
            contact_id: '',
            full_name: 'Lisa Chang',
            company: 'Goldman Sachs Asset Management',
            title: 'Managing Director',
            relevance_score: 85,
            talking_points: [
              'She tends to arrive 10-15 minutes late — have a drink ready for her',
              'Goldman AM is building out their PE co-investment program',
              'She was recently promoted to MD — congratulations are in order'
            ],
            score_rationale: 'Goldman Sachs AM represents significant institutional capital with active PE program.',
            key_interests: ['Co-investments', 'Technology sector PE', 'ESG'],
            conversation_starters: ['Congratulations on the promotion, Lisa!']
          },
          {
            contact_id: '',
            full_name: 'Diana Okonkwo',
            company: 'Sony Financial Ventures',
            title: 'VP of Strategic Investments',
            relevance_score: 76,
            talking_points: [
              'Attending in place of David Nakamura (who declined) — she may need extra context',
              'Sony FV is exploring PE fund-of-funds strategy',
              'First interaction with Meridian — be welcoming and provide agenda context'
            ],
            score_rationale: 'Sony FV is building PE allocation strategy. New relationship to cultivate.',
            key_interests: ['Fund of funds', 'Technology crossover', 'Strategic partnerships'],
            conversation_starters: ['Welcome, Diana. Let me give you a quick overview of tonight\'s agenda.']
          },
          {
            contact_id: '',
            full_name: 'Eleanor Blackwood',
            company: 'Sequoia Heritage',
            title: 'Partner',
            relevance_score: 91,
            talking_points: [
              'Sequoia Heritage manages $15B — significant endowment and family office capital',
              'She previously invested in Meridian Fund I — a returning relationship',
              'Known for early arrivals — she\'ll likely be one of the first'
            ],
            score_rationale: 'Returning LP from Fund I. Sequoia Heritage represents high-quality institutional capital.',
            key_interests: ['Venture-to-PE crossover', 'Fund I track record', 'Co-investments'],
            conversation_starters: ['Eleanor, wonderful to see you again! It\'s been since the Fund I close.']
          }
        ]
      }
    },
    {
      type: 'END_OF_DAY',
      title: 'End-of-Day Briefing — Julia Park',
      generatedFor: JULIA_ID,
      content: {
        event_summary: "Wrap-up operations for tonight's Q2 Executive Dinner. 19 of 20 seats filled (17 guests + 2 walk-ins). Check-in rate was 100% for confirmed guests — excellent execution. Your 5 assigned guests are all in follow-up mode now. Focus on capturing conversation notes, flagging any commitments made during dinner, and ensuring all guest contact info is up to date for Sarah's follow-up sequence.",
        agenda_highlights: [
          '10:00 PM — Begin wrap-up, thank remaining guests personally',
          '10:15 PM — Collect conversation notes from Sarah and Marcus',
          '10:30 PM — Verify all check-in data is complete',
          '10:45 PM — Coordinate with venue on final catering count',
          '11:00 PM — Send same-night thank-you text to VIP guests',
          'Tomorrow AM — Compile event summary for Managing Partner'
        ],
        strategic_notes: "Key follow-ups to track: (1) Patricia Donovan requested a Fund IV pitch deck — Sarah to send by Monday. (2) Philip Wainwright + Andrew Sterling exchanged cards for co-investment discussion — schedule a call within 2 weeks. (3) Gregory Mansfield (walk-in) expressed strong interest in Fund IV — he's a warm lead from Philip. (4) Sofia Chen-Ramirez mentioned her CIO is reviewing emerging managers in Q3 — critical timing for our fundraise. (5) Martin Cross (Deloitte) offered to make introductions to 3 pension fund CIOs.",
        key_guests: [
          {
            contact_id: '',
            full_name: 'Louise Hensley',
            company: 'Future Fund (Australia)',
            title: 'Head of Private Equity',
            relevance_score: 86,
            talking_points: [
              'She had a 20-minute conversation with the Managing Partner — capture key points',
              'Future Fund is increasing US PE allocation by $500M — we need to be in that pipeline',
              'She mentioned returning to NYC in June — flag for a follow-up dinner'
            ],
            score_rationale: 'Australian sovereign wealth fund increasing US PE. Strategic long-term relationship.',
            key_interests: ['US PE allocation', 'Manager governance', 'ESG integration'],
            conversation_starters: ['Thank you for making the trip from Melbourne, Louise']
          },
          {
            contact_id: '',
            full_name: 'Oliver Pennington',
            company: 'Yale Endowment',
            title: 'Director, Alternative Assets',
            relevance_score: 89,
            talking_points: [
              'Yale Endowment model is the gold standard — being in their pipeline would be transformational',
              'He seemed particularly interested in our healthcare thesis',
              'Follow up with a case study on the Nextera Health exit'
            ],
            score_rationale: 'Yale Endowment is the ultimate institutional LP. Any allocation would be significant signal.',
            key_interests: ['Healthcare PE', 'Value creation', 'Long-term partnerships'],
            conversation_starters: ['We\'ll send the Nextera case study first thing Monday']
          },
          {
            contact_id: '',
            full_name: 'Martin Cross',
            company: 'Deloitte Private Equity',
            title: 'National PE Practice Leader',
            relevance_score: 79,
            talking_points: [
              'Offered to introduce us to 3 pension fund CIOs — critical follow-up',
              'Deloitte does PE due diligence for many of our target LPs',
              'Schedule a working lunch within 2 weeks to formalize the introductions'
            ],
            score_rationale: 'Strategic partner with access to pension fund decision-makers. High referral value.',
            key_interests: ['PE advisory', 'LP introductions', 'Due diligence'],
            conversation_starters: ['Your offer to introduce us was incredibly generous, Martin']
          },
          {
            contact_id: '',
            full_name: 'Fiona O\'Malley',
            company: 'Ireland Strategic Investment Fund',
            title: 'Senior Investment Manager',
            relevance_score: 83,
            talking_points: [
              'ISIF has a $15B mandate with growing US PE interest',
              'She connected well with Elizabeth Waverly (ADIA) — potential co-investment syndicate',
              'Follow up with a one-pager on Fund IV terms'
            ],
            score_rationale: 'Sovereign wealth fund with expanding US PE allocation. New relationship opportunity.',
            key_interests: ['Sovereign wealth strategy', 'US mid-market', 'Co-investments'],
            conversation_starters: ['I noticed you and Elizabeth had a great conversation — we should explore a co-investment structure']
          },
          {
            contact_id: '',
            full_name: 'Brian Callahan',
            company: 'MassMutual',
            title: 'Head of Private Markets',
            relevance_score: 78,
            talking_points: [
              'MassMutual is a $300B insurer with growing PE allocation',
              'He mentioned they\'re looking at mid-market buyout funds specifically',
              'Send Fund III factsheet and request a formal meeting in Q2'
            ],
            score_rationale: 'Major insurance company expanding PE. Perfect fit for our fund size and strategy.',
            key_interests: ['Insurance PE allocation', 'Mid-market buyout', 'Income-oriented PE'],
            conversation_starters: ['Your insights on insurance capital in PE were fascinating, Brian']
          }
        ]
      }
    }
  ];

  for (const b of briefings) {
    // Resolve contact_ids for key_guests
    for (const guest of b.content.key_guests) {
      const contacts = await sql`
        SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${guest.full_name} LIMIT 1
      `;
      guest.contact_id = contacts[0]?.id || '';
    }

    await sql`
      INSERT INTO briefing_packets (event_id, workspace_id, generated_for, briefing_type, status, title, content, guest_count, model_version, generated_at)
      VALUES (
        ${EVENT_ID}, ${WORKSPACE_ID}, ${b.generatedFor}, ${b.type}, 'READY',
        ${b.title}, ${JSON.stringify(b.content)}::jsonb, ${b.content.key_guests.length},
        'claude-opus-4-20250514', NOW()
      )
    `;
    console.log(`   Created briefing: ${b.title}`);
  }

  // ─── 5. Update event capacity to include team ──────────────────────

  console.log('\n5. Event capacity already at 20 (correct for 17 guests + 3 team)');

  // ─── Done ──────────────────────────────────────────────────────────

  console.log('\n=== Round 2 seed complete ===');
}

main().catch(console.error);

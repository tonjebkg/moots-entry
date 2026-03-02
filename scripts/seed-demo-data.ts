/**
 * Seed demo data for Meridian Capital Partners — Q2 Executive Dinner
 *
 * This script:
 * 1. Fixes check-in timestamps (1:02 AM → realistic evening times)
 * 2. Seeds Charles Montgomery & Elizabeth Waverly profiles
 * 3. Creates team members (Sarah Chen, Marcus Rivera, Julia Park)
 * 4. Creates invitation campaigns (Founding Table + Extended Circle)
 * 5. Creates people_contacts for walk-ins and links to checkins
 * 6. Updates contact profiles with roles, priorities, tags per narrative
 * 7. Adds missing follow-ups
 * 8. Creates team assignments
 */

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_cs1PUwVQx2lv@ep-lively-shape-a8jf1wnz.eastus2.azure.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

const EVENT_ID = 86;
const WORKSPACE_ID = '557893ab-3b5f-4fed-8cc2-e095380e9c64';

async function main() {
  console.log('=== Starting demo data seed ===\n');

  // ─── 1. Fix check-in timestamps ────────────────────────────────────
  console.log('1. Fixing check-in timestamps...');

  // Andrew Sterling: 7:05 PM ET = 23:05 UTC (event is April 17)
  await sql`
    UPDATE event_checkins SET created_at = '2026-04-17T23:05:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Andrew Sterling'}
  `;

  // Patricia Donovan: 7:03 PM ET = 23:03 UTC
  await sql`
    UPDATE event_checkins SET created_at = '2026-04-17T23:03:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Patricia Donovan'}
  `;

  // Sofia Chen-Ramirez: 7:08 PM ET = 23:08 UTC
  await sql`
    UPDATE event_checkins SET created_at = '2026-04-17T23:08:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Sofia Chen-Ramirez'}
  `;

  // Also mark Patricia and Sofia checked_in on their invitations
  await sql`
    UPDATE campaign_invitations SET checked_in = TRUE, checked_in_at = '2026-04-17T23:03:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Patricia Donovan'} AND checked_in = FALSE
  `;
  await sql`
    UPDATE campaign_invitations SET checked_in = TRUE, checked_in_at = '2026-04-17T23:08:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Sofia Chen-Ramirez'} AND checked_in = FALSE
  `;
  await sql`
    UPDATE campaign_invitations SET checked_in = TRUE, checked_in_at = '2026-04-17T23:05:00.000Z'
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Andrew Sterling'} AND checked_in = FALSE
  `;

  console.log('  ✓ Fixed timestamps for Andrew Sterling, Patricia Donovan, Sofia Chen-Ramirez');

  // ─── 2. Seed Charles Montgomery & Elizabeth Waverly ─────────────────
  console.log('\n2. Seeding Charles Montgomery & Elizabeth Waverly profiles...');

  const charlesId = '46f5dbdd-aad9-4670-a87e-afd58de4574e';
  const elizabethId = 'fad42a2a-71ac-4411-8d76-60ed1ab3dd19';

  await sql`
    UPDATE people_contacts SET
      company = ${'CalPERS'},
      title = ${'Senior Portfolio Manager, Private Equity'},
      guest_role = ${'LP'},
      guest_priority = ${'VIP'},
      tags = ${['Pension', 'Mega-Allocator', 'New LP Prospect']},
      industry = ${'Public Pension'},
      role_seniority = ${'VP / Director'},
      emails = ${JSON.stringify([{email: 'c.montgomery@calpers.ca.gov', label: 'work'}])}::jsonb,
      linkedin_url = ${'https://linkedin.com/in/charlesmontgomery'},
      ai_summary = ${'Charles Montgomery oversees $40B in PE commitments at CalPERS, the largest US public pension ($502B AUM). CalPERS is actively increasing PE allocation and launching a new mid-market initiative. A relationship with Charles could lead to a $100M+ Fund IV commitment — Meridian\'s biggest LP win. He has a track record of backing emerging mid-market managers and is known for hands-on portfolio construction.'},
      enrichment_status = ${'COMPLETED'}
    WHERE id = ${charlesId}
  `;

  // Update score rationale for Charles
  await sql`
    UPDATE guest_scores SET
      score_rationale = ${'Charles Montgomery manages $40B in PE allocations at CalPERS ($502B AUM), the largest US public pension fund. CalPERS is actively increasing PE allocation and has launched a new mid-market initiative — a perfect fit for Meridian\'s fund size. A commitment from CalPERS would be transformational for Fund IV fundraising and would signal institutional validation to other LPs. Near-perfect alignment on all criteria.'},
      talking_points = ${JSON.stringify([
        'CalPERS recently announced a 15% increase in PE allocation targets — discuss how Meridian\'s mid-market focus fits their new initiative',
        'Charles has backed 3 emerging managers in the last 2 years. Reference Meridian\'s Fund III track record (2.1x MOIC)',
        'Ask about CalPERS\' new co-investment program — Meridian could offer deal-by-deal co-invest alongside Fund IV',
        'His board connections overlap with two Meridian portfolio companies — use this as a warm-up topic'
      ])}::jsonb
    WHERE contact_id = ${charlesId} AND event_id = ${EVENT_ID}
  `;

  await sql`
    UPDATE people_contacts SET
      company = ${'Abu Dhabi Investment Authority (ADIA)'},
      title = ${'Executive Director, Private Equity'},
      guest_role = ${'LP'},
      guest_priority = ${'VIP'},
      tags = ${['Sovereign Wealth', 'Middle East', 'Mega-Allocator', 'New LP Prospect']},
      industry = ${'Sovereign Wealth'},
      role_seniority = ${'C-Suite'},
      emails = ${JSON.stringify([{email: 'e.waverly@adia.ae', label: 'work'}])}::jsonb,
      linkedin_url = ${'https://linkedin.com/in/elizabethwaverly'},
      ai_summary = ${'Elizabeth Waverly oversees ADIA\'s North American PE portfolio — part of the world\'s largest sovereign wealth fund ($990B AUM). ADIA is expanding PE allocations and Elizabeth specifically focuses on mid-market opportunities. An ADIA commitment to Fund IV would put Meridian on the global institutional map. Gregory Mansfield (walk-in placement agent) has existing ADIA relationships that could facilitate this connection.'},
      enrichment_status = ${'COMPLETED'}
    WHERE id = ${elizabethId}
  `;

  // Update score rationale for Elizabeth
  await sql`
    UPDATE guest_scores SET
      score_rationale = ${'Elizabeth Waverly is Executive Director of PE at ADIA ($990B AUM), one of the world\'s largest sovereign wealth funds. She oversees North American PE investments and is actively expanding mid-market allocations. An ADIA commitment would be transformational — even a small allocation from a $990B fund could mean $150M+. Gregory Mansfield (the walk-in placement agent) has existing ADIA relationships through his Middle East network, creating a unique facilitation path.'},
      talking_points = ${JSON.stringify([
        'ADIA recently announced expansion of mid-market PE allocations in North America — discuss how Meridian\'s strategy fits',
        'Reference Gregory Mansfield\'s Middle East connections — he could facilitate deeper ADIA relationship building',
        'Elizabeth\'s Stanford GSB network overlaps with several Meridian portfolio CEOs — use as warm introduction topic',
        'Discuss Meridian\'s healthcare and enterprise software verticals — these align with ADIA\'s stated sector interests'
      ])}::jsonb
    WHERE contact_id = ${elizabethId} AND event_id = ${EVENT_ID}
  `;

  console.log('  ✓ Updated Charles Montgomery (CalPERS) and Elizabeth Waverly (ADIA)');

  // ─── 3. Create team members ─────────────────────────────────────────
  console.log('\n3. Creating team members...');

  // Check if they already exist
  const existingUsers = await sql`SELECT full_name FROM users WHERE email IN (${'sarah.chen@meridiancapital.com'}, ${'marcus.rivera@meridiancapital.com'}, ${'julia.park@meridiancapital.com'})`;

  if (existingUsers.length === 0) {
    // Hash for "demo123" — we don't need real passwords for seed data
    const demoHash = '$2a$12$LJ5eB5VyGFKPd5CQl/N9d.vFLjlw84BWx9UYlmrNQAIVWY.yqE1IG';

    const sarahResult = await sql`
      INSERT INTO users (email, password_hash, full_name, email_verified, mfa_enabled, failed_login_count)
      VALUES (${'sarah.chen@meridiancapital.com'}, ${demoHash}, ${'Sarah Chen'}, TRUE, FALSE, 0)
      RETURNING id
    `;
    const sarahId = sarahResult[0].id;

    const marcusResult = await sql`
      INSERT INTO users (email, password_hash, full_name, email_verified, mfa_enabled, failed_login_count)
      VALUES (${'marcus.rivera@meridiancapital.com'}, ${demoHash}, ${'Marcus Rivera'}, TRUE, FALSE, 0)
      RETURNING id
    `;
    const marcusId = marcusResult[0].id;

    const juliaResult = await sql`
      INSERT INTO users (email, password_hash, full_name, email_verified, mfa_enabled, failed_login_count)
      VALUES (${'julia.park@meridiancapital.com'}, ${demoHash}, ${'Julia Park'}, TRUE, FALSE, 0)
      RETURNING id
    `;
    const juliaId = juliaResult[0].id;

    // Add to workspace
    await sql`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${WORKSPACE_ID}, ${sarahId}, ${'TEAM_MEMBER'})`;
    await sql`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${WORKSPACE_ID}, ${marcusId}, ${'TEAM_MEMBER'})`;
    await sql`INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (${WORKSPACE_ID}, ${juliaId}, ${'TEAM_MEMBER'})`;

    console.log(`  ✓ Created Sarah Chen (${sarahId}), Marcus Rivera (${marcusId}), Julia Park (${juliaId})`);

    // ─── Create team assignments ─────────────────────────────────────
    console.log('\n   Creating team assignments...');

    // Helper to get contact_id by name (from event checkins)
    const checkinContacts = await sql`
      SELECT contact_id, full_name FROM event_checkins WHERE event_id = ${EVENT_ID}
    `;
    const contactMap: Record<string, string> = {};
    for (const c of checkinContacts) {
      if (c.contact_id) contactMap[c.full_name] = c.contact_id;
    }

    // Also get invitation contacts
    const invContacts = await sql`
      SELECT contact_id, full_name FROM campaign_invitations ci
      JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
      WHERE ic.event_id = ${EVENT_ID}
    `;
    for (const c of invContacts) {
      if (c.contact_id && !contactMap[c.full_name]) contactMap[c.full_name] = c.contact_id;
    }

    // Sarah Chen assignments (VIP handler)
    const sarahGuests = ['Patricia Donovan', 'Philip Wainwright', 'Walter Edmonds', 'Andrew Sterling'];
    for (const name of sarahGuests) {
      if (contactMap[name]) {
        await sql`
          INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role)
          VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${contactMap[name]}, ${sarahId}, ${'Event Lead'})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Marcus Rivera assignments (door management)
    const marcusGuests = ['James Harrington', 'Lisa Chang', 'Diana Okonkwo', 'Eleanor Blackwood'];
    for (const name of marcusGuests) {
      if (contactMap[name]) {
        await sql`
          INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role)
          VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${contactMap[name]}, ${marcusId}, ${'Guest Relations'})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    // Julia Park assignments (operations)
    const juliaGuests = ['Louise Hensley', 'Oliver Pennington', 'Martin Cross', 'Fiona O\'Malley', 'Brian Callahan'];
    for (const name of juliaGuests) {
      if (contactMap[name]) {
        await sql`
          INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role)
          VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${contactMap[name]}, ${juliaId}, ${'Operations'})
          ON CONFLICT DO NOTHING
        `;
      }
    }

    console.log('  ✓ Created team assignments');
  } else {
    console.log('  ⊘ Team members already exist, skipping');
  }

  // ─── 4. Create walk-in people_contacts ──────────────────────────────
  console.log('\n4. Creating walk-in people_contacts records...');

  // Gregory Mansfield
  const gregoryExisting = await sql`
    SELECT id FROM people_contacts
    WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${'Gregory Mansfield'}
    LIMIT 1
  `;

  let gregoryContactId: string;
  if (gregoryExisting.length === 0) {
    const gregResult = await sql`
      INSERT INTO people_contacts (
        workspace_id, full_name, first_name, last_name,
        company, title, emails, phones, linkedin_url,
        guest_role, guest_priority, tags, source, source_detail,
        ai_summary, enrichment_status, industry, role_seniority
      ) VALUES (
        ${WORKSPACE_ID}, ${'Gregory Mansfield'}, ${'Gregory'}, ${'Mansfield'},
        ${'Mansfield Advisory'}, ${'Managing Partner'},
        ${JSON.stringify([{email: 'gregory.mansfield@mansfieldadvisory.com', label: 'work'}])}::jsonb,
        ${JSON.stringify([{number: '+1 (212) 555-0147', label: 'work'}])}::jsonb,
        ${'https://linkedin.com/in/gregorymansfield'},
        ${'Placement Agent'}, ${'High'},
        ${['Fundraising', 'Distribution', 'Middle East']},
        ${'MANUAL'}::contact_source,
        ${'Walk-in at event #86 — arrived with James Harrington (Blackstone)'},
        ${'Gregory Mansfield is Managing Partner at Mansfield Advisory, an independent placement agent who has helped raise over $8B for mid-market PE funds. He has strong LP relationships in the Middle East and Southeast Asia — regions where Meridian has no distribution coverage. His arrival with James Harrington signals existing Blackstone connections. Could be instrumental in Fund IV placement for international LPs.'},
        ${'COMPLETED'},
        ${'Financial Services'},
        ${'C-Suite'}
      ) RETURNING id
    `;
    gregoryContactId = gregResult[0].id;
  } else {
    gregoryContactId = gregoryExisting[0].id;
    // Update existing record
    await sql`
      UPDATE people_contacts SET
        company = ${'Mansfield Advisory'}, title = ${'Managing Partner'},
        emails = ${JSON.stringify([{email: 'gregory.mansfield@mansfieldadvisory.com', label: 'work'}])}::jsonb,
        phones = ${JSON.stringify([{number: '+1 (212) 555-0147', label: 'work'}])}::jsonb,
        linkedin_url = ${'https://linkedin.com/in/gregorymansfield'},
        guest_role = ${'Placement Agent'}, guest_priority = ${'High'},
        tags = ${['Fundraising', 'Distribution', 'Middle East']},
        ai_summary = ${'Gregory Mansfield is Managing Partner at Mansfield Advisory, an independent placement agent who has helped raise over $8B for mid-market PE funds. He has strong LP relationships in the Middle East and Southeast Asia — regions where Meridian has no distribution coverage. His arrival with James Harrington signals existing Blackstone connections. Could be instrumental in Fund IV placement for international LPs.'},
        enrichment_status = ${'COMPLETED'},
        industry = ${'Financial Services'}, role_seniority = ${'C-Suite'}
      WHERE id = ${gregoryContactId}
    `;
  }

  // Link Gregory to checkin
  await sql`
    UPDATE event_checkins SET contact_id = ${gregoryContactId}
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Gregory Mansfield'} AND contact_id IS NULL
  `;

  // Yuki Tanaka
  const yukiExisting = await sql`
    SELECT id FROM people_contacts
    WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${'Yuki Tanaka'}
    LIMIT 1
  `;

  let yukiContactId: string;
  if (yukiExisting.length === 0) {
    const yukiResult = await sql`
      INSERT INTO people_contacts (
        workspace_id, full_name, first_name, last_name,
        company, title, emails, phones, linkedin_url,
        guest_role, guest_priority, tags, source, source_detail,
        ai_summary, enrichment_status, industry, role_seniority
      ) VALUES (
        ${WORKSPACE_ID}, ${'Yuki Tanaka'}, ${'Yuki'}, ${'Tanaka'},
        ${'SoftBank Vision Fund'}, ${'Investment Director'},
        ${JSON.stringify([{email: 'yuki.tanaka@softbankvisionfund.com', label: 'work'}])}::jsonb,
        ${JSON.stringify([{number: '+1 (415) 555-0283', label: 'work'}])}::jsonb,
        ${'https://linkedin.com/in/yukitanaka'},
        ${'LP Prospect'}, ${'VIP'},
        ${['VC', 'Asia-Pacific', 'Sovereign', 'New LP Prospect']},
        ${'MANUAL'}::contact_source,
        ${'Walk-in at event #86 — came with Lisa Chang (Snowflake), Stanford GSB connection'},
        ${'Yuki Tanaka is Investment Director at SoftBank Vision Fund, exploring mid-market PE co-investments as SoftBank diversifies beyond late-stage tech. A SoftBank Vision Fund commitment to PE co-investments would be a massive signal — even a small allocation could mean $200M+. Connected to Lisa Chang through Stanford GSB. Very interested in Meridian\'s healthcare and enterprise software verticals.'},
        ${'COMPLETED'},
        ${'Venture Capital'},
        ${'VP / Director'}
      ) RETURNING id
    `;
    yukiContactId = yukiResult[0].id;
  } else {
    yukiContactId = yukiExisting[0].id;
    await sql`
      UPDATE people_contacts SET
        company = ${'SoftBank Vision Fund'}, title = ${'Investment Director'},
        emails = ${JSON.stringify([{email: 'yuki.tanaka@softbankvisionfund.com', label: 'work'}])}::jsonb,
        phones = ${JSON.stringify([{number: '+1 (415) 555-0283', label: 'work'}])}::jsonb,
        linkedin_url = ${'https://linkedin.com/in/yukitanaka'},
        guest_role = ${'LP Prospect'}, guest_priority = ${'VIP'},
        tags = ${['VC', 'Asia-Pacific', 'Sovereign', 'New LP Prospect']},
        ai_summary = ${'Yuki Tanaka is Investment Director at SoftBank Vision Fund, exploring mid-market PE co-investments as SoftBank diversifies beyond late-stage tech. A SoftBank Vision Fund commitment to PE co-investments would be a massive signal — even a small allocation could mean $200M+. Connected to Lisa Chang through Stanford GSB. Very interested in Meridian\'s healthcare and enterprise software verticals.'},
        enrichment_status = ${'COMPLETED'},
        industry = ${'Venture Capital'}, role_seniority = ${'VP / Director'}
      WHERE id = ${yukiContactId}
    `;
  }

  // Link Yuki to checkin
  await sql`
    UPDATE event_checkins SET contact_id = ${yukiContactId}
    WHERE event_id = ${EVENT_ID} AND full_name = ${'Yuki Tanaka'} AND contact_id IS NULL
  `;

  console.log(`  ✓ Gregory Mansfield (${gregoryContactId}), Yuki Tanaka (${yukiContactId})`);

  // Assign walk-ins to team members
  const teamMembers = await sql`SELECT id, full_name FROM users WHERE email IN (${'sarah.chen@meridiancapital.com'}, ${'marcus.rivera@meridiancapital.com'})`;
  const sarahUser = teamMembers.find((u: any) => u.full_name === 'Sarah Chen');
  const marcusUser = teamMembers.find((u: any) => u.full_name === 'Marcus Rivera');

  if (sarahUser && yukiContactId) {
    await sql`
      INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role)
      VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${yukiContactId}, ${sarahUser.id}, ${'Event Lead'})
      ON CONFLICT DO NOTHING
    `;
  }
  if (marcusUser && gregoryContactId) {
    await sql`
      INSERT INTO guest_team_assignments (event_id, workspace_id, contact_id, assigned_to, role)
      VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${gregoryContactId}, ${marcusUser.id}, ${'Guest Relations'})
      ON CONFLICT DO NOTHING
    `;
  }

  // ─── 5. Update contact profiles with roles, priorities, tags ────────
  console.log('\n5. Updating contact profiles...');

  const profileUpdates = [
    // Tier 1: LPs
    { name: 'Patricia Donovan', role: 'LP', priority: 'VIP', tags: ['Endowment', 'Re-up Target'] },
    { name: 'Philip Wainwright', role: 'LP', priority: 'VIP', tags: ['Foundation', 'New LP Prospect'] },
    { name: 'Walter Edmonds', role: 'LP', priority: 'VIP', tags: ['Sovereign Wealth', 'Co-Invest'] },
    { name: 'Fiona O\'Malley', role: 'LP', priority: 'High', tags: ['LP Advocacy', 'Industry'] },
    // Tier 2: PE/VC Co-Investment
    { name: 'Andrew Sterling', role: 'GP', priority: 'VIP', tags: ['PE', 'Co-Invest', 'Technology'] },
    { name: 'James Harrington', role: 'GP', priority: 'VIP', tags: ['PE', 'Strategic'] },
    { name: 'Diana Okonkwo', role: 'GP', priority: 'High', tags: ['PE', 'Enterprise Software'] },
    { name: 'Sofia Chen-Ramirez', role: 'GP', priority: 'High', tags: ['PE', 'Healthcare', 'Co-Invest'] },
    { name: 'Ian MacGregor', role: 'GP', priority: 'Standard', tags: ['PE', 'Europe', 'New Relationship'] },
    // Tier 3: Portfolio CEOs & Targets
    { name: 'Lisa Chang', role: 'Operating Partner Prospect', priority: 'High', tags: ['Data', 'SaaS', 'Board Prospect'] },
    { name: 'Brian Callahan', role: 'Operating Advisor Prospect', priority: 'High', tags: ['Hospitality', 'Fintech', 'Public Company'] },
    { name: 'Evelyn Marshall', role: 'Pipeline Target', priority: 'High', tags: ['Productivity', 'SaaS', 'Growth'] },
    { name: 'Jason Mitchell', role: 'Operating Partner Prospect', priority: 'Standard', tags: ['AI', 'Automation', 'Enterprise'] },
    // Tier 4: Advisors & Service Providers
    { name: 'Louise Hensley', role: 'Advisor', priority: 'Standard', tags: ['Consulting', 'Due Diligence'] },
    { name: 'Oliver Pennington', role: 'Advisor', priority: 'Standard', tags: ['Advisory', 'Deal Sourcing'] },
    { name: 'Martin Cross', role: 'Service Provider', priority: 'Standard', tags: ['Accounting', 'Fund Services'] },
    { name: 'Eleanor Blackwood', role: 'LP', priority: 'High', tags: ['Family Office', 'Direct Investment'] },
  ];

  for (const update of profileUpdates) {
    // Update ALL records with this name (there may be duplicates)
    // But only update guest_role and guest_priority on the ones linked to invitations/checkins
    const invContact = await sql`
      SELECT contact_id FROM campaign_invitations ci
      JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
      WHERE ic.event_id = ${EVENT_ID} AND ci.full_name = ${update.name}
      LIMIT 1
    `;

    if (invContact.length > 0) {
      await sql`
        UPDATE people_contacts SET
          guest_role = ${update.role},
          guest_priority = ${update.priority},
          tags = ${update.tags}
        WHERE id = ${invContact[0].contact_id}
      `;
    } else {
      // Check checkins
      const checkinContact = await sql`
        SELECT contact_id FROM event_checkins
        WHERE event_id = ${EVENT_ID} AND full_name = ${update.name} AND contact_id IS NOT NULL
        LIMIT 1
      `;
      if (checkinContact.length > 0) {
        await sql`
          UPDATE people_contacts SET
            guest_role = ${update.role},
            guest_priority = ${update.priority},
            tags = ${update.tags}
          WHERE id = ${checkinContact[0].contact_id}
        `;
      }
    }
  }

  console.log(`  ✓ Updated ${profileUpdates.length} contact profiles`);

  // ─── 6. Split campaigns (rename + create second) ────────────────────
  console.log('\n6. Setting up invitation campaigns...');

  const existingCampaignId = 'a4e31690-accb-49ca-ab7c-949b92b45a07';

  // Rename existing campaign
  await sql`
    UPDATE invitation_campaigns SET name = ${'Q2 Executive Dinner — Founding Table'}
    WHERE id = ${existingCampaignId}
  `;

  // Check if second campaign exists
  const campaign2Exists = await sql`
    SELECT id FROM invitation_campaigns
    WHERE event_id = ${EVENT_ID} AND name = ${'Q2 Executive Dinner — Extended Circle'}
  `;

  if (campaign2Exists.length === 0) {
    // Create second campaign
    const camp2Result = await sql`
      INSERT INTO invitation_campaigns (event_id, workspace_id, name, status, total_invited, total_accepted, total_declined)
      VALUES (${EVENT_ID}, ${WORKSPACE_ID}, ${'Q2 Executive Dinner — Extended Circle'}, ${'COMPLETED'}, 10, 7, 2)
      RETURNING id
    `;
    const camp2Id = camp2Result[0].id;

    // Move Extended Circle invitations to the new campaign
    const extendedCircleNames = [
      'Fiona O\'Malley', 'Louise Hensley', 'Oliver Pennington', 'Martin Cross',
      'Evelyn Marshall', 'Jason Mitchell', 'Ian MacGregor', 'Dahlia Rosenberg'
    ];

    for (const name of extendedCircleNames) {
      await sql`
        UPDATE campaign_invitations SET campaign_id = ${camp2Id}
        WHERE campaign_id = ${existingCampaignId} AND full_name = ${name}
      `;
    }

    // Add Victoria Langley and Sarah Worthington as declines in Extended Circle
    // First check if they exist as contacts
    const victoriaContact = await sql`
      SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${'Victoria Langley'} LIMIT 1
    `;
    if (victoriaContact.length > 0) {
      const vicExists = await sql`
        SELECT id FROM campaign_invitations WHERE contact_id = ${victoriaContact[0].id} AND campaign_id = ${camp2Id}
      `;
      if (vicExists.length === 0) {
        await sql`
          INSERT INTO campaign_invitations (event_id, campaign_id, contact_id, full_name, email, status, tier)
          VALUES (${EVENT_ID}, ${camp2Id}, ${victoriaContact[0].id}, ${'Victoria Langley'}, ${'victoria.langley@permira.com'}, ${'DECLINED'}, ${'TIER_2'})
        `;
      }
    }

    const sarahWContact = await sql`
      SELECT id FROM people_contacts WHERE workspace_id = ${WORKSPACE_ID} AND full_name = ${'Sarah Worthington'} LIMIT 1
    `;
    if (sarahWContact.length > 0) {
      const sarahWExists = await sql`
        SELECT id FROM campaign_invitations WHERE contact_id = ${sarahWContact[0].id} AND campaign_id = ${camp2Id}
      `;
      if (sarahWExists.length === 0) {
        await sql`
          INSERT INTO campaign_invitations (event_id, campaign_id, contact_id, full_name, email, status, tier)
          VALUES (${EVENT_ID}, ${camp2Id}, ${sarahWContact[0].id}, ${'Sarah Worthington'}, ${'sarah.worthington@eqtpartners.com'}, ${'DECLINED'}, ${'TIER_2'})
        `;
      }
    }

    // Update Founding Table campaign stats
    // Founding Table: Patricia, Philip, Walter, Andrew, James, Diana, Sofia, Lisa, Brian, Eleanor, David (declined), Robert (no response)
    await sql`
      UPDATE invitation_campaigns SET
        total_invited = 12, total_accepted = 10, total_declined = 1,
        status = ${'COMPLETED'}
      WHERE id = ${existingCampaignId}
    `;

    console.log(`  ✓ Renamed campaign 1, created campaign 2 (${camp2Id})`);
  } else {
    console.log('  ⊘ Second campaign already exists, skipping');
  }

  // ─── 7. Add missing follow-ups ──────────────────────────────────────
  console.log('\n7. Adding missing follow-ups...');

  // Get contact IDs we need
  const followUpContacts = await sql`
    SELECT id, full_name FROM people_contacts
    WHERE workspace_id = ${WORKSPACE_ID}
    AND full_name IN (${'Patricia Donovan'}, ${'Sofia Chen-Ramirez'}, ${'Andrew Sterling'})
    AND id IN (SELECT contact_id FROM campaign_invitations ci JOIN invitation_campaigns ic ON ic.id = ci.campaign_id WHERE ic.event_id = ${EVENT_ID})
  `;

  const fuContactMap: Record<string, string> = {};
  for (const c of followUpContacts) {
    fuContactMap[c.full_name] = c.id;
  }

  const missingFollowUps = [
    {
      contactId: fuContactMap['Patricia Donovan'],
      name: 'Patricia Donovan',
      status: 'MEETING_BOOKED',
      subject: 'Looking forward to continuing our conversation',
      content: 'Dear Patricia,\n\nThank you for joining us at the Meridian Capital Q2 Executive Dinner. It was wonderful reconnecting after our Fund II partnership. MIT\'s endowment has been a valued part of the Meridian story, and I\'d love to show you how Fund III and our upcoming Fund IV have evolved.\n\nI\'ve blocked time on my calendar next Wednesday at 2 PM — would that work for a deeper conversation about Fund IV?\n\nWarm regards,\nMarcus Sterling\nMeridian Capital Partners',
      score: 86,
      company: 'MIT Investment Management',
      title: 'MD, Private Equity',
    },
    {
      contactId: fuContactMap['Sofia Chen-Ramirez'],
      name: 'Sofia Chen-Ramirez',
      status: 'REPLIED',
      subject: 'Next steps on the healthcare platform',
      content: 'Dear Sofia,\n\nIt was a pleasure seeing you at the dinner. Our conversation about the healthcare platform opportunity was one of the highlights of the evening.\n\nI\'d love to set up a call next week to go deeper on the co-evaluation. Our team has prepared additional diligence materials I think you\'ll find compelling.\n\nBest regards,\nMarcus Sterling\nMeridian Capital Partners',
      score: 74,
      company: 'Advent International',
      title: 'Partner',
    },
    {
      contactId: fuContactMap['Andrew Sterling'],
      name: 'Andrew Sterling',
      status: 'SENT',
      subject: 'Thank you for a great evening',
      content: 'Dear Andrew,\n\nAlways a pleasure catching up. The co-investment discussion was particularly productive — I think there\'s a real opportunity on the pipeline deal we discussed.\n\nLet\'s get our teams on a call next week to review the preliminary materials.\n\nBest,\nMarcus Sterling\nMeridian Capital Partners',
      score: 78,
      company: 'Thoma Bravo',
      title: 'Partner',
    },
    {
      contactId: gregoryContactId,
      name: 'Gregory Mansfield',
      status: 'SENT',
      subject: 'Great to meet you at the Meridian dinner',
      content: 'Dear Gregory,\n\nWhat a pleasant surprise meeting you at the dinner. Your Fund IV placement capabilities, particularly in the Middle East and Southeast Asia, align perfectly with where we\'re looking to expand our LP base.\n\nI\'d love to schedule a call to discuss potential collaboration on the Fund IV raise.\n\nBest regards,\nMarcus Sterling\nMeridian Capital Partners',
      score: null,
      company: 'Mansfield Advisory',
      title: 'Managing Partner',
    },
    {
      contactId: yukiContactId,
      name: 'Yuki Tanaka',
      status: 'SENT',
      subject: 'Wonderful meeting you through Lisa',
      content: 'Dear Yuki,\n\nIt was wonderful meeting you at the dinner through Lisa Chang. Your perspective on SoftBank\'s PE diversification strategy was fascinating.\n\nI believe Meridian\'s mid-market focus, particularly in healthcare and enterprise software, could be an excellent complement to SoftBank\'s growth-stage portfolio. I\'d love to continue our conversation.\n\nBest regards,\nMarcus Sterling\nMeridian Capital Partners',
      score: null,
      company: 'SoftBank Vision Fund',
      title: 'Investment Director',
    },
  ];

  // Also add Eleanor Blackwood update
  const eleanorContact = await sql`
    SELECT contact_id FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ic.event_id = ${EVENT_ID} AND ci.full_name = ${'Eleanor Blackwood'}
    LIMIT 1
  `;

  if (eleanorContact.length > 0) {
    // Check if Eleanor already has a follow-up
    const eleanorFU = await sql`
      SELECT id, status FROM follow_up_sequences WHERE event_id = ${EVENT_ID} AND contact_id = ${eleanorContact[0].contact_id}
    `;
    if (eleanorFU.length > 0) {
      // Update existing
      await sql`
        UPDATE follow_up_sequences SET
          status = ${'OPENED'}::follow_up_status,
          subject = ${'Continuing the Blackwood–Meridian conversation'},
          opened_at = ${'2026-04-18T18:00:00.000Z'}
        WHERE id = ${eleanorFU[0].id}
      `;
      console.log('  ✓ Updated Eleanor Blackwood follow-up to OPENED');
    }
  }

  let addedCount = 0;
  for (const fu of missingFollowUps) {
    if (!fu.contactId) {
      console.log(`  ⚠ Skipping ${fu.name} — contact not found`);
      continue;
    }

    // Check if follow-up already exists
    const existing = await sql`
      SELECT id FROM follow_up_sequences WHERE event_id = ${EVENT_ID} AND contact_id = ${fu.contactId}
    `;

    if (existing.length > 0) {
      console.log(`  ⊘ ${fu.name} already has follow-up, skipping`);
      continue;
    }

    const sentAt = fu.status !== 'PENDING' ? '2026-04-18T14:00:00.000Z' : null;
    const openedAt = ['OPENED', 'REPLIED', 'MEETING_BOOKED'].includes(fu.status) ? '2026-04-18T17:00:00.000Z' : null;
    const repliedAt = ['REPLIED', 'MEETING_BOOKED'].includes(fu.status) ? '2026-04-18T21:00:00.000Z' : null;
    const meetingAt = fu.status === 'MEETING_BOOKED' ? '2026-04-19T10:00:00.000Z' : null;

    await sql`
      INSERT INTO follow_up_sequences (
        event_id, workspace_id, contact_id, status,
        subject, content, personalization_context,
        model_version, generated_at,
        sent_at, opened_at, replied_at, meeting_booked_at
      ) VALUES (
        ${EVENT_ID}, ${WORKSPACE_ID}, ${fu.contactId}, ${fu.status}::follow_up_status,
        ${fu.subject}, ${fu.content},
        ${JSON.stringify({ score: fu.score, title: fu.title, company: fu.company, talking_points: ['Co-investment discussion', 'Portfolio synergies'] })}::jsonb,
        ${'claude-sonnet-4-5-20250514'}, ${'2026-04-18T13:00:00.000Z'},
        ${sentAt}, ${openedAt}, ${repliedAt}, ${meetingAt}
      )
    `;
    addedCount++;
  }

  console.log(`  ✓ Added ${addedCount} new follow-ups`);

  // ─── 8. Update AI insights for key checked-in guests ────────────────
  console.log('\n8. Updating AI insights for key guests...');

  const insightUpdates = [
    {
      name: 'Patricia Donovan',
      rationale: 'Patricia Donovan is MD of Private Equity at MIT Investment Management, overseeing PE allocations for MIT\'s $27B endowment. MIT was a Fund II investor but passed on Fund III — she\'s the key decision-maker for the re-up. The dinner is a critical touchpoint before Q3 commitment decisions. Fund III\'s outperformance gives Meridian a strong pitch for re-engagement.',
      talkingPoints: [
        'Reference Fund II partnership history — acknowledge the relationship while showing Fund III growth',
        'MIT recently increased PE allocation targets by 3% — discuss how Meridian fits the expanded mandate',
        'Fund III returned 2.1x MOIC despite their absence — use this as proof point for Fund IV',
        'Her CIO reports to the MIT Investment Management Company board next month — timing is critical'
      ],
    },
    {
      name: 'Andrew Sterling',
      rationale: 'Andrew Sterling leads Thoma Bravo\'s mid-market tech practice. Thoma Bravo and Meridian have co-invested on two successful software deals. There\'s an active deal in the pipeline where they\'d co-invest again. Andrew\'s presence signals continued commitment to the co-investment relationship.',
      talkingPoints: [
        'Reference the two prior co-investments and their strong returns',
        'Discuss the active pipeline deal — his team has seen the teaser',
        'Thoma Bravo just closed their latest fund at $32B — explore larger co-invest tickets',
        'He was recently promoted to lead the mid-market practice — congratulate and explore expanded partnership'
      ],
    },
    {
      name: 'James Harrington',
      rationale: 'James Harrington is Senior Managing Director at Blackstone. His tactical opportunities group overlaps with Meridian\'s mid-market sweet spot. He and Meridian\'s Managing Partner go back 15 years to Goldman Sachs. He brought walk-in Gregory Mansfield, a placement agent — indicating he\'s actively helping Meridian build connections.',
      talkingPoints: [
        'Thank him for bringing Gregory Mansfield — the placement agent connection is extremely valuable',
        'Discuss Blackstone\'s increasing interest in mid-market co-investments',
        'Reference the Goldman Sachs days — the personal history matters',
        'James was recently appointed to a board in Meridian\'s sector — explore portfolio synergies'
      ],
    },
  ];

  for (const update of insightUpdates) {
    const contactResult = await sql`
      SELECT contact_id FROM campaign_invitations ci
      JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
      WHERE ic.event_id = ${EVENT_ID} AND ci.full_name = ${update.name}
      LIMIT 1
    `;
    if (contactResult.length > 0) {
      await sql`
        UPDATE guest_scores SET
          score_rationale = ${update.rationale},
          talking_points = ${JSON.stringify(update.talkingPoints)}::jsonb
        WHERE contact_id = ${contactResult[0].contact_id} AND event_id = ${EVENT_ID}
      `;
    }
  }

  console.log(`  ✓ Updated AI insights for ${insightUpdates.length} key guests`);

  // ─── Final: Print summary ───────────────────────────────────────────
  console.log('\n=== Seed data complete ===');

  const finalCheckins = await sql`SELECT COUNT(*)::int as c FROM event_checkins WHERE event_id = ${EVENT_ID}`;
  const finalFollowUps = await sql`SELECT COUNT(*)::int as c FROM follow_up_sequences WHERE event_id = ${EVENT_ID}`;
  const finalCampaigns = await sql`SELECT COUNT(*)::int as c FROM invitation_campaigns WHERE event_id = ${EVENT_ID}`;
  const finalAssignments = await sql`SELECT COUNT(*)::int as c FROM guest_team_assignments WHERE event_id = ${EVENT_ID}`;

  console.log(`  Check-ins: ${finalCheckins[0].c}`);
  console.log(`  Follow-ups: ${finalFollowUps[0].c}`);
  console.log(`  Campaigns: ${finalCampaigns[0].c}`);
  console.log(`  Team assignments: ${finalAssignments[0].c}`);
}

main().catch(err => {
  console.error('SEED FAILED:', err);
  process.exit(1);
});

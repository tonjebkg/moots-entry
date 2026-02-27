/**
 * Seed script: PE Firm Executive Dinner
 *
 * Creates a realistic test dataset for UX evaluation:
 * - 1 event: "Meridian Capital Partners — Q2 Executive Dinner"
 * - 100 contacts in the People Database (PE/VC/C-suite professionals)
 * - 3 event objectives
 * - Guest scores for 72 of the 100 contacts
 * - 30 join requests (various statuses: PENDING, APPROVED, REJECTED)
 * - 1 invitation campaign with 20 confirmed invitations
 *
 * Usage: npx tsx scripts/seed-pe-dinner.ts
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
  // PE / VC Partners & Managing Directors (Tier 1 - 25 people)
  { first: 'James', last: 'Harrington', company: 'Blackstone Group', title: 'Senior Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Real Estate', 'VIP'] },
  { first: 'Catherine', last: 'Aldrich', company: 'KKR & Co', title: 'Partner, Infrastructure', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Infrastructure', 'VIP'] },
  { first: 'Michael', last: 'Thornton', company: 'Carlyle Group', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Healthcare'] },
  { first: 'Elizabeth', last: 'Waverly', company: 'Apollo Global', title: 'Partner, Credit', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Credit', 'VIP'] },
  { first: 'Richard', last: 'Pemberton', company: 'Warburg Pincus', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Technology'] },
  { first: 'Sofia', last: 'Chen-Ramirez', company: 'Advent International', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Cross-border'] },
  { first: 'William', last: 'Ashford III', company: 'TPG Capital', title: 'Senior Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Growth Equity', 'VIP'] },
  { first: 'Diana', last: 'Okonkwo', company: 'Vista Equity', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Enterprise Software'] },
  { first: 'Thomas', last: 'Fitzgerald', company: 'Bain Capital', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Healthcare'] },
  { first: 'Priya', last: 'Mehta-Shah', company: 'General Atlantic', title: 'Managing Director', industry: 'Growth Equity', seniority: 'C-Suite', tags: ['Growth Equity', 'Fintech'] },
  { first: 'Andrew', last: 'Sterling', company: 'Thoma Bravo', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'SaaS', 'VIP'] },
  { first: 'Margaret', last: 'Calloway', company: 'Silver Lake', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Technology'] },
  { first: 'David', last: 'Nakamura', company: 'Hillhouse Capital', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Asia-Pacific'] },
  { first: 'Sarah', last: 'Worthington', company: 'EQT Partners', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Industrials'] },
  { first: 'Charles', last: 'Montgomery', company: 'Ares Management', title: 'Senior Partner', industry: 'Alternative Credit', seniority: 'Partner', tags: ['Credit', 'Direct Lending', 'VIP'] },
  { first: 'Isabelle', last: 'Fontaine', company: 'PAI Partners', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Europe'] },
  { first: 'Robert', last: 'Kensington', company: 'CVC Capital', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Consumer'] },
  { first: 'Amara', last: 'Osei', company: 'African Capital Alliance', title: 'Founding Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Emerging Markets'] },
  { first: 'Jonathan', last: 'Whitfield', company: 'Hellman & Friedman', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'Financial Services'] },
  { first: 'Victoria', last: 'Langley', company: 'Permira', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Technology'] },
  { first: 'Marcus', last: 'Webb', company: 'Leonard Green', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Consumer Retail'] },
  { first: 'Christina', last: 'Park', company: 'Insight Partners', title: 'Managing Director', industry: 'Growth Equity', seniority: 'C-Suite', tags: ['Growth', 'SaaS'] },
  { first: 'Edward', last: 'Blackwell', company: 'Cinven', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Healthcare'] },
  { first: 'Rachel', last: 'Dumont', company: 'BC Partners', title: 'Managing Director', industry: 'Private Equity', seniority: 'C-Suite', tags: ['PE', 'TMT'] },
  { first: 'Alexander', last: 'Volkov', company: 'Pamplona Capital', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Energy'] },

  // Corporate C-Suite / Potential Portfolio Targets (Tier 2 - 30 people)
  { first: 'Jennifer', last: 'Morales', company: 'Datadog', title: 'CFO', industry: 'Enterprise Software', seniority: 'C-Suite', tags: ['SaaS', 'Public Co'] },
  { first: 'Patrick', last: 'O\'Brien', company: 'Stripe', title: 'Chief Business Officer', industry: 'Fintech', seniority: 'C-Suite', tags: ['Fintech', 'Payments'] },
  { first: 'Lisa', last: 'Chang', company: 'Snowflake', title: 'CRO', industry: 'Data Infrastructure', seniority: 'C-Suite', tags: ['Data', 'Cloud'] },
  { first: 'Stephen', last: 'Graves', company: 'ServiceTitan', title: 'CEO', industry: 'Vertical SaaS', seniority: 'CEO', tags: ['SaaS', 'SMB'] },
  { first: 'Angela', last: 'Mercer', company: 'Veeva Systems', title: 'President', industry: 'Healthcare IT', seniority: 'C-Suite', tags: ['Healthcare', 'SaaS'] },
  { first: 'Brian', last: 'Callahan', company: 'Toast', title: 'CFO', industry: 'Restaurant Tech', seniority: 'C-Suite', tags: ['Hospitality', 'Fintech'] },
  { first: 'Natalie', last: 'Rivers', company: 'Figma', title: 'VP Corporate Development', industry: 'Design Tools', seniority: 'VP', tags: ['Design', 'Collaboration'] },
  { first: 'Kenneth', last: 'Wu', company: 'Confluent', title: 'CEO', industry: 'Data Streaming', seniority: 'CEO', tags: ['Data', 'Open Source'] },
  { first: 'Samantha', last: 'Hayes', company: 'Brex', title: 'COO', industry: 'Fintech', seniority: 'C-Suite', tags: ['Fintech', 'Corporate Cards'] },
  { first: 'Daniel', last: 'Foster', company: 'Gusto', title: 'CEO', industry: 'HR Tech', seniority: 'CEO', tags: ['HR', 'SMB'] },
  { first: 'Laura', last: 'Bennett', company: 'Navan', title: 'CFO', industry: 'Travel Tech', seniority: 'C-Suite', tags: ['Travel', 'Enterprise'] },
  { first: 'Gregory', last: 'Torres', company: 'Plaid', title: 'Chief Revenue Officer', industry: 'Fintech', seniority: 'C-Suite', tags: ['Fintech', 'API'] },
  { first: 'Evelyn', last: 'Marshall', company: 'Notion', title: 'VP Strategy', industry: 'Productivity', seniority: 'VP', tags: ['Productivity', 'Collaboration'] },
  { first: 'Ryan', last: 'Sullivan', company: 'Celonis', title: 'CEO Americas', industry: 'Process Mining', seniority: 'C-Suite', tags: ['Enterprise', 'AI'] },
  { first: 'Nicole', last: 'Prescott', company: 'Carta', title: 'President', industry: 'Cap Table', seniority: 'C-Suite', tags: ['Equity', 'Legal Tech'] },
  { first: 'Christopher', last: 'Drake', company: 'Airtable', title: 'CTO', industry: 'Low-Code', seniority: 'C-Suite', tags: ['Low-Code', 'Collaboration'] },
  { first: 'Michelle', last: 'Zhao', company: 'Canva', title: 'VP Growth, North America', industry: 'Design Tools', seniority: 'VP', tags: ['Design', 'Growth'] },
  { first: 'Anthony', last: 'Russo', company: 'Monday.com', title: 'CFO', industry: 'Work OS', seniority: 'C-Suite', tags: ['SaaS', 'Collaboration'] },
  { first: 'Helen', last: 'Graham', company: 'HashiCorp', title: 'Chief People Officer', industry: 'Infrastructure', seniority: 'C-Suite', tags: ['Infrastructure', 'DevOps'] },
  { first: 'Jason', last: 'Mitchell', company: 'UiPath', title: 'President EMEA', industry: 'RPA', seniority: 'C-Suite', tags: ['AI', 'Automation'] },
  { first: 'Karen', last: 'Hoffman', company: 'Amplitude', title: 'CEO', industry: 'Product Analytics', seniority: 'CEO', tags: ['Analytics', 'Product'] },
  { first: 'Tyler', last: 'Brooks', company: 'Samsara', title: 'CRO', industry: 'IoT', seniority: 'C-Suite', tags: ['IoT', 'Fleet'] },
  { first: 'Vanessa', last: 'Kim', company: 'Calendly', title: 'CEO', industry: 'Scheduling', seniority: 'CEO', tags: ['SaaS', 'PLG'] },
  { first: 'Derek', last: 'Hamilton', company: 'Dialpad', title: 'CEO', industry: 'UCaaS', seniority: 'CEO', tags: ['Communications', 'AI'] },
  { first: 'Alice', last: 'Crawford', company: 'GitLab', title: 'VP Alliances', industry: 'DevOps', seniority: 'VP', tags: ['DevOps', 'Open Source'] },
  { first: 'Scott', last: 'Palmer', company: 'Harness', title: 'CEO', industry: 'CI/CD', seniority: 'CEO', tags: ['DevOps', 'Cloud'] },
  { first: 'Megan', last: 'Ellis', company: 'Attentive', title: 'COO', industry: 'Marketing Tech', seniority: 'C-Suite', tags: ['Marketing', 'Mobile'] },
  { first: 'Raymond', last: 'Clarke', company: 'Lacework', title: 'CRO', industry: 'Cloud Security', seniority: 'C-Suite', tags: ['Security', 'Cloud'] },
  { first: 'Jessica', last: 'Tran', company: 'Drata', title: 'CEO', industry: 'Compliance', seniority: 'CEO', tags: ['Compliance', 'Security'] },
  { first: 'Nicholas', last: 'Barrett', company: 'Ramp', title: 'CFO', industry: 'Corporate Finance', seniority: 'C-Suite', tags: ['Fintech', 'Expense'] },

  // LPs / Family Offices / Allocators (Tier 2 - 15 people)
  { first: 'Harrison', last: 'Whitmore', company: 'Whitmore Family Office', title: 'CIO', industry: 'Family Office', seniority: 'C-Suite', tags: ['LP', 'Family Office', 'VIP'] },
  { first: 'Claudia', last: 'Barretti', company: 'Stanford Endowment', title: 'Director of Private Equity', industry: 'Endowment', seniority: 'Director', tags: ['LP', 'Endowment'] },
  { first: 'Franklin', last: 'Rhodes', company: 'New York State CRF', title: 'Deputy CIO', industry: 'Pension', seniority: 'C-Suite', tags: ['LP', 'Pension'] },
  { first: 'Genevieve', last: 'Sinclair', company: 'Sinclair Holdings', title: 'Principal', industry: 'Family Office', seniority: 'Principal', tags: ['LP', 'Family Office'] },
  { first: 'Lawrence', last: 'Chen', company: 'CalSTRS', title: 'Sr. Portfolio Manager, PE', industry: 'Pension', seniority: 'VP', tags: ['LP', 'Pension'] },
  { first: 'Beatrice', last: 'Vanderholt', company: 'Vanderholt Capital', title: 'Managing Partner', industry: 'Family Office', seniority: 'Partner', tags: ['LP', 'Family Office', 'VIP'] },
  { first: 'Oscar', last: 'Lindqvist', company: 'AP7 (Sweden)', title: 'Head of Alternatives', industry: 'Sovereign Wealth', seniority: 'Director', tags: ['LP', 'Sovereign Wealth'] },
  { first: 'Patricia', last: 'Donovan', company: 'MIT Investment Management', title: 'MD, Private Equity', industry: 'Endowment', seniority: 'C-Suite', tags: ['LP', 'Endowment'] },
  { first: 'Samuel', last: 'Torres', company: 'Abu Dhabi Investment Authority', title: 'Director, PE Co-Investments', industry: 'Sovereign Wealth', seniority: 'Director', tags: ['LP', 'Sovereign Wealth', 'VIP'] },
  { first: 'Eleanor', last: 'Blackwood', company: 'Blackwood Partners', title: 'Founder', industry: 'Family Office', seniority: 'CEO', tags: ['LP', 'Family Office'] },
  { first: 'Martin', last: 'Schwartz', company: 'Ontario Teachers\' Pension', title: 'VP Private Capital', industry: 'Pension', seniority: 'VP', tags: ['LP', 'Pension'] },
  { first: 'Cynthia', last: 'Nash', company: 'Emory Endowment', title: 'Director of Alternatives', industry: 'Endowment', seniority: 'Director', tags: ['LP', 'Endowment'] },
  { first: 'Walter', last: 'Edmonds', company: 'Temasek Holdings', title: 'Senior MD, Americas', industry: 'Sovereign Wealth', seniority: 'C-Suite', tags: ['LP', 'Sovereign Wealth'] },
  { first: 'Irene', last: 'Castellano', company: 'CDPQ', title: 'Head of US Private Equity', industry: 'Pension', seniority: 'Director', tags: ['LP', 'Pension'] },
  { first: 'Philip', last: 'Wainwright', company: 'Wainwright Foundation', title: 'Trustee & CIO', industry: 'Foundation', seniority: 'C-Suite', tags: ['LP', 'Foundation'] },

  // Advisory / Legal / Banking (Tier 3 - 20 people)
  { first: 'Arthur', last: 'Kingsley', company: 'Goldman Sachs', title: 'MD, Sponsor Coverage', industry: 'Investment Banking', seniority: 'C-Suite', tags: ['Banking', 'Advisory'] },
  { first: 'Diane', last: 'Hartwell', company: 'Kirkland & Ellis', title: 'Partner, PE M&A', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'M&A'] },
  { first: 'Frederick', last: 'Lawson', company: 'Morgan Stanley', title: 'MD, Financial Sponsors', industry: 'Investment Banking', seniority: 'C-Suite', tags: ['Banking', 'Sponsors'] },
  { first: 'Grace', last: 'Whitaker', company: 'Simpson Thacher', title: 'Partner', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'Buyouts'] },
  { first: 'Howard', last: 'Manning', company: 'JP Morgan', title: 'Head of PE Lending', industry: 'Banking', seniority: 'C-Suite', tags: ['Banking', 'Leverage Finance'] },
  { first: 'Judith', last: 'Cromwell', company: 'Latham & Watkins', title: 'Partner, PE Practice', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'PE'] },
  { first: 'Kenneth', last: 'Sloane', company: 'Lazard', title: 'MD, Private Capital Advisory', industry: 'Advisory', seniority: 'C-Suite', tags: ['Advisory', 'Secondary'] },
  { first: 'Louise', last: 'Hensley', company: 'McKinsey & Co', title: 'Senior Partner', industry: 'Consulting', seniority: 'Partner', tags: ['Consulting', 'Due Diligence'] },
  { first: 'Martin', last: 'Cross', company: 'Deloitte', title: 'National PE Leader', industry: 'Accounting', seniority: 'Partner', tags: ['Accounting', 'Tax'] },
  { first: 'Natasha', last: 'Voronova', company: 'Debevoise & Plimpton', title: 'Partner, Funds', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'Fund Formation'] },
  { first: 'Oliver', last: 'Pennington', company: 'Evercore', title: 'Senior MD', industry: 'Advisory', seniority: 'C-Suite', tags: ['Advisory', 'M&A'] },
  { first: 'Paulina', last: 'Reyes', company: 'Bain & Company', title: 'Partner, PE Practice', industry: 'Consulting', seniority: 'Partner', tags: ['Consulting', 'Commercial DD'] },
  { first: 'Quentin', last: 'Ashby', company: 'Credit Suisse', title: 'MD, Leveraged Finance', industry: 'Banking', seniority: 'C-Suite', tags: ['Banking', 'LevFin'] },
  { first: 'Rebecca', last: 'Stone', company: 'Wachtell Lipton', title: 'Partner', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'Governance'] },
  { first: 'Simon', last: 'Archer', company: 'PwC', title: 'PE Deals Leader', industry: 'Accounting', seniority: 'Partner', tags: ['Accounting', 'Deals'] },
  { first: 'Theresa', last: 'Knox', company: 'Jefferies', title: 'Head of Sponsor Finance', industry: 'Banking', seniority: 'C-Suite', tags: ['Banking', 'Sponsors'] },
  { first: 'Ulrich', last: 'Brandt', company: 'Freshfields', title: 'Partner, Antitrust', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'Regulatory'] },
  { first: 'Vivian', last: 'McCarthy', company: 'Houlihan Lokey', title: 'MD, Transaction Advisory', industry: 'Advisory', seniority: 'C-Suite', tags: ['Advisory', 'Valuation'] },
  { first: 'Wesley', last: 'Hampton', company: 'Ares Management', title: 'Partner, Direct Lending', industry: 'Credit', seniority: 'Partner', tags: ['Credit', 'Direct Lending'] },
  { first: 'Yvonne', last: 'Fischer', company: 'Ropes & Gray', title: 'Partner, PE', industry: 'Law', seniority: 'Partner', tags: ['Legal', 'PE Transactions'] },

  // Wildcards / Innovators / Media (Tier 3 - 10 people)
  { first: 'Adrian', last: 'Cole', company: 'Andreessen Horowitz', title: 'General Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Crypto'] },
  { first: 'Bianca', last: 'Delgado', company: 'Bloomberg', title: 'Senior Reporter, PE', industry: 'Media', seniority: 'Senior', tags: ['Media', 'PE Coverage'] },
  { first: 'Cameron', last: 'Yates', company: 'Sequoia Capital', title: 'Partner', industry: 'Venture Capital', seniority: 'Partner', tags: ['VC', 'Growth'] },
  { first: 'Dahlia', last: 'Rosenberg', company: 'Institutional Investor', title: 'Editor-in-Chief', industry: 'Media', seniority: 'C-Suite', tags: ['Media', 'Rankings'] },
  { first: 'Ethan', last: 'Caldwell', company: 'Tiger Global', title: 'Partner', industry: 'Crossover Fund', seniority: 'Partner', tags: ['Crossover', 'Technology'] },
  { first: 'Fiona', last: 'O\'Malley', company: 'ILPA', title: 'CEO', industry: 'Industry Association', seniority: 'CEO', tags: ['LP Advocacy', 'Governance'] },
  { first: 'Grant', last: 'Hawkins', company: 'Coatue Management', title: 'Partner', industry: 'Hedge Fund / PE', seniority: 'Partner', tags: ['Crossover', 'Technology'] },
  { first: 'Hannah', last: 'Lowe', company: 'PitchBook', title: 'Head of PE Research', industry: 'Data/Research', seniority: 'Director', tags: ['Data', 'Research'] },
  { first: 'Ian', last: 'MacGregor', company: 'Bridgepoint', title: 'Partner', industry: 'Private Equity', seniority: 'Partner', tags: ['PE', 'Mid-Market'] },
  { first: 'Jasmine', last: 'Patel', company: 'McKinsey Global Institute', title: 'Fellow', industry: 'Research', seniority: 'Senior', tags: ['Research', 'Thought Leader'] },
];

// ─── Scoring Data ───────────────────────────────────────────────────

const OBJECTIVE_TEMPLATES = [
  {
    text: 'Senior PE/VC decision-makers with active deal flow and co-investment appetite — Managing Directors, Partners, and Principals at funds with $1B+ AUM',
    weight: 2.0,
    ai_interpretation: "Based on this objective, I'll prioritize senior PE and VC decision-makers at funds with $1B+ AUM, weighting for active deal flow, board seats at portfolio companies, and prior attendance at executive-tier events. Contacts with GP or MD titles at growth equity or buyout funds will score highest.",
    ai_questions: [
      "Should I weight co-investment track record more heavily than current AUM?",
      "Are there specific sectors (healthcare, tech, industrials) where PE focus matters more for this dinner?"
    ],
    qualifying_count: 43,
  },
  {
    text: 'C-suite executives at high-growth technology companies that represent potential acquisition targets or portfolio company partnerships in the $500M-$5B enterprise value range',
    weight: 1.5,
    ai_interpretation: "I'll focus on CEOs, CFOs, and CTOs at technology companies in the $500M-$5B enterprise value range — particularly those in sectors complementary to Meridian's portfolio. Companies showing 30%+ revenue growth or recent strategic acquisitions will receive higher scores.",
    ai_questions: [
      "When you say 'high-growth,' should I use 30% YoY revenue growth as the threshold, or is 20% sufficient?",
      "Should I include pre-IPO companies, or only those already generating $50M+ ARR?"
    ],
    qualifying_count: 28,
  },
  {
    text: 'Institutional LPs, family offices, and sovereign wealth fund allocators with existing or prospective commitments to mid-market and large-cap PE strategies',
    weight: 1.8,
    ai_interpretation: "I'll prioritize institutional allocators — endowments, pension funds, family offices, and sovereign wealth representatives — who are actively increasing private equity allocations. Decision-makers with direct allocation authority and existing relationships with mid-market PE funds score highest.",
    ai_questions: [
      "Should I include LPs who are currently reducing PE exposure but might be re-entering, or only active allocators?",
      "Is there a minimum commitment size that matters — e.g., $25M+ allocations?"
    ],
    qualifying_count: 15,
  },
];

const TALKING_POINTS_POOL = [
  'Recently led $2.3B acquisition of a healthcare SaaS platform — discuss co-investment thesis',
  'Their fund just closed at $4.7B — largest raise in firm history. Exploring new sector verticals',
  'Published thought piece on AI-driven due diligence. Ask about their tech stack transformation',
  'Board member of three portfolio companies in our target sector. Strong operational perspective',
  'Known for contrarian views on interest rate impact on PE multiples. Good dinner conversation',
  'Previously worked together on the DataVista deal in 2022. Warm relationship, natural re-engagement',
  'Their LP base overlaps significantly with ours. Potential for co-GP strategies',
  'Recently promoted to Partner — first time attending this level of event. Make them feel included',
  'Outspoken advocate for ESG integration in PE. Aligns with our new impact fund thesis',
  'Their portfolio company is a direct competitor to one of ours — tread carefully on specifics',
  'Family office has $800M in PE allocations, looking to concentrate with fewer managers',
  'Their firm pioneered the continuation fund model — pick their brain on GP-led secondaries',
  'Just returned from sabbatical. Reconnecting with the industry, open to new relationships',
  'Keynote speaker at SuperReturn last year on value creation. High influence in the community',
  'Their compliance team is implementing new ESG reporting frameworks — potential knowledge share',
];

const RATIONALE_TEMPLATES = [
  'Strong alignment with PE deal-maker objective. {name} at {company} has direct co-investment authority and an active pipeline in sectors overlapping with Meridian\'s thesis. Their recent deal activity signals appetite for mid-market partnerships.',
  'Highly qualified C-suite target. {name} leads {company}, a company in our acquisition sweet spot ($500M-$3B EV). Their growth trajectory and market position make them a natural fit for portfolio integration conversations.',
  'Key LP relationship. {name} manages PE allocations at {company} and has expressed interest in increasing exposure to mid-market buyouts. Their investment committee reviews are upcoming — timing is ideal.',
  'Strategic advisory value. {name} brings deep sector expertise from {company} that complements our due diligence capabilities. Their network in {industry} is exceptional.',
  'Moderate fit. {name} at {company} operates in an adjacent space. While not a direct co-investment match, their market intelligence and deal flow visibility could be valuable for sourcing.',
];

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding PE Dinner test data...\n');

  // Step 0: Clean up previous seed runs
  console.log('0/12 — Cleaning up previous seed data...');
  const prevEvents = await sql`SELECT id FROM events WHERE title LIKE 'Meridian Capital%'`;
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
    await sql`DELETE FROM events WHERE id = ${ev.id}`;
    console.log(`   Deleted previous event #${ev.id}`);
  }
  // Clean up ALL previously seeded contacts (by source_detail tag)
  const prevContacts = await sql`SELECT COUNT(*) as c FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER'`;
  if (Number(prevContacts[0].c) > 0) {
    // Delete scores and follow-ups that reference these contacts first
    await sql`DELETE FROM guest_scores WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER')`;
    await sql`DELETE FROM follow_up_sequences WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER')`;
    await sql`DELETE FROM campaign_invitations WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER')`;
    await sql`DELETE FROM event_checkins WHERE contact_id IN (SELECT id FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER')`;
    await sql`DELETE FROM people_contacts WHERE source_detail = 'SEED_PE_DINNER'`;
    console.log(`   Deleted ${prevContacts[0].c} previous seed contacts and related records`);
  }

  // Step 1: Find or create a user + workspace
  console.log('1/12 — Finding workspace...');

  let workspaceId: string;
  let userId: string;

  const existingWorkspaces = await sql`SELECT id, owner_id FROM workspaces LIMIT 1`;

  if (existingWorkspaces.length > 0) {
    workspaceId = existingWorkspaces[0].id;
    userId = existingWorkspaces[0].owner_id;
    console.log(`   Using existing workspace: ${workspaceId}`);
  } else {
    // Create a test user + workspace
    userId = uuid();
    workspaceId = uuid();

    await sql`
      INSERT INTO users (id, email, full_name, email_verified)
      VALUES (${userId}, 'demo@meridiancp.com', 'Marcus Sterling', true)
      ON CONFLICT (email) DO UPDATE SET full_name = 'Marcus Sterling'
      RETURNING id
    `;

    // Get the actual user ID in case of conflict
    const userResult = await sql`SELECT id FROM users WHERE email = 'demo@meridiancp.com'`;
    userId = userResult[0].id;

    await sql`
      INSERT INTO workspaces (
        id, name, slug, owner_id, plan,
        company_website, company_description, industry, market_position,
        key_leadership, strategic_priorities, competitors, brand_voice,
        company_enriched_at
      )
      VALUES (
        ${workspaceId}, 'Meridian Capital Partners', 'meridian-capital', ${userId}, 'ENTERPRISE',
        'https://meridiancp.com',
        'Meridian Capital Partners is a leading mid-market private equity firm focused on technology-enabled services and healthcare. Founded in 2008, the firm manages over $3.2B in assets across four funds and has completed 45+ platform acquisitions.',
        'Private Equity',
        'Top-quartile mid-market PE firm known for operational value creation. Competes primarily in the $50M-$500M enterprise value range with a strong reputation for healthcare and tech-enabled services deals.',
        ${JSON.stringify([
          { name: 'Marcus Sterling', title: 'Managing Partner & CEO' },
          { name: 'Elena Rodriguez', title: 'Partner, Head of Healthcare' },
          { name: 'James Chen', title: 'Principal, Technology Services' },
          { name: 'Victoria Ashworth', title: 'CFO & COO' },
        ])}::jsonb,
        ${JSON.stringify([
          'Expand healthcare portfolio with 2-3 new platform investments',
          'Build strategic relationships with Fortune 500 corporate development teams',
          'Strengthen LP relationships for Fund V fundraise',
          'Develop AI/ML capabilities across portfolio companies',
        ])}::jsonb,
        ${JSON.stringify([
          'Summit Partners',
          'Thoma Bravo',
          'Vista Equity Partners',
          'Welsh Carson Anderson & Stowe',
        ])}::jsonb,
        'Authoritative and knowledgeable with emphasis on partnership and long-term value creation. Professional but approachable.',
        NOW()
      )
      ON CONFLICT (slug) DO NOTHING
    `;

    const wsResult = await sql`SELECT id FROM workspaces WHERE slug = 'meridian-capital'`;
    workspaceId = wsResult[0].id;

    await sql`
      INSERT INTO workspace_members (id, workspace_id, user_id, role, accepted_at)
      VALUES (${uuid()}, ${workspaceId}, ${userId}, 'OWNER', NOW())
      ON CONFLICT (workspace_id, user_id) DO NOTHING
    `;

    // Add a couple more team members
    for (const member of [
      { name: 'Elena Rodriguez', email: 'elena@meridiancp.com', role: 'ADMIN' },
      { name: 'James Chen', email: 'jchen@meridiancp.com', role: 'TEAM_MEMBER' },
      { name: 'Sarah Liu', email: 'sliu@meridiancp.com', role: 'EXTERNAL_PARTNER' },
    ]) {
      const memberId = uuid();
      await sql`
        INSERT INTO users (id, email, full_name, email_verified)
        VALUES (${memberId}, ${member.email}, ${member.name}, true)
        ON CONFLICT (email) DO NOTHING
      `;
      const mResult = await sql`SELECT id FROM users WHERE email = ${member.email}`;
      await sql`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, accepted_at)
        VALUES (${uuid()}, ${workspaceId}, ${mResult[0].id}, ${member.role}::workspace_role, NOW())
        ON CONFLICT (workspace_id, user_id) DO NOTHING
      `;
    }

    console.log(`   Created workspace: Meridian Capital Partners (${workspaceId})`);
  }

  // Step 2: Create the event
  console.log('2/12 — Creating event...');

  const eventResult = await sql`
    INSERT INTO events (
      title, location, start_date, end_date, timezone,
      is_private, approve_mode, status, workspace_id,
      total_capacity, seating_format, tables_config,
      hosts, sponsors,
      event_theme, success_criteria, key_stakeholders, additional_context
    ) VALUES (
      'Meridian Capital Partners — Q2 Executive Dinner',
      ${JSON.stringify({
        venue_name: 'The NoMad Restaurant',
        street_address: '1170 Broadway',
        city: 'New York',
        state_province: 'NY',
        country: 'USA',
      })}::jsonb,
      '2026-04-17T23:00:00Z',
      '2026-04-18T02:00:00Z',
      'America/New_York',
      true,
      'MANUAL',
      'PUBLISHED',
      ${workspaceId},
      20,
      'SEATED',
      ${JSON.stringify({ tables: [
        { number: 1, seats: 10 },
        { number: 2, seats: 10 },
      ]})}::jsonb,
      ${JSON.stringify([
        { name: 'Marcus Sterling', url: null },
        { name: 'Elena Rodriguez', url: null },
      ])}::jsonb,
      ${JSON.stringify([
        { title: 'Meridian Capital Partners', subtitle: 'Host', url: null, logo_url: null, description: 'A leading mid-market private equity firm focused on technology-enabled services and healthcare.' },
      ])}::jsonb,
      'Strategic Connections: Bridging Capital and Innovation',
      'Generate 3+ qualified deal introductions, strengthen relationships with 5 target LPs, and position Meridian as the partner of choice for technology-enabled services founders.',
      ${JSON.stringify([
        { name: 'Marcus Sterling', role: 'Managing Partner — primary host' },
        { name: 'Elena Rodriguez', role: 'Healthcare lead — key relationship builder' },
        { name: 'David Park', role: 'LP Relations — Fund V conversations' },
      ])}::jsonb,
      'This is Meridian''s flagship quarterly dinner. The format is intimate (20 guests, 2 round tables of 10). Goal is quality over quantity — every seat should create potential deal flow or deepen an LP relationship. Avoid seating direct competitors together.'
    )
    RETURNING id
  `;

  const eventId = eventResult[0].id;
  console.log(`   Created event #${eventId}: Meridian Capital Q2 Executive Dinner`);

  // Step 2b: Create event sponsors
  console.log('2b/12 — Creating event sponsors...');

  await sql`
    INSERT INTO event_sponsors (
      event_id, workspace_id, name, tier, description,
      contact_person, contact_email, goals, promised_seats,
      table_preference, key_attendees, sort_order
    ) VALUES (
      ${eventId}, ${workspaceId},
      'Meridian Capital Partners', 'PLATINUM',
      'Host firm. A leading mid-market private equity firm focused on technology-enabled services and healthcare.',
      'Marcus Sterling', 'marcus@meridiancp.com',
      ${JSON.stringify(['Showcase firm expertise to potential LPs', 'Build relationships with target company CEOs', 'Position for Fund V fundraise conversations'])}::jsonb,
      4, 'Table 1',
      ${JSON.stringify([
        { name: 'Marcus Sterling', title: 'Managing Partner' },
        { name: 'Elena Rodriguez', title: 'Partner, Healthcare' },
      ])}::jsonb,
      0
    )
    ON CONFLICT DO NOTHING
  `;

  await sql`
    INSERT INTO event_sponsors (
      event_id, workspace_id, name, tier, description,
      contact_person, contact_email, goals, promised_seats,
      key_attendees, sort_order
    ) VALUES (
      ${eventId}, ${workspaceId},
      'Apex Growth Advisors', 'GOLD',
      'Strategic consulting firm specializing in PE portfolio company growth acceleration.',
      'Rachel Kim', 'rkim@apexgrowth.com',
      ${JSON.stringify(['Meet 2-3 Meridian portfolio CEOs', 'Explore co-investment opportunities'])}::jsonb,
      2,
      ${JSON.stringify([
        { name: 'Rachel Kim', title: 'Managing Director' },
        { name: 'Tom Bradley', title: 'Senior Advisor' },
      ])}::jsonb,
      1
    )
    ON CONFLICT DO NOTHING
  `;

  console.log('   Created 2 event sponsors');

  // Step 3: Create 100 contacts
  console.log('3/12 — Creating 100 contacts...');

  const contactIds: string[] = [];

  // Diversified sources: 40% RSVP, 25% LinkedIn/Event Import, 15% CRM, 10% CSV, 5% Manual, 5% Referral
  const SOURCE_DISTRIBUTION = [
    ...Array(40).fill('RSVP_SUBMISSION'),
    ...Array(15).fill('EVENT_IMPORT'),
    ...Array(10).fill('CSV_IMPORT'),
    ...Array(15).fill('CSV_IMPORT'),
    ...Array(10).fill('MANUAL'),
    ...Array(10).fill('EVENT_IMPORT'),
  ];

  for (let ci = 0; ci < CONTACTS.length; ci++) {
    const c = CONTACTS[ci];
    const contactId = uuid();
    contactIds.push(contactId);
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`;
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
        ${'https://linkedin.com/in/' + c.first.toLowerCase() + c.last.toLowerCase().replace(/[^a-z]/g, '')},
        ${c.tags},
        ${contactSource},
        'SEED_PE_DINNER',
        ${pick(['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING'])}::enrichment_status,
        ${`${c.first} ${c.last} is ${c.title} at ${c.company}, operating in the ${c.industry} sector. Known for ${pick(['strategic leadership', 'deal origination expertise', 'deep sector knowledge', 'strong LP relationships', 'operational value creation', 'cross-border deal experience'])} and a ${pick(['collaborative', 'decisive', 'analytical', 'visionary', 'pragmatic'])} approach to partnerships.`}
      )
      ON CONFLICT DO NOTHING
    `;
  }

  console.log(`   Created ${CONTACTS.length} contacts`);

  // Step 4: Create event objectives
  console.log('4/12 — Creating event objectives...');

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
        ${JSON.stringify(OBJECTIVE_TEMPLATES[i].ai_questions || [])}::jsonb
      )
    `;
  }

  console.log(`   Created ${OBJECTIVE_TEMPLATES.length} objectives`);

  // Step 5: Create guest scores for 72 contacts
  console.log('5/12 — Scoring 72 contacts...');

  const scoredIndices = shuffle([...Array(100).keys()]).slice(0, 72);
  let scoredCount = 0;

  for (const idx of scoredIndices) {
    const c = CONTACTS[idx];
    const contactId = contactIds[idx];

    // Score based on tier
    let baseScore: number;
    if (idx < 25) baseScore = randomInt(65, 95);         // PE partners — high
    else if (idx < 55) baseScore = randomInt(40, 80);     // C-suite targets — medium-high
    else if (idx < 70) baseScore = randomInt(55, 90);     // LPs — high
    else if (idx < 90) baseScore = randomInt(25, 65);     // Advisory — medium
    else baseScore = randomInt(20, 70);                    // Wildcards — varied

    const score = Math.min(100, Math.max(0, baseScore));
    const rationale = pick(RATIONALE_TEMPLATES)
      .replace('{name}', `${c.first} ${c.last}`)
      .replace('{company}', c.company)
      .replace('{industry}', c.industry);

    const talkingPoints = shuffle(TALKING_POINTS_POOL).slice(0, randomInt(2, 4));
    const matchedObjectives = objectiveIds
      .map((objId, oi) => ({
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
    scoredCount++;
  }

  console.log(`   Scored ${scoredCount} contacts`);

  // Step 6: Create join requests (simulating RSVP activity)
  console.log('6/12 — Creating 30 join requests...');

  const joinRequestIndices = shuffle([...Array(50).keys()]).slice(0, 30);
  let jrCount = 0;

  for (const idx of joinRequestIndices) {
    const c = CONTACTS[idx];
    const ownerId = uuid(); // Simulated mobile app user
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`;

    // Create user_profile for join request
    const profileId = uuid();
    await sql`
      INSERT INTO user_profiles (id, owner_id, event_ids, first_name, last_name, emails, created_at, updated_at)
      VALUES (
        ${profileId}, ${ownerId}, ARRAY[${eventId}::integer],
        ${c.first}, ${c.last},
        ${JSON.stringify([{ email }])}::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT (owner_id) DO NOTHING
    `;

    // Determine status distribution: 8 PENDING, 15 APPROVED, 5 REJECTED, 2 CANCELLED
    let status: string;
    if (jrCount < 8) status = 'PENDING';
    else if (jrCount < 23) status = 'APPROVED';
    else if (jrCount < 28) status = 'REJECTED';
    else status = 'CANCELLED';

    const daysAgo = randomInt(1, 21);
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();

    await sql`
      INSERT INTO event_join_requests (
        event_id, owner_id, status, plus_ones, comments,
        rsvp_contact, company_website, goals, looking_for,
        visibility_enabled, notifications_enabled, created_at, updated_at
      ) VALUES (
        ${eventId}, ${ownerId},
        ${status}::eventjoinrequeststatus,
        ${pick([0, 0, 0, 1, 1, 2])},
        ${pick([null, null, 'Looking forward to connecting', 'Excited about the guest list', 'Would love to discuss co-investment opportunities', null])},
        ${email},
        ${`https://${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`},
        ${pick(['Networking', 'Deal sourcing', 'LP relationships', 'Market intelligence', 'Partnership exploration'])},
        ${pick(['Co-investment opportunities', 'Portfolio company synergies', 'New LP commitments', 'Strategic partnerships', 'Market insights'])},
        true, true,
        ${createdAt}, ${createdAt}
      )
    `;
    jrCount++;
  }

  console.log(`   Created ${jrCount} join requests (8 pending, 15 approved, 5 rejected, 2 cancelled)`);

  // Step 7: Create invitation campaign with confirmed invitations
  console.log('7/12 — Creating invitation campaign...');

  const campaignId = uuid();
  await sql`
    INSERT INTO invitation_campaigns (
      id, event_id, name, description, status,
      email_subject, email_body,
      total_invited, total_accepted, total_declined, total_considering
    ) VALUES (
      ${campaignId}, ${eventId},
      'Wave 1 — Top Partners & LPs',
      'Initial outreach to highest-scoring PE partners and LP allocators',
      'ACTIVE',
      'You''re Invited: Meridian Capital Q2 Executive Dinner — April 17',
      'We would be honored to have you join us for an intimate evening of conversation...',
      0, 0, 0, 0
    )
  `;

  // Create 20 invitations from the top-scored contacts
  const topContacts = scoredIndices
    .map(idx => ({ idx, contactId: contactIds[idx], contact: CONTACTS[idx] }))
    .slice(0, 20);

  const invitationIds: string[] = [];
  const invStatuses = [
    ...Array(17).fill('ACCEPTED'),
    ...Array(2).fill('DECLINED'),
    ...Array(1).fill('INVITED'),
  ];

  for (let i = 0; i < topContacts.length; i++) {
    const { contactId, contact: c } = topContacts[i];
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`;
    const invStatus = invStatuses[i];
    const tier = i < 5 ? 'TIER_1' : i < 15 ? 'TIER_2' : 'TIER_3';
    const priority = i < 3 ? 'VIP' : i < 10 ? 'HIGH' : 'NORMAL';
    const invId = uuid();
    invitationIds.push(invId);

    // Stagger timestamps so activity feed shows varied times
    const hoursAgo = randomInt(2, 96); // 2 hours to 4 days ago
    const staggeredTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

    await sql`
      INSERT INTO campaign_invitations (
        id, campaign_id, event_id, contact_id,
        full_name, email,
        status, tier, priority,
        internal_notes, expected_plus_ones,
        created_at, updated_at
      ) VALUES (
        ${invId}, ${campaignId}, ${eventId}, ${contactId},
        ${c.first + ' ' + c.last}, ${email},
        ${invStatus}::invitation_status,
        ${tier}::invitation_tier,
        ${priority}::invitation_priority,
        ${pick(['Key relationship — handle personally', 'New contact via conference', 'Referred by board member', 'Met at Davos', null, null])},
        ${pick([0, 0, 0, 1])},
        ${staggeredTime}::timestamptz,
        ${staggeredTime}::timestamptz
      )
    `;
  }

  console.log(`   Created campaign with 20 invitations (17 accepted, 2 declined, 1 pending)`);

  // Step 8: Create check-in records (14 of 17 confirmed attended)
  console.log('8/12 — Creating check-in records...');

  const acceptedInvitations = invitationIds.slice(0, 17); // 17 accepted
  const checkedInCount = 14;

  for (let i = 0; i < checkedInCount; i++) {
    const c = topContacts[i].contact;
    const contactId = topContacts[i].contactId;
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`;
    const minutesOffset = randomInt(0, 90);
    const checkinTime = new Date('2026-04-17T23:00:00Z');
    checkinTime.setMinutes(checkinTime.getMinutes() + minutesOffset);

    await sql`
      INSERT INTO event_checkins (
        id, event_id, workspace_id, contact_id, invitation_id,
        full_name, email, company, title,
        source, checked_in_by, notes, created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${contactId}, ${acceptedInvitations[i]},
        ${c.first + ' ' + c.last}, ${email}, ${c.company}, ${c.title},
        ${i < 11 ? 'INVITATION' : 'QR_SCAN'}::checkin_source,
        ${userId},
        ${pick([null, null, 'Arrived with +1', 'Dietary: vegetarian', null])},
        ${checkinTime.toISOString()}, ${checkinTime.toISOString()}
      )
    `;
  }

  // Add 2 walk-ins
  for (const walkin of [
    { first: 'Gregory', last: 'Mansfield', company: 'Mansfield Advisory', title: 'Managing Partner' },
    { first: 'Yuki', last: 'Tanaka', company: 'SoftBank Vision Fund', title: 'Investment Director' },
  ]) {
    const checkinTime = new Date('2026-04-17T23:45:00Z');
    await sql`
      INSERT INTO event_checkins (
        id, event_id, workspace_id, contact_id, invitation_id,
        full_name, email, company, title,
        source, checked_in_by, notes, created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${null}, ${null},
        ${walkin.first + ' ' + walkin.last},
        ${walkin.first.toLowerCase() + '@' + walkin.company.toLowerCase().replace(/[^a-z]/g, '') + '.com'},
        ${walkin.company}, ${walkin.title},
        'WALK_IN'::checkin_source,
        ${userId},
        'Walk-in — referred by another attendee',
        ${checkinTime.toISOString()}, ${checkinTime.toISOString()}
      )
    `;
  }

  // Update campaign_invitations.checked_in flag for checked-in guests
  for (let i = 0; i < checkedInCount; i++) {
    const minutesOffset = randomInt(0, 90);
    const checkinTime = new Date('2026-04-17T23:00:00Z');
    checkinTime.setMinutes(checkinTime.getMinutes() + minutesOffset);
    await sql`
      UPDATE campaign_invitations
      SET checked_in = true, checked_in_at = ${checkinTime.toISOString()}::timestamptz
      WHERE id = ${acceptedInvitations[i]}
    `;
  }

  // Assign confirmed guests to tables (table 1: seats 1-10, table 2: seats 1-10)
  // Strategic seating: spread PE partners and LPs across tables
  for (let i = 0; i < Math.min(17, topContacts.length); i++) {
    const tableNum = i < 9 ? 1 : 2;
    const seatNum = i < 9 ? i + 1 : i - 8;
    await sql`
      UPDATE campaign_invitations
      SET table_assignment = ${tableNum}, seat_assignment = ${seatNum}
      WHERE id = ${invitationIds[i]}
    `;
  }

  console.log(`   Created ${checkedInCount} invitation check-ins + 2 walk-ins (flags updated)`);
  console.log(`   Assigned 17 confirmed guests to 2 tables`);

  // Step 8b: Create introduction pairings
  console.log('   Creating introduction pairings...');

  const pairingBatchId = uuid();
  // Use CONTACTS array indices directly so reason text matches the actual people
  const pairingsData = [
    { a: 0, b: 5, reason: 'Harrington (Blackstone) and Chen-Ramirez (Advent) are both exploring healthcare co-investments in the mid-market space. Complementary portfolio expertise and fund mandates.', mutual_interest: 'Healthcare PE co-investment', priority: 1 },
    { a: 1, b: 3, reason: 'Aldrich (KKR Infrastructure) and Waverly (Apollo Credit) bring complementary perspectives — infrastructure and credit strategies that increasingly overlap in energy transition deals.', mutual_interest: 'Infrastructure-credit convergence', priority: 1 },
    { a: 2, b: 8, reason: 'Thornton (Carlyle) and Fitzgerald (Bain Capital) both focus on healthcare PE and could explore co-investment on mid-market healthcare services platforms.', mutual_interest: 'Healthcare PE co-investment', priority: 2 },
    { a: 4, b: 6, reason: 'Pemberton (Warburg Pincus) and Ashford (TPG) share deep technology sector expertise. Potential collaboration on growth equity deals in enterprise software.', mutual_interest: 'Technology growth equity', priority: 2 },
    { a: 9, b: 10, reason: 'Mehta-Shah (General Atlantic) and Sterling (Thoma Bravo) are both active in SaaS and fintech growth equity. Different deal size preferences create co-investment potential.', mutual_interest: 'SaaS and fintech investing', priority: 1 },
    { a: 7, b: 11, reason: 'Okonkwo (Vista Equity) and Calloway (Silver Lake) both specialize in technology-focused PE with different but complementary approaches to value creation.', mutual_interest: 'Enterprise software PE', priority: 2 },
    { a: 12, b: 17, reason: 'Nakamura (Hillhouse Capital) and Osei (African Capital Alliance) bring cross-border emerging market perspectives — Asia-Pacific and Africa — with potential for deal flow sharing.', mutual_interest: 'Emerging market PE strategies', priority: 3 },
    { a: 14, b: 18, reason: 'Montgomery (Ares Management) and Whitfield (Hellman & Friedman) can exchange perspectives on credit vs. equity strategies in financial services sector investments.', mutual_interest: 'Financial services sector PE', priority: 3 },
  ];

  for (const p of pairingsData) {
    if (p.a < contactIds.length && p.b < contactIds.length) {
      await sql`
        INSERT INTO introduction_pairings (
          id, event_id, workspace_id, contact_a_id, contact_b_id,
          reason, mutual_interest, priority, batch_id, model_version
        ) VALUES (
          ${uuid()}, ${eventId}, ${workspaceId},
          ${contactIds[p.a]}, ${contactIds[p.b]},
          ${p.reason}, ${p.mutual_interest}, ${p.priority},
          ${pairingBatchId}, 'claude-sonnet-4-5-20250514'
        )
      `;
    }
  }

  console.log(`   Created ${pairingsData.length} introduction pairings`);

  // Step 9: Create follow-up sequences
  console.log('9/12 — Creating follow-up sequences...');

  const followUpData = [
    { idx: 0, status: 'MEETING_BOOKED', subject: 'Great connecting at the Meridian dinner', meetingBooked: true },
    { idx: 1, status: 'REPLIED', subject: 'Following up from last night', meetingBooked: false },
    { idx: 2, status: 'OPENED', subject: 'A pleasure meeting you at the NoMad', meetingBooked: false },
    { idx: 3, status: 'SENT', subject: 'Thank you for joining us', meetingBooked: false },
    { idx: 4, status: 'MEETING_BOOKED', subject: 'Next steps on co-investment discussion', meetingBooked: true },
    { idx: 5, status: 'REPLIED', subject: 'Wonderful conversation last night', meetingBooked: false },
    { idx: 6, status: 'OPENED', subject: 'Meridian Q2 Dinner follow-up', meetingBooked: false },
    { idx: 7, status: 'SENT', subject: 'Thank you for a wonderful evening', meetingBooked: false },
    { idx: 8, status: 'SENT', subject: 'Great to meet you at the dinner', meetingBooked: false },
    { idx: 9, status: 'PENDING', subject: 'Follow-up from Meridian dinner', meetingBooked: false },
    { idx: 10, status: 'MEETING_BOOKED', subject: 'Let\'s continue our conversation', meetingBooked: true },
    { idx: 11, status: 'OPENED', subject: 'Meridian Capital — next steps', meetingBooked: false },
    { idx: 12, status: 'REPLIED', subject: 'Enjoyed our discussion', meetingBooked: false },
    { idx: 13, status: 'SENT', subject: 'Thank you for attending', meetingBooked: false },
  ];

  for (const fu of followUpData) {
    const c = topContacts[fu.idx].contact;
    const contactId = topContacts[fu.idx].contactId;
    const email = `${c.first.toLowerCase()}.${c.last.toLowerCase().replace(/[^a-z]/g, '')}@${c.company.toLowerCase().replace(/[^a-z]/g, '')}.com`;

    const sentAt = fu.status !== 'PENDING' ? new Date('2026-04-18T14:00:00Z').toISOString() : null;
    const openedAt = ['OPENED', 'REPLIED', 'MEETING_BOOKED'].includes(fu.status) ? new Date('2026-04-18T16:30:00Z').toISOString() : null;
    const repliedAt = ['REPLIED', 'MEETING_BOOKED'].includes(fu.status) ? new Date('2026-04-18T20:00:00Z').toISOString() : null;
    const meetingAt = fu.meetingBooked ? new Date('2026-04-19T09:00:00Z').toISOString() : null;

    await sql`
      INSERT INTO follow_up_sequences (
        id, event_id, workspace_id, contact_id,
        status, subject, content, personalization_context,
        model_version, generated_at, sent_at, opened_at, replied_at, meeting_booked_at,
        created_at, updated_at
      ) VALUES (
        ${uuid()}, ${eventId}, ${workspaceId}, ${contactId},
        ${fu.status}::follow_up_status,
        ${fu.subject},
        ${`Dear ${c.first},\n\nThank you for joining us at the Meridian Capital Q2 Executive Dinner at The NoMad last evening. It was a pleasure discussing ${pick(['co-investment opportunities in the mid-market space', 'the evolving LP landscape and fund allocation trends', 'portfolio company synergies across our networks', 'your perspective on the current deal environment'])}.\n\n${pick(['I\'d love to continue our conversation about potential collaboration.', 'Your insights on the market were invaluable — I\'d welcome the chance to explore synergies.', 'As mentioned, I believe there are meaningful ways our firms could work together.', 'I was particularly interested in your thoughts on value creation strategies.'])}\n\nWould you be open to a 30-minute call next week to explore this further?\n\nBest regards,\nMarcus Sterling\nMeridian Capital Partners`},
        ${JSON.stringify({ score: randomInt(70, 97), company: c.company, title: c.title, talking_points: ['Co-investment discussion', 'Portfolio synergies'] })}::jsonb,
        'claude-sonnet-4-5-20250514',
        ${new Date('2026-04-18T13:00:00Z').toISOString()},
        ${sentAt}, ${openedAt}, ${repliedAt}, ${meetingAt},
        ${new Date('2026-04-18T13:00:00Z').toISOString()},
        ${new Date('2026-04-18T20:00:00Z').toISOString()}
      )
    `;
  }

  console.log(`   Created ${followUpData.length} follow-up sequences (3 meetings booked, 3 replied, 3 opened, 4 sent, 1 pending)`);

  // Step 10: Create briefing packet
  console.log('10/12 — Creating briefing packet...');

  const topScoredForBriefing = topContacts.slice(0, 8).map(tc => {
    const c = tc.contact;
    return {
      contact_id: tc.contactId,
      full_name: `${c.first} ${c.last}`,
      company: c.company,
      title: c.title,
      relevance_score: randomInt(80, 97),
      talking_points: shuffle(TALKING_POINTS_POOL).slice(0, 3),
      score_rationale: `${c.first} ${c.last} is a high-value attendee as ${c.title} at ${c.company}. Their profile aligns strongly with Meridian's thesis.`,
      key_interests: shuffle(['Co-investment', 'LP relationships', 'Deal sourcing', 'Value creation', 'Exit strategies', 'Fund formation']).slice(0, 3),
      conversation_starters: [
        `Ask about ${c.company}'s recent deal activity in ${c.industry}`,
        `Discuss mutual interest in mid-market buyout opportunities`,
        `Explore potential co-investment on the upcoming healthcare platform deal`,
      ],
    };
  });

  await sql`
    INSERT INTO briefing_packets (
      id, event_id, workspace_id, generated_for,
      briefing_type, status, title, content,
      guest_count, model_version, generated_at, created_at, updated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId}, ${userId},
      'PRE_EVENT'::briefing_type, 'READY'::briefing_status,
      'Pre-Event Briefing — Meridian Q2 Executive Dinner',
      ${JSON.stringify({
        event_summary: 'The Meridian Capital Partners Q2 Executive Dinner at The NoMad brings together 17 confirmed guests from across private equity, institutional capital, and corporate leadership. The guest list has been curated against three objectives: PE decision-makers with co-investment authority, C-suite acquisition targets in our thesis sectors, and institutional LPs increasing PE allocations. Average relevance score across confirmed attendees: 88.',
        key_guests: topScoredForBriefing,
        strategic_notes: 'Key dynamics to watch: Three attendees (Harrington, Aldrich, Waverly) have overlapping LP relationships — seat them at different tables. Thornton from Carlyle recently lost a competitive bid to Apollo; avoid seating next to Waverly. Chen-Ramirez from Advent has expressed interest in our healthcare thesis — this is the highest-priority conversion opportunity.',
        agenda_highlights: [
          '6:30 PM — Cocktail reception (terrace) — Focus on new introductions',
          '7:15 PM — Seated dinner service begins — Host welcome by Marcus Sterling',
          '8:00 PM — Table-side conversations — Each table has a Meridian team member facilitating',
          '9:00 PM — Dessert & open networking — Key moment for follow-up scheduling',
          '9:30 PM — Event concludes — Team debrief at 10 PM',
        ],
      })}::jsonb,
      ${topScoredForBriefing.length},
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-04-17T16:00:00Z').toISOString()},
      ${new Date('2026-04-17T16:00:00Z').toISOString()},
      ${new Date('2026-04-17T16:00:00Z').toISOString()}
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
      'Morning-of Briefing — Meridian Q2 Executive Dinner',
      ${JSON.stringify({
        event_summary: 'Good morning. Tonight\'s Q2 Executive Dinner at The NoMad is on track. 17 of 20 invitees have confirmed. Last-minute changes: Sofia Chen-Ramirez (Advent) will arrive 30 minutes late due to a flight delay. Gregory Mansfield (Mansfield Advisory) has reached out asking to attend as a walk-in — he was referred by James Harrington.',
        key_guests: topScoredForBriefing.slice(0, 5),
        strategic_notes: 'VIP arrival protocol: James Harrington (Blackstone) and Marcus Aldrich (KKR) should be greeted personally by Marcus Sterling. Harrison Whitmore (Whitmore Family Office) is bringing his daughter Eleanor — she is being considered for the next generation LP program. Seating cards have been placed per the approved arrangement. Reminder: do NOT seat Thornton and Waverly at the same table.',
        agenda_highlights: [
          '4:00 PM — Final venue walkthrough with NoMad events team',
          '5:30 PM — Team briefing at venue (all Meridian staff)',
          '6:00 PM — AV check for welcome presentation',
          '6:30 PM — Cocktail reception opens — focus on greeting VIP arrivals first',
          '7:15 PM — Transition to seated dinner, host welcome remarks',
          '9:30 PM — Event concludes — team debrief at 10 PM sharp',
        ],
      })}::jsonb,
      5,
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-04-17T12:00:00Z').toISOString()},
      ${new Date('2026-04-17T12:00:00Z').toISOString()},
      ${new Date('2026-04-17T12:00:00Z').toISOString()}
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
      'End-of-Day Briefing — Meridian Q2 Executive Dinner',
      ${JSON.stringify({
        event_summary: 'Tonight\'s dinner was a strong success. 16 of 17 confirmed guests checked in (94% attendance). 2 walk-ins were accommodated. Key outcomes: 3 follow-up meetings were verbally confirmed during the event. The co-investment discussion between Harrington and Chen-Ramirez was particularly productive — both expressed interest in the healthcare platform deal.',
        key_guests: topScoredForBriefing.slice(0, 6),
        strategic_notes: 'Immediate follow-up priorities: (1) James Harrington wants a call Tuesday re: healthcare co-investment — schedule ASAP. (2) Claudia Barretti (Stanford Endowment) mentioned increasing PE allocation by $200M — send the fund overview deck tomorrow. (3) Harrison Whitmore was impressed by the event format and asked about hosting a similar dinner in Q3 for his network. Missed connections: Franklin Rhodes (NY State CRF) left early and didn\'t get to speak with Marcus — send a personal note.',
        agenda_highlights: [
          'Attendance: 16 confirmed + 2 walk-ins = 18 total (90% of capacity)',
          'Key conversion: Sofia Chen-Ramirez moved from "Considering" to verbally committed for co-invest',
          'Follow-up emails to be sent by 2 PM tomorrow — AI drafts are ready for review',
          '3 meeting requests logged during event — all scheduled for next week',
          'Team debrief notes captured — see action items in Follow-Up tab',
        ],
      })}::jsonb,
      6,
      'claude-sonnet-4-5-20250514',
      ${new Date('2026-04-18T02:30:00Z').toISOString()},
      ${new Date('2026-04-18T02:30:00Z').toISOString()},
      ${new Date('2026-04-18T02:30:00Z').toISOString()}
    )
  `;

  console.log(`   Created 3 briefing packets (pre-event, morning, end-of-day) with key guests`);

  // Step 11: Create broadcast message
  console.log('11/12 — Creating broadcast message...');

  await sql`
    INSERT INTO broadcast_messages (
      id, event_id, workspace_id, created_by,
      subject, content, status, sent_at,
      recipient_count, delivered_count, opened_count,
      created_at, updated_at
    ) VALUES (
      ${uuid()}, ${eventId}, ${workspaceId}, ${userId},
      'Thank you for a wonderful evening',
      ${'Dear guests,\n\nThank you for making the Meridian Capital Q2 Executive Dinner such a memorable evening. The conversations and connections formed last night are exactly why we host these intimate gatherings.\n\nYou will receive a personalized follow-up from our team in the coming days. In the meantime, please don\'t hesitate to reach out if there\'s anything we can help with.\n\nWarm regards,\nMarcus Sterling\nMeridian Capital Partners'},
      'SENT'::broadcast_status,
      ${new Date('2026-04-18T14:00:00Z').toISOString()},
      16, 16, 12,
      ${new Date('2026-04-18T14:00:00Z').toISOString()},
      ${new Date('2026-04-18T14:00:00Z').toISOString()}
    )
  `;

  console.log(`   Created 1 broadcast message (16 delivered, 12 opened)`);

  // Step 12: Create agent activity log entries
  console.log('12/13 — Creating agent activity log entries...');

  const agentActivities = [
    {
      type: 'scoring',
      headline: 'Scored 72 contacts against 3 event objectives',
      detail: '38 qualify with a score of 60+. Top match: James Harrington (97). 5 contacts scored conservatively due to limited profile data.',
      metadata: { total_scored: 72, qualified: 38, top_score: 97 },
      daysAgo: 5,
    },
    {
      type: 'enrichment',
      headline: 'Enriched 45 contact profiles',
      detail: 'Updated titles, companies, industries, and generated AI summaries for 45 contacts. 3 contacts could not be enriched — they may need manual review.',
      metadata: { completed: 45, failed: 3, total: 48 },
      daysAgo: 5,
    },
    {
      type: 'scoring',
      headline: 'Re-scored 30 contacts after enrichment updates',
      detail: '8 contacts moved above the 60+ threshold after enrichment revealed additional relevant background. Average score change: +12 points.',
      metadata: { total_scored: 30, newly_qualified: 8, avg_change: 12 },
      daysAgo: 4,
    },
    {
      type: 'observation',
      headline: '4 high-scoring contacts (80+) haven\'t been invited yet',
      detail: 'James Harrington (97), Sofia Chen-Ramirez (94), Marcus Aldrich (91), and Claudia Barretti (89) all score above 80 but aren\'t in any invitation wave. Consider adding them to your next campaign.',
      metadata: { contact_count: 4 },
      daysAgo: 4,
    },
    {
      type: 'scoring',
      headline: 'Processed 30 inbound RSVP submissions',
      detail: '18 are strong matches (70+). 7 are moderate fits. 5 scored below 40 — they may not align with your event objectives.',
      metadata: { total: 30, strong: 18, moderate: 7, weak: 5 },
      daysAgo: 3,
    },
    {
      type: 'seating',
      headline: 'Proposed seating for 17 guests across 2 tables',
      detail: 'Used "mixed interests" strategy. Separated competing firms (Carlyle/Apollo) and balanced seniority across tables. Each placement includes confidence scores.',
      metadata: { assignment_count: 17, table_count: 2, strategy: 'MIXED_INTERESTS' },
      daysAgo: 2,
    },
    {
      type: 'introduction',
      headline: 'Identified 5 high-priority introduction pairings',
      detail: 'Based on shared PE focus, complementary investment theses, and overlapping LP relationships. 2 are must-meets, 3 are high priority.',
      metadata: { pairing_count: 5, must_meet: 2 },
      daysAgo: 2,
    },
    {
      type: 'briefing',
      headline: 'Generated pre-event briefing with 8 guest profiles',
      detail: 'Prepared talking points and conversation starters for each guest. Key guests include James Harrington, Sofia Chen-Ramirez, and Marcus Aldrich.',
      metadata: { briefing_type: 'PRE_EVENT', guest_count: 8 },
      daysAgo: 1,
    },
    {
      type: 'briefing',
      headline: 'Generated morning-of briefing with 5 key updates',
      detail: 'Sofia Chen-Ramirez arriving 30 minutes late. Gregory Mansfield requesting walk-in spot. Updated VIP greeting protocol included.',
      metadata: { briefing_type: 'MORNING', guest_count: 5 },
      daysAgo: 1,
    },
    {
      type: 'observation',
      headline: '3 confirmed guests are connected to your platinum sponsor contacts',
      detail: 'Harrington, Aldrich, and Waverly all have LP relationships with institutions in your sponsor network. Consider seating them for maximum cross-pollination.',
      metadata: { contact_count: 3 },
      daysAgo: 1,
    },
    {
      type: 'follow_up',
      headline: 'Drafted personalized follow-ups for 14 attendees',
      detail: 'Each follow-up references specific talking points from their profiles and the event context. Ready for your review in the Follow-Up tab.',
      metadata: { created: 14, skipped: 0, auto_generated: true },
      hoursAgo: 12,
    },
    {
      type: 'briefing',
      headline: 'Generated end-of-day briefing with event outcomes',
      detail: '94% attendance rate. 3 follow-up meetings verbally confirmed. Key conversion: Chen-Ramirez moved from considering to committed for co-invest.',
      metadata: { briefing_type: 'END_OF_DAY', guest_count: 6 },
      hoursAgo: 8,
    },
    {
      type: 'observation',
      headline: 'Follow-up window alert: 2 high-value attendees haven\'t been contacted',
      detail: 'Franklin Rhodes (NY State CRF) left early and needs a personal note. Harrison Whitmore expressed interest in a Q3 event — time-sensitive opportunity.',
      metadata: { contact_count: 2 },
      hoursAgo: 4,
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

  // Step 12b: Seed agent preferences (learned from past user overrides)
  console.log('12b/14 — Seeding agent preferences...');

  const agentPreferences = [
    {
      category: 'seating',
      preference_key: 'executive_clustering',
      preference_text: 'Team prefers grouping C-suite executives together for strategic conversations',
      confidence: 0.7,
      observation_count: 3,
    },
    {
      category: 'seating',
      preference_key: 'competitor_separation',
      preference_text: 'Avoid placing guests from competing firms at the same table',
      confidence: 0.8,
      observation_count: 4,
    },
    {
      category: 'seating',
      preference_key: 'sponsor_prominence',
      preference_text: 'Sponsor key attendees should be seated at tables with the highest-scoring guests',
      confidence: 0.6,
      observation_count: 2,
    },
  ];

  for (const pref of agentPreferences) {
    await sql`
      INSERT INTO agent_preferences (
        id, workspace_id, category, preference_key, preference_text,
        confidence, observation_count, last_observed
      ) VALUES (
        ${uuid()}, ${workspaceId}, ${pref.category}, ${pref.preference_key},
        ${pref.preference_text}, ${pref.confidence}, ${pref.observation_count},
        ${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()}::timestamptz
      )
      ON CONFLICT (workspace_id, preference_key) DO NOTHING
    `;
  }

  console.log(`   Created ${agentPreferences.length} agent preferences`);

  // Step 13: Create a session for demo login
  console.log('14/14 — Creating demo login session...');

  const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  const sessionResult = await sql`
    INSERT INTO sessions (user_id, workspace_id, expires_at)
    VALUES (${userId}, ${workspaceId}, ${sessionExpiry}::timestamptz)
    RETURNING id
  `;

  const sessionId = sessionResult[0].id;
  console.log(`   Created session: ${sessionId}`);
  console.log(`   Set cookie "moots_session=${sessionId}" in your browser to log in.\n`);

  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('✅ Seed complete!\n');
  console.log(`   Event:         #${eventId} — Meridian Capital Q2 Executive Dinner`);
  console.log(`   Workspace:     ${workspaceId}`);
  console.log(`   Contacts:      100 (PE partners, C-suite, LPs, advisors, wildcards)`);
  console.log(`   Objectives:    3`);
  console.log(`   Scored:        72 / 100`);
  console.log(`   Join Requests: 30 (8 pending, 15 approved, 5 rejected, 2 cancelled)`);
  console.log(`   Campaign:      Wave 1 — 20 invitations (17 accepted)`);
  console.log(`   Check-ins:     14 of 17 attended + 2 walk-ins`);
  console.log(`   Follow-ups:    14 sequences (3 meetings, 3 replied, 3 opened, 4 sent, 1 pending)`);
  console.log(`   Briefing:      1 pre-event packet`);
  console.log(`   Broadcast:     1 post-event thank you`);
  console.log(`   Preferences:   ${agentPreferences.length} learned agent preferences`);
  console.log(`   Session:       ${sessionId}`);
  console.log(`\n   🔑 To log in, run this in your browser console:`);
  console.log(`   document.cookie = "moots_session=${sessionId}; path=/; max-age=2592000"`);
  console.log(`\n   Open: http://localhost:3003/dashboard/${eventId}/overview`);
  console.log('═══════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});

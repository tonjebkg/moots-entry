/**
 * Backfill script: matches campaign_invitations.email to people_contacts.emails
 * and populates the contact_id foreign key.
 *
 * Usage:
 *   npx tsx scripts/backfill-contact-ids.ts
 *
 * Safe to re-run — only updates rows where contact_id IS NULL.
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = neon(DATABASE_URL);

async function backfill() {
  console.log('Starting contact_id backfill...\n');

  // Find all invitations without a contact_id that have an email
  const invitations = await db`
    SELECT ci.id, ci.email, ci.full_name, ic.workspace_id
    FROM campaign_invitations ci
    JOIN invitation_campaigns ic ON ic.id = ci.campaign_id
    WHERE ci.contact_id IS NULL
      AND ci.email IS NOT NULL
      AND ci.email != ''
  `;

  console.log(`Found ${invitations.length} invitations without contact_id\n`);

  let matched = 0;
  let notFound = 0;

  for (const inv of invitations) {
    // Search for a contact with this email in the same workspace
    // The people_contacts.emails column is JSONB array of {email, label} objects
    const contacts = await db`
      SELECT id FROM people_contacts
      WHERE workspace_id = ${inv.workspace_id}
        AND emails @> ${JSON.stringify([{ email: inv.email }])}::jsonb
      LIMIT 1
    `;

    if (contacts.length > 0) {
      await db`
        UPDATE campaign_invitations
        SET contact_id = ${contacts[0].id}
        WHERE id = ${inv.id}
      `;
      matched++;
      if (matched % 50 === 0) {
        console.log(`  Matched ${matched} so far...`);
      }
    } else {
      notFound++;
    }
  }

  console.log(`\nBackfill complete.`);
  console.log(`  Matched: ${matched}`);
  console.log(`  No contact found: ${notFound}`);
  console.log(`  Total processed: ${invitations.length}`);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});

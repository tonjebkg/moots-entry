import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const db = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Running migration: add plus_ones and comments to event_join_requests...');

    await db`
      ALTER TABLE event_join_requests
      ADD COLUMN IF NOT EXISTS plus_ones INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS comments TEXT
    `;

    console.log('✓ Migration completed successfully');

    // Verify columns were added
    const columns = await db`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'event_join_requests'
      AND column_name IN ('plus_ones', 'comments')
    `;

    console.log('✓ Verified columns:', columns);
    process.exit(0);
  } catch (err) {
    console.error('✗ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();

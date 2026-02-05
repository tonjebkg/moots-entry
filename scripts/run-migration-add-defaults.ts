import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const db = neon(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Running migration: add defaults for visibility_enabled and notifications_enabled...');

    // Read and execute the SQL migration file
    const sqlPath = resolve(__dirname, '../migrations/add_defaults_to_join_request_flags.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        await db.unsafe(statement);
      }
    }

    console.log('✓ Migration completed successfully');

    // Verify defaults were added
    const columns = await db`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'event_join_requests'
      AND column_name IN ('visibility_enabled', 'notifications_enabled')
      ORDER BY column_name
    `;

    console.log('\n✓ Verified columns:');
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}, nullable=${col.is_nullable}, default=${col.column_default}`);
    });

    console.log('\n✅ Migration successful! POST /api/events/[eventId]/join-requests should now work.');
    process.exit(0);
  } catch (err: any) {
    console.error('✗ Migration failed:', err);
    console.error('Error details:', err.message);
    process.exit(1);
  }
}

runMigration();

/**
 * Migration runner — executes SQL migrations in order.
 * Tracks applied migrations in a `schema_migrations` table.
 * Safe to re-run (idempotent).
 *
 * Usage:
 *   npx tsx scripts/run-all-migrations.ts
 */

import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const db = neon(DATABASE_URL);

// Ordered list of migrations
const MIGRATIONS = [
  '001_create_invitation_system.sql',
  '002_create_auth_workspace_audit.sql',
  '003_create_people_database_scoring.sql',
  '004_phase3_event_operations.sql',
  '005_phase4_integrations_analytics.sql',
  '006_reply_to_and_retention.sql',
];

async function ensureMigrationsTable() {
  await db`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const rows = await db`SELECT name FROM schema_migrations ORDER BY id`;
  return new Set(rows.map((r: any) => r.name));
}

async function runMigration(name: string) {
  const filePath = path.join(__dirname, '..', 'migrations', name);

  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${name} — file not found`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`  Applying ${name}...`);
  // neon's http driver typed as tagged template; cast for raw SQL string execution
  await (db as unknown as (sql: string) => Promise<unknown>)(sql);
  await db`INSERT INTO schema_migrations (name) VALUES (${name})`;
  console.log(`  ✓ ${name} applied`);
  return true;
}

async function main() {
  console.log('Running migrations...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  let appliedCount = 0;
  let skippedCount = 0;

  for (const migration of MIGRATIONS) {
    if (applied.has(migration)) {
      console.log(`  ⊘ ${migration} (already applied)`);
      skippedCount++;
      continue;
    }

    const didApply = await runMigration(migration);
    if (didApply) appliedCount++;
    else skippedCount++;
  }

  console.log(`\nDone. Applied: ${appliedCount}, Skipped: ${skippedCount}`);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

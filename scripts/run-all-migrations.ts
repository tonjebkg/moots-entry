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

// Auto-discover migrations from the migrations directory, sorted by filename
function discoverMigrations(): string[] {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('migrations/ directory not found');
    return [];
  }
  return fs
    .readdirSync(migrationsDir)
    .filter(f => /^\d+.*\.sql$/.test(f))
    .sort();
}

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

/**
 * Split a SQL file into individual statements, respecting $$ blocks.
 * Handles DO $$ ... $$ and function bodies correctly.
 */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarBlock = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comment-only lines outside of dollar blocks
    if (!inDollarBlock && (trimmed.startsWith('--') && !trimmed.includes('$$'))) {
      continue;
    }

    current += line + '\n';

    // Track $$ blocks
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _ of dollarMatches) {
        inDollarBlock = !inDollarBlock;
      }
    }

    // If we're not in a dollar block and the line ends with ;
    if (!inDollarBlock && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt.length > 0 && stmt !== ';') {
        statements.push(stmt);
      }
      current = '';
    }
  }

  // Handle trailing statement without semicolon
  const remaining = current.trim();
  if (remaining.length > 0 && remaining !== ';' && !remaining.startsWith('--')) {
    statements.push(remaining);
  }

  return statements;
}

async function runMigration(name: string) {
  const filePath = path.join(__dirname, '..', 'migrations', name);

  if (!fs.existsSync(filePath)) {
    console.log(`  Skipping ${name} — file not found`);
    return false;
  }

  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`  Applying ${name}...`);

  const statements = splitStatements(sql);
  for (const stmt of statements) {
    await db.query(stmt, []);
  }

  await db`INSERT INTO schema_migrations (name) VALUES (${name})`;
  console.log(`  ✓ ${name} applied`);
  return true;
}

async function main() {
  console.log('Running migrations...\n');

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();

  const MIGRATIONS = discoverMigrations();
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

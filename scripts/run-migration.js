#!/usr/bin/env node

/**
 * Migration runner script
 * Runs the invitation system migration using the existing database connection
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('📦 Connecting to database...');
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/001_create_invitation_system.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);

    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration...\n');

    // Execute migration
    await client.query(migrationSql);

    console.log('\n✅ Migration completed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE 'invitation%' OR table_name = 'email_send_log')
      ORDER BY table_name
    `);
    const tables = tablesResult.rows;

    console.log('\n📊 Tables created:');
    tables.forEach((table) => {
      console.log(`   ✓ ${table.table_name}`);
    });

    // Check events table was updated
    const eventsColumnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'events'
        AND column_name IN ('total_capacity', 'seating_format', 'tables_config')
      ORDER BY column_name
    `);
    const eventsColumns = eventsColumnsResult.rows;

    console.log('\n📊 Events table columns added:');
    eventsColumns.forEach((col) => {
      console.log(`   ✓ ${col.column_name} (${col.data_type})`);
    });

    console.log('\n🎉 Migration successful! Ready to test invitation system.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  }
}

// Run migration
runMigration();

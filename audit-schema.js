require('dotenv').config({ path: '.env.local' });
process.env.NEXT_PUBLIC_APP_MODE = 'dashboard';
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function auditSchema() {
  try {
    // Get events table schema
    const eventsSchema = await sql`
      SELECT 
        column_name, 
        data_type,
        udt_name,
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'events'
      ORDER BY ordinal_position
    `;
    
    // Get event_join_requests table schema
    const joinRequestsSchema = await sql`
      SELECT 
        column_name, 
        data_type,
        udt_name,
        is_nullable, 
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'event_join_requests'
      ORDER BY ordinal_position
    `;
    
    console.log('\n=== EVENTS TABLE ===\n');
    console.log('Column'.padEnd(30) + 'Type'.padEnd(25) + 'Nullable'.padEnd(12) + 'Default');
    console.log('-'.repeat(100));
    eventsSchema.forEach(col => {
      const type = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;
      console.log(
        col.column_name.padEnd(30) + 
        type.padEnd(25) + 
        col.is_nullable.padEnd(12) + 
        (col.column_default || '(none)')
      );
    });
    
    console.log('\n=== EVENT_JOIN_REQUESTS TABLE ===\n');
    console.log('Column'.padEnd(30) + 'Type'.padEnd(25) + 'Nullable'.padEnd(12) + 'Default');
    console.log('-'.repeat(100));
    joinRequestsSchema.forEach(col => {
      const type = col.data_type === 'USER-DEFINED' ? col.udt_name : col.data_type;
      console.log(
        col.column_name.padEnd(30) + 
        type.padEnd(25) + 
        col.is_nullable.padEnd(12) + 
        (col.column_default || '(none)')
      );
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

auditSchema();

require('dotenv').config({ path: '.env.local' });
process.env.NEXT_PUBLIC_APP_MODE = 'dashboard';
const { neon } = require('@neondatabase/serverless');

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not set in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function getSchema() {
  try {
    const result = await sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = 'event_join_requests'
      ORDER BY ordinal_position
    `;
    
    console.log('\n=== event_join_requests Schema ===\n');
    console.log('Column Name'.padEnd(30) + 'Type'.padEnd(20) + 'Nullable'.padEnd(12) + 'Default');
    console.log('-'.repeat(90));
    
    const notNullNoDefault = [];
    
    result.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'YES' : 'NO';
      const hasDefault = col.column_default ? '✓' : '';
      console.log(
        col.column_name.padEnd(30) + 
        col.data_type.padEnd(20) + 
        nullable.padEnd(12) + 
        (col.column_default || '(none)')
      );
      
      if (col.is_nullable === 'NO' && !col.column_default) {
        notNullNoDefault.push(col.column_name);
      }
    });
    
    console.log('\n=== NOT NULL columns WITHOUT defaults ===');
    if (notNullNoDefault.length > 0) {
      notNullNoDefault.forEach(col => console.log(`  ⚠️  ${col}`));
    } else {
      console.log('  ✅ None - all NOT NULL columns have defaults');
    }
    console.log();
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

getSchema();

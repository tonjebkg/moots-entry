#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const username = process.env.DASHBOARD_AUTH_USER;
const password = process.env.DASHBOARD_AUTH_PASS;
const BASE_URL = 'http://localhost:3003';

if (!username || !password) {
  console.log('⚠️  Auth credentials not found in .env.local');
  process.exit(1);
}

const auth = Buffer.from(`${username}:${password}`).toString('base64');

console.log('🧪 Quick Test: Setting event capacity...\n');

fetch(`${BASE_URL}/api/events/73/capacity`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    total_capacity: 30,
    seating_format: 'SEATED',
    tables_config: {
      tables: [
        { number: 1, seats: 8 },
        { number: 2, seats: 8 },
        { number: 3, seats: 8 },
        { number: 4, seats: 6 },
      ],
    },
  }),
})
.then(async res => {
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:');
  try {
    const json = JSON.parse(text);
    console.log(JSON.stringify(json, null, 2));

    if (res.ok) {
      console.log('\n✅ Capacity endpoint working!');
      console.log('\n🎯 Next steps:');
      console.log(`   1. Open: ${BASE_URL}/dashboard/events/73/campaigns`);
      console.log('   2. Create a new campaign');
      console.log('   3. Upload CSV or add guests manually');
    } else {
      console.log('\n❌ Test failed');
    }
  } catch (e) {
    console.log(text);
  }
})
.catch(err => {
  console.error('❌ Error:', err.message);
});

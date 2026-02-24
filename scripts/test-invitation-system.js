#!/usr/bin/env node

/**
 * End-to-end test for the invitation system
 * Tests all major flows without sending actual emails
 */

require('dotenv').config({ path: '.env.local' });

const testEventId = process.argv[2];

if (!testEventId) {
  console.error('❌ Usage: node scripts/test-invitation-system.js <eventId>');
  console.error('   Example: node scripts/test-invitation-system.js 1');
  process.exit(1);
}

const BASE_URL = 'http://localhost:3000';

// Helper to make authenticated requests
async function apiRequest(method, path, body = null) {
  const username = process.env.DASHBOARD_AUTH_USER;
  const password = process.env.DASHBOARD_AUTH_PASS;
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();

  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { error: text };
  }

  return { status: response.status, data, ok: response.ok };
}

async function runTests() {
  console.log('🧪 Testing Invitation System\n');
  console.log(`Event ID: ${testEventId}\n`);

  let campaignId = null;
  let invitationIds = [];

  try {
    // Test 1: Set event capacity
    console.log('📊 Test 1: Setting event capacity...');
    const capacityRes = await apiRequest('PATCH', `/api/events/${testEventId}/capacity`, {
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
    });

    if (capacityRes.ok) {
      console.log('   ✅ Capacity set: 30 seats, SEATED format');
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(capacityRes.data)}`);
      return;
    }

    // Test 2: Get capacity status
    console.log('\n📊 Test 2: Getting capacity status...');
    const statusRes = await apiRequest('GET', `/api/events/${testEventId}/capacity-status`);
    if (statusRes.ok) {
      console.log(`   ✅ Capacity: ${statusRes.data.seats_filled}/${statusRes.data.total_capacity}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(statusRes.data)}`);
    }

    // Test 3: Create campaign
    console.log('\n📋 Test 3: Creating campaign...');
    const campaignRes = await apiRequest('POST', `/api/events/${testEventId}/campaigns`, {
      name: 'Test Campaign - ' + new Date().toISOString(),
      description: 'Automated test campaign',
      email_subject: 'Test Invitation',
    });

    if (campaignRes.ok) {
      campaignId = campaignRes.data.campaign.id;
      console.log(`   ✅ Campaign created: ${campaignId}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(campaignRes.data)}`);
      return;
    }

    // Test 4: Add individual guest
    console.log('\n👤 Test 4: Adding individual guest...');
    const guestRes = await apiRequest('POST', `/api/campaigns/${campaignId}/invitations`, {
      full_name: 'Test Guest 1',
      email: 'test1@example.com',
      tier: 'TIER_1',
      priority: 'VIP',
      expected_plus_ones: 1,
      internal_notes: 'VIP guest for testing',
    });

    if (guestRes.ok) {
      invitationIds.push(guestRes.data.invitation.id);
      console.log(`   ✅ Guest added: ${guestRes.data.invitation.id}`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(guestRes.data)}`);
    }

    // Test 5: Add more guests
    console.log('\n👥 Test 5: Adding more guests...');
    for (let i = 2; i <= 5; i++) {
      const res = await apiRequest('POST', `/api/campaigns/${campaignId}/invitations`, {
        full_name: `Test Guest ${i}`,
        email: `test${i}@example.com`,
        tier: i <= 3 ? 'TIER_1' : 'TIER_2',
        priority: 'NORMAL',
      });
      if (res.ok) {
        invitationIds.push(res.data.invitation.id);
      }
    }
    console.log(`   ✅ Added ${invitationIds.length} total guests`);

    // Test 6: List invitations
    console.log('\n📝 Test 6: Listing invitations...');
    const listRes = await apiRequest('GET', `/api/campaigns/${campaignId}/invitations`);
    if (listRes.ok) {
      console.log(`   ✅ Found ${listRes.data.invitations.length} invitations`);
      console.log(`   📊 Stats:`, listRes.data.counts);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(listRes.data)}`);
    }

    // Test 7: Bulk update (change tier)
    console.log('\n🔄 Test 7: Bulk updating tiers...');
    const bulkRes = await apiRequest('POST', '/api/invitations/bulk-update', {
      invitation_ids: invitationIds.slice(0, 2),
      updates: { tier: 'TIER_2' },
    });
    if (bulkRes.ok) {
      console.log(`   ✅ Updated ${bulkRes.data.updated} invitations`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(bulkRes.data)}`);
    }

    // Test 8: Update individual invitation
    console.log('\n✏️  Test 8: Updating individual invitation...');
    const updateRes = await apiRequest('PATCH', `/api/invitations/${invitationIds[0]}`, {
      priority: 'HIGH',
      internal_notes: 'Updated priority to HIGH',
    });
    if (updateRes.ok) {
      console.log(`   ✅ Updated invitation`);
    } else {
      console.log(`   ❌ Failed: ${JSON.stringify(updateRes.data)}`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTS COMPLETED');
    console.log('='.repeat(60));
    console.log(`Campaign ID: ${campaignId}`);
    console.log(`Invitations created: ${invitationIds.length}`);
    console.log('\n📝 Next steps:');
    console.log(`   1. Visit: ${BASE_URL}/dashboard/campaigns/${campaignId}`);
    console.log(`   2. Test CSV upload in the UI`);
    console.log(`   3. Configure real Resend API key to test email sending`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/events/${testEventId}`);
    return response.status !== 0;
  } catch (e) {
    return false;
  }
}

(async () => {
  const isRunning = await checkServer();

  if (!isRunning) {
    console.error('❌ Server not running!');
    console.error('   Please start the dev server first:');
    console.error('   npm run dev');
    console.error('');
    process.exit(1);
  }

  await runTests();
})();

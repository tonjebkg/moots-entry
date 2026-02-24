#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3003';
const EVENT_ID = 73;

// Helper function to make authenticated requests
async function makeRequest(method, path, body = null) {
  const authString = Buffer.from(
    `${process.env.DASHBOARD_AUTH_USER}:${process.env.DASHBOARD_AUTH_PASS}`
  ).toString('base64');

  const options = {
    method,
    headers: {
      Authorization: `Basic ${authString}`,
    },
  };

  if (body) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    data = { error: text };
  }

  return { status: response.status, data };
}

async function runTests() {
  console.log('\n🧪 Comprehensive Invitation System Test\n');

  try {
    // Test 1: Create campaign
    console.log('📊 Test 1: Creating campaign...');
    const campaignResult = await makeRequest(
      'POST',
      `/api/events/${EVENT_ID}/campaigns`,
      {
        name: 'Comprehensive Test Campaign',
        description: 'Testing all features',
        email_subject: 'Test Invitation',
        email_body: 'Join us...',
      }
    );

    if (campaignResult.status !== 201) {
      console.log('   ❌ Failed:', campaignResult.data);
      return;
    }

    console.log('   ✅ Campaign created:', campaignResult.data.campaign.id);
    const campaignId = campaignResult.data.campaign.id;

    // Test 2: Add multiple guests
    console.log('\n📊 Test 2: Adding multiple guests...');
    const guests = [
      {
        full_name: 'Alice Johnson',
        email: 'alice@example.com',
        tier: 'TIER_1',
        priority: 'VIP',
      },
      {
        full_name: 'Bob Smith',
        email: 'bob@example.com',
        tier: 'TIER_2',
        priority: 'HIGH',
      },
      {
        full_name: 'Carol Williams',
        email: 'carol@example.com',
        tier: 'TIER_3',
        priority: 'NORMAL',
      },
    ];

    const invitationIds = [];
    for (const guest of guests) {
      const result = await makeRequest(
        'POST',
        `/api/campaigns/${campaignId}/invitations`,
        guest
      );
      if (result.status === 201) {
        invitationIds.push(result.data.invitation.id);
        console.log(`   ✅ Added: ${guest.full_name}`);
      } else {
        console.log(`   ❌ Failed to add ${guest.full_name}:`, result.data);
      }
    }

    // Test 3: Bulk update tier
    console.log('\n📊 Test 3: Bulk updating tier to TIER_2...');
    const bulkResult = await makeRequest('POST', '/api/invitations/bulk-update', {
      invitation_ids: invitationIds,
      updates: { tier: 'TIER_2' },
    });

    if (bulkResult.status === 200) {
      console.log(`   ✅ Updated ${bulkResult.data.updated} invitations`);
    } else {
      console.log('   ❌ Failed:', bulkResult.data);
    }

    // Test 4: Update campaign status
    console.log('\n📊 Test 4: Updating campaign status...');
    const updateCampaignResult = await makeRequest(
      'PATCH',
      `/api/campaigns/${campaignId}`,
      {
        status: 'ACTIVE',
        description: 'Updated description',
      }
    );

    if (updateCampaignResult.status === 200) {
      console.log('   ✅ Campaign updated');
    } else {
      console.log('   ❌ Failed:', updateCampaignResult.data);
    }

    // Test 5: List invitations with filters
    console.log('\n📊 Test 5: Listing invitations (tier=TIER_2)...');
    const listResult = await makeRequest(
      'GET',
      `/api/campaigns/${campaignId}/invitations?tier=TIER_2`
    );

    if (listResult.status === 200) {
      console.log(`   ✅ Found ${listResult.data.total} TIER_2 invitations`);
      console.log(`   📊 Total counts:`, listResult.data.counts);
    } else {
      console.log('   ❌ Failed:', listResult.data);
    }

    // Test 6: Update individual invitation
    console.log('\n📊 Test 6: Updating individual invitation...');
    const updateInvResult = await makeRequest(
      'PATCH',
      `/api/invitations/${invitationIds[0]}`,
      {
        priority: 'VIP',
        internal_notes: 'Updated via comprehensive test',
      }
    );

    if (updateInvResult.status === 200) {
      console.log('   ✅ Invitation updated');
    } else {
      console.log('   ❌ Failed:', updateInvResult.data);
    }

    // Test 7: Delete invitation
    console.log('\n📊 Test 7: Deleting one invitation...');
    const deleteResult = await makeRequest(
      'DELETE',
      `/api/invitations/${invitationIds[2]}`
    );

    if (deleteResult.status === 200) {
      console.log('   ✅ Invitation deleted');
    } else {
      console.log('   ❌ Failed:', deleteResult.data);
    }

    // Test 8: Final campaign stats
    console.log('\n📊 Test 8: Getting final campaign stats...');
    const finalResult = await makeRequest('GET', `/api/campaigns/${campaignId}`);

    if (finalResult.status === 200) {
      console.log('   ✅ Campaign stats:');
      console.log(`      Status: ${finalResult.data.campaign.status}`);
      console.log(
        `      Considering: ${finalResult.data.campaign.total_considering}`
      );
      console.log(`      Invited: ${finalResult.data.campaign.total_invited}`);
    } else {
      console.log('   ❌ Failed:', finalResult.data);
    }

    console.log('\n✅ All comprehensive tests completed!');
    console.log(`\n🎯 Campaign ID: ${campaignId}`);
    console.log(`🌐 View at: ${BASE_URL}/dashboard/campaigns/${campaignId}`);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();

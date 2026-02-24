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
  console.log('\n🧪 Testing Campaign System\n');
  console.log(`🔑 Using credentials: ${process.env.DASHBOARD_AUTH_USER}:${process.env.DASHBOARD_AUTH_PASS?.substring(0, 10)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}\n`);

  try {
    // Test 1: Create campaign
    console.log('📊 Test 1: Creating campaign...');
    const campaignResult = await makeRequest(
      'POST',
      `/api/events/${EVENT_ID}/campaigns`,
      {
        name: 'Black Ambition Dinner - Test Wave',
        description: 'Test campaign for invitation system',
        email_subject: 'You\'re invited to Black Ambition Dinner',
        email_body: 'Join us for an evening of networking...',
      }
    );

    if (campaignResult.status === 201) {
      console.log('   ✅ Campaign created:', campaignResult.data.campaign.id);
      const campaignId = campaignResult.data.campaign.id;

      // Test 2: Add individual guest
      console.log('\n📊 Test 2: Adding individual guest...');
      const invitationResult = await makeRequest(
        'POST',
        `/api/campaigns/${campaignId}/invitations`,
        {
          full_name: 'Test Guest',
          email: 'test@example.com',
          tier: 'TIER_1',
          priority: 'VIP',
          expected_plus_ones: 1,
          internal_notes: 'Manual test entry',
        }
      );

      if (invitationResult.status === 201) {
        console.log('   ✅ Guest added:', invitationResult.data.invitation.email);
        const invitationId = invitationResult.data.invitation.id;

        // Test 3: Update invitation
        console.log('\n📊 Test 3: Updating invitation...');
        const updateResult = await makeRequest(
          'PATCH',
          `/api/invitations/${invitationId}`,
          {
            tier: 'TIER_2',
            internal_notes: 'Updated via API test',
          }
        );

        if (updateResult.status === 200) {
          console.log('   ✅ Invitation updated successfully');
        } else {
          console.log('   ❌ Failed to update invitation:', updateResult.data);
        }

        // Test 4: Get invitation details
        console.log('\n📊 Test 4: Fetching invitation details...');
        const getResult = await makeRequest('GET', `/api/invitations/${invitationId}`);

        if (getResult.status === 200) {
          console.log('   ✅ Invitation fetched:', getResult.data.invitation.full_name);
        } else {
          console.log('   ❌ Failed to fetch invitation:', getResult.data);
        }
      } else {
        console.log('   ❌ Failed to add guest:', invitationResult.data);
      }

      // Test 5: List invitations
      console.log('\n📊 Test 5: Listing campaign invitations...');
      const listResult = await makeRequest(
        'GET',
        `/api/campaigns/${campaignId}/invitations`
      );

      if (listResult.status === 200) {
        console.log(`   ✅ Found ${listResult.data.total} invitations`);
        console.log(`   📊 Counts:`, listResult.data.counts);
      } else {
        console.log('   ❌ Failed to list invitations:', listResult.data);
      }

      // Test 6: Get campaign details
      console.log('\n📊 Test 6: Fetching campaign details...');
      const getCampaignResult = await makeRequest('GET', `/api/campaigns/${campaignId}`);

      if (getCampaignResult.status === 200) {
        console.log('   ✅ Campaign fetched:', getCampaignResult.data.campaign.name);
        console.log('   📊 Stats:', {
          considering: getCampaignResult.data.campaign.total_considering,
          invited: getCampaignResult.data.campaign.total_invited,
          accepted: getCampaignResult.data.campaign.total_accepted,
        });
      } else {
        console.log('   ❌ Failed to fetch campaign:', getCampaignResult.data);
      }

      // Test 7: List all campaigns for event
      console.log('\n📊 Test 7: Listing all campaigns...');
      const listCampaignsResult = await makeRequest(
        'GET',
        `/api/events/${EVENT_ID}/campaigns`
      );

      if (listCampaignsResult.status === 200) {
        console.log(`   ✅ Found ${listCampaignsResult.data.total} campaigns`);
      } else {
        console.log('   ❌ Failed to list campaigns:', listCampaignsResult.data);
      }

      console.log('\n✅ All tests completed successfully!');
      console.log(`\n🎯 Campaign ID: ${campaignId}`);
      console.log(`🌐 View at: ${BASE_URL}/dashboard/campaigns/${campaignId}`);
    } else {
      console.log('   ❌ Failed to create campaign:', campaignResult.data);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();

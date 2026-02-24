#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3003';
const EVENT_ID = 73;

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

  console.log('Status:', response.status);
  console.log('Raw response:', text);

  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    data = { error: text };
  }

  return { status: response.status, data };
}

async function test() {
  // Create campaign
  const campaign = await makeRequest(
    'POST',
    `/api/events/${EVENT_ID}/campaigns`,
    { name: 'Bulk Update Test' }
  );

  const campaignId = campaign.data.campaign.id;

  // Add 2 guests
  const inv1 = await makeRequest(
    'POST',
    `/api/campaigns/${campaignId}/invitations`,
    { full_name: 'Test 1', email: 'test1@example.com', tier: 'TIER_1' }
  );

  const inv2 = await makeRequest(
    'POST',
    `/api/campaigns/${campaignId}/invitations`,
    { full_name: 'Test 2', email: 'test2@example.com', tier: 'TIER_1' }
  );

  const ids = [inv1.data.invitation.id, inv2.data.invitation.id];

  console.log('\n🧪 Testing bulk update with IDs:', ids);

  // Bulk update
  await makeRequest('POST', '/api/invitations/bulk-update', {
    invitation_ids: ids,
    updates: { tier: 'TIER_2' },
  });
}

test();

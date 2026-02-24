#!/bin/bash

# Test validation on join requests endpoint
# Run with: bash scripts/test-validation.sh

echo "🧪 Testing Input Validation..."
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="$BASE_URL/api/events/1/join-requests"

echo "Test 1: Valid input (should succeed)"
curl -s -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "test@example.com",
    "plus_ones": 2,
    "comments": "Looking forward to it!"
  }' | jq '.'
echo ""

echo "Test 2: Invalid email (should fail)"
curl -s -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "not-an-email",
    "plus_ones": 2
  }' | jq '.'
echo ""

echo "Test 3: Too many plus ones (should fail)"
curl -s -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "test@example.com",
    "plus_ones": 15
  }' | jq '.'
echo ""

echo "Test 4: Invalid URL (should fail)"
curl -s -X POST $ENDPOINT \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "company_website": "not-a-url",
    "rsvp_contact": "test@example.com"
  }' | jq '.'
echo ""

echo "✅ Validation tests complete!"

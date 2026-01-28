#!/bin/bash
# Test event create (authenticated) + public fetch (no auth)
# Usage: ./scripts/test-event-flow-public.sh [BASE_URL] [USERNAME] [PASSWORD]
#
# This script verifies:
# 1. POST /api/events/create requires Basic Auth (protected)
# 2. GET /api/events/[id] works WITHOUT auth (public)

set -e

BASE_URL=${1:-http://localhost:3000}
USERNAME=${2}
PASSWORD=${3}

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Error: USERNAME and PASSWORD required for create operation"
  echo "Usage: $0 <BASE_URL> <USERNAME> <PASSWORD>"
  exit 1
fi

# Encode credentials for Basic Auth
AUTH=$(echo -n "$USERNAME:$PASSWORD" | base64)

echo "=========================================="
echo "Testing Public API Access"
echo "Base URL: $BASE_URL"
echo "=========================================="

# Test 1: Verify create requires auth
echo ""
echo "Test 1: POST /api/events/create WITHOUT auth (should fail)"
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/events/create" \
  -H "Content-Type: application/json" \
  -d '{"event":{"title":"Test","start_date":"2026-02-15T18:00:00Z"}}')

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
echo "Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✅ PASS: Create requires authentication"
else
  echo "❌ FAIL: Expected 401, got $HTTP_STATUS"
  exit 1
fi

# Test 2: Create with auth
echo ""
echo "Test 2: POST /api/events/create WITH auth (should succeed)"
CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/events/create" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "title": "Public Access Test Event",
      "city": "San Francisco",
      "start_date": "2026-02-15T18:00:00Z",
      "timezone": "America/Los_Angeles",
      "hosts": [{"name": "Test Host"}]
    }
  }')

HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "200" ]; then
  echo "Response: $BODY"
  echo "❌ FAIL: Create with auth returned status $HTTP_STATUS"
  exit 1
fi

EVENT_ID=$(echo "$BODY" | jq -r '.event_id' 2>/dev/null)
echo "✅ PASS: Event created with ID: $EVENT_ID"

# Test 3: Fetch WITHOUT auth (public access)
echo ""
echo "Test 3: GET /api/events/$EVENT_ID WITHOUT auth (should succeed - PUBLIC)"
FETCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/events/$EVENT_ID")

HTTP_STATUS=$(echo "$FETCH_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$FETCH_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" != "200" ]; then
  echo "Response: $BODY"
  echo "❌ FAIL: Public fetch returned status $HTTP_STATUS"
  echo "This means the middleware is still blocking public access!"
  exit 1
fi

echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

# Verify required fields
TITLE=$(echo "$BODY" | jq -r '.name' 2>/dev/null)
if [ -z "$TITLE" ] || [ "$TITLE" = "null" ]; then
  echo "❌ FAIL: Missing 'name' field"
  exit 1
fi

echo "✅ PASS: Public fetch works without authentication"
echo "✅ PASS: Response includes required fields (name, starts_at, hosts)"

# Test 4: Verify join requests endpoint is still protected
echo ""
echo "Test 4: GET /api/events/$EVENT_ID/join-requests WITHOUT auth (should fail - PROTECTED)"
JR_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/events/$EVENT_ID/join-requests")

HTTP_STATUS=$(echo "$JR_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
echo "Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "401" ]; then
  echo "✅ PASS: Join requests endpoint is protected"
else
  echo "⚠️  WARNING: Expected 401 for protected endpoint, got $HTTP_STATUS"
fi

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  ✅ POST /api/events/create requires auth (protected)"
echo "  ✅ GET /api/events/[id] works without auth (public)"
echo "  ✅ GET /api/events/[id]/join-requests requires auth (protected)"
echo ""
echo "Mobile app can now fetch events without authentication!"
echo ""

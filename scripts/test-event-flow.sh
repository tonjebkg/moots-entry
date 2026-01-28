#!/bin/bash
# Test event create + fetch flow
# Usage: ./scripts/test-event-flow.sh [BASE_URL] [USERNAME] [PASSWORD]
#
# Examples:
#   Local: ./scripts/test-event-flow.sh http://localhost:3000 admin secretpass
#   Prod:  ./scripts/test-event-flow.sh https://your-dashboard.vercel.app admin secretpass

set -e

BASE_URL=${1:-http://localhost:3000}
USERNAME=${2}
PASSWORD=${3}

if [ -z "$USERNAME" ] || [ -z "$PASSWORD" ]; then
  echo "Error: USERNAME and PASSWORD required"
  echo "Usage: $0 <BASE_URL> <USERNAME> <PASSWORD>"
  exit 1
fi

# Encode credentials for Basic Auth
AUTH=$(echo -n "$USERNAME:$PASSWORD" | base64)

echo "=========================================="
echo "Testing Event Create + Fetch Flow"
echo "Base URL: $BASE_URL"
echo "=========================================="

# Step 1: Create event
echo ""
echo "Step 1: Creating event..."
CREATE_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "$BASE_URL/api/events/create" \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "title": "Test Event from Script",
      "city": "San Francisco",
      "start_date": "2026-02-15T18:00:00Z",
      "end_date": "2026-02-15T22:00:00Z",
      "timezone": "America/Los_Angeles",
      "event_url": "https://example.com/test-event",
      "hosts": [
        {
          "name": "Test Host",
          "url": "https://example.com"
        }
      ]
    }
  }')

# Extract HTTP status
HTTP_STATUS=$(echo "$CREATE_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$CREATE_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_STATUS" != "200" ]; then
  echo ""
  echo "❌ FAIL: Create event returned status $HTTP_STATUS"
  exit 1
fi

# Extract event_id
EVENT_ID=$(echo "$BODY" | jq -r '.event_id' 2>/dev/null)

if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" = "null" ]; then
  echo ""
  echo "❌ FAIL: No event_id in response"
  exit 1
fi

echo ""
echo "✅ Event created with ID: $EVENT_ID"

# Step 2: Fetch event
echo ""
echo "Step 2: Fetching event $EVENT_ID..."
FETCH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$BASE_URL/api/events/$EVENT_ID" \
  -H "Authorization: Basic $AUTH")

# Extract HTTP status
HTTP_STATUS=$(echo "$FETCH_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
BODY=$(echo "$FETCH_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status: $HTTP_STATUS"
echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

if [ "$HTTP_STATUS" != "200" ]; then
  echo ""
  echo "❌ FAIL: Fetch event returned status $HTTP_STATUS"
  exit 1
fi

# Verify required fields for mobile app
TITLE=$(echo "$BODY" | jq -r '.name' 2>/dev/null)
START=$(echo "$BODY" | jq -r '.starts_at' 2>/dev/null)
HOSTS=$(echo "$BODY" | jq -r '.hosts' 2>/dev/null)

if [ -z "$TITLE" ] || [ "$TITLE" = "null" ]; then
  echo ""
  echo "❌ FAIL: Missing 'name' field in response"
  exit 1
fi

if [ -z "$START" ] || [ "$START" = "null" ]; then
  echo ""
  echo "❌ FAIL: Missing 'starts_at' field in response"
  exit 1
fi

echo ""
echo "✅ Event fetched successfully"
echo "✅ Required fields present: name, starts_at, hosts"

echo ""
echo "=========================================="
echo "✅ ALL TESTS PASSED"
echo "=========================================="
echo ""
echo "Summary:"
echo "  - Created event ID: $EVENT_ID"
echo "  - Title: $TITLE"
echo "  - Starts: $START"
echo ""

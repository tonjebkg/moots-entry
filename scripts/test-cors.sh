#!/bin/bash

# Test CORS configuration
# Run with: bash scripts/test-cors.sh

echo "🧪 Testing CORS Configuration..."
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="$BASE_URL/api/events/1/join-requests"

echo "Test 1: Preflight Request (OPTIONS)"
curl -v -X OPTIONS $ENDPOINT \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  2>&1 | grep -i "access-control"
echo ""

echo "Test 2: Actual Request with CORS"
curl -v -X POST $ENDPOINT \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "test", "rsvp_contact": "test@example.com"}' \
  2>&1 | grep -i "access-control"
echo ""

echo "✅ CORS test complete!"
echo "Expected headers:"
echo "  - Access-Control-Allow-Origin"
echo "  - Access-Control-Allow-Methods"
echo "  - Access-Control-Allow-Headers"

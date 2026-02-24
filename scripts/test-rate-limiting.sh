#!/bin/bash

# Test rate limiting on join requests endpoint
# Run with: bash scripts/test-rate-limiting.sh

echo "🧪 Testing Rate Limiting..."
echo "Limit: 3 requests per 5 minutes"
echo ""

BASE_URL="http://localhost:3000"
ENDPOINT="$BASE_URL/api/events/1/join-requests"

for i in {1..5}; do
  echo "Request $i:"

  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST $ENDPOINT \
    -H "Content-Type: application/json" \
    -d "{\"owner_id\": \"test-$i\", \"rsvp_contact\": \"test$i@example.com\"}")

  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

  echo "Status: $HTTP_STATUS"

  if [ "$HTTP_STATUS" == "429" ]; then
    echo "✅ Rate limit working! Request $i was blocked."
    echo "Response:"
    echo "$BODY" | jq '.'
    break
  else
    echo "Response: $BODY" | jq -c '{message: .message, error: .error}'
  fi

  echo ""
  sleep 0.5
done

echo ""
echo "✅ Rate limiting test complete!"

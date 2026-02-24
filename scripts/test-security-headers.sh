#!/bin/bash

# Test security headers
# Run with: bash scripts/test-security-headers.sh

echo "🧪 Testing Security Headers..."
echo ""

BASE_URL="http://localhost:3000"

echo "Fetching headers from $BASE_URL..."
echo ""

curl -I $BASE_URL 2>&1 | grep -E "(Content-Security-Policy|X-Frame-Options|X-Content-Type-Options|X-XSS-Protection|Referrer-Policy|Permissions-Policy|Strict-Transport-Security)"

echo ""
echo "✅ Security headers test complete!"
echo ""
echo "Expected headers:"
echo "  ✓ Content-Security-Policy"
echo "  ✓ X-Frame-Options: DENY"
echo "  ✓ X-Content-Type-Options: nosniff"
echo "  ✓ X-XSS-Protection: 1; mode=block"
echo "  ✓ Referrer-Policy: strict-origin-when-cross-origin"
echo "  ✓ Permissions-Policy"
echo ""
echo "For complete analysis, visit:"
echo "  https://securityheaders.com/"

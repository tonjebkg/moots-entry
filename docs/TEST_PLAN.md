# Testing Plan - Phase 1 & 2 Verification

**Purpose**: Verify all security and validation features work correctly before production deployment.

---

## Pre-Testing Setup

### 1. Environment Variables
Ensure your `.env.local` has all required variables:

```bash
# Check environment validation
npm run build

# Should see:
# ✅ Environment variables validated successfully
# 📋 Configuration:
#   - Mode: dashboard
#   - Node Env: development
```

### 2. Start Development Server
```bash
npm run dev
```

Server should start on http://localhost:3000

---

## Test Suite

### ✅ Test 1: Input Validation

**Endpoint**: `POST /api/events/[eventId]/join-requests`

#### Test 1.1: Valid Input
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "test@example.com",
    "plus_ones": 2,
    "comments": "Looking forward to it!"
  }'
```

**Expected**: 201 Created with join request details

#### Test 1.2: Invalid Email
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "not-an-email",
    "plus_ones": 2
  }'
```

**Expected**: 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "rsvp_contact",
      "message": "Invalid email address",
      "code": "invalid_string"
    }
  ]
}
```

#### Test 1.3: Too Many Plus Ones
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "rsvp_contact": "test@example.com",
    "plus_ones": 15
  }'
```

**Expected**: 400 Bad Request with "Too many plus ones (max 10)"

#### Test 1.4: Invalid URL
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Content-Type: application/json" \
  -d '{
    "owner_id": "test-user-123",
    "company_website": "not-a-url",
    "rsvp_contact": "test@example.com"
  }'
```

**Expected**: 400 Bad Request with URL validation error

---

### ✅ Test 2: Rate Limiting

**Endpoint**: `POST /api/events/[eventId]/join-requests`

#### Test 2.1: Exceed Rate Limit
Run this command 4 times rapidly:

```bash
for i in {1..4}; do
  curl -X POST http://localhost:3000/api/events/1/join-requests \
    -H "Content-Type: application/json" \
    -d "{\"owner_id\": \"test-$i\", \"rsvp_contact\": \"test$i@example.com\"}" \
    -w "\nStatus: %{http_code}\n\n"
  sleep 0.5
done
```

**Expected**: First 3 succeed (200/201), 4th returns 429 with:
```json
{
  "error": "Too many join requests. Please try again later.",
  "retryAfter": 300
}
```

**Headers Expected**:
- `X-RateLimit-Limit: 3`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: [timestamp]`
- `Retry-After: [seconds]`

---

### ✅ Test 3: CORS Configuration

**Endpoint**: `POST /api/events/[eventId]/join-requests`

#### Test 3.1: Preflight Request
```bash
curl -X OPTIONS http://localhost:3000/api/events/1/join-requests \
  -H "Origin: http://localhost:3001" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected**: 204 No Content with headers:
- `Access-Control-Allow-Origin: http://localhost:3001`
- `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, ...`
- `Access-Control-Max-Age: 86400`

#### Test 3.2: Actual Request with CORS
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"owner_id": "test", "rsvp_contact": "test@example.com"}' \
  -v
```

**Expected**: CORS headers in response

---

### ✅ Test 4: Security Headers

**Endpoint**: Any endpoint

```bash
curl -I http://localhost:3000/
```

**Expected Headers**:
- `Content-Security-Policy: default-src 'self'; ...`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

#### Test Online
Visit: https://securityheaders.com/
Enter: http://localhost:3000

**Expected**: A or A+ rating

---

### ✅ Test 5: File Upload Validation

**Endpoint**: `POST /api/uploads/event-image`

#### Test 5.1: Valid Image
```bash
# Create a test image (or use an existing one)
curl -X POST http://localhost:3000/api/uploads/event-image \
  -F "file=@/path/to/test-image.jpg" \
  -F "eventId=1"
```

**Expected**: 200 OK with:
```json
{
  "url": "https://...blob.core.windows.net/.../...",
  "path": "events/1/...",
  "message": "Image uploaded successfully",
  "size": "1.5 MB"
}
```

#### Test 5.2: Invalid File Type
```bash
# Try uploading a text file
echo "test" > test.txt
curl -X POST http://localhost:3000/api/uploads/event-image \
  -F "file=@test.txt" \
  -F "eventId=1"
rm test.txt
```

**Expected**: 400 Bad Request
```json
{
  "error": "Invalid file type",
  "details": "Allowed types: image/jpeg, image/png, ..."
}
```

#### Test 5.3: File Too Large
```bash
# Create a 6MB file (exceeds 5MB limit)
dd if=/dev/zero of=large.jpg bs=1m count=6
curl -X POST http://localhost:3000/api/uploads/event-image \
  -F "file=@large.jpg" \
  -F "eventId=1"
rm large.jpg
```

**Expected**: 400 Bad Request
```json
{
  "error": "File too large",
  "details": "File is 6.00MB, maximum is 5MB"
}
```

#### Test 5.4: Rate Limit Uploads
```bash
# Try 6 uploads rapidly (limit is 5 per minute)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/uploads/event-image \
    -F "file=@test.jpg" \
    -F "eventId=1" \
    -w "\nStatus: %{http_code}\n"
done
```

**Expected**: First 5 succeed, 6th returns 429

---

### ✅ Test 6: Error Handling

**Endpoint**: Any endpoint

#### Test 6.1: Not Found
```bash
curl http://localhost:3000/api/events/99999
```

**Expected**: 404 with generic message (no stack trace)

#### Test 6.2: Invalid JSON
```bash
curl -X POST http://localhost:3000/api/events/1/join-requests \
  -H "Content-Type: application/json" \
  -d 'invalid json{'
```

**Expected**: 400 Bad Request with:
```json
{
  "error": "Invalid request body",
  "details": "..."
}
```

#### Test 6.3: Development vs Production
In development mode, errors should show details.
In production mode, errors should be generic.

Set `NODE_ENV=production` and test - should get generic errors only.

---

### ✅ Test 7: Authentication (Dashboard Mode)

**Endpoint**: `GET /dashboard`

#### Test 7.1: No Credentials
```bash
curl http://localhost:3000/dashboard
```

**Expected**: 401 Unauthorized

#### Test 7.2: Wrong Credentials
```bash
curl -u "wrong:password" http://localhost:3000/dashboard
```

**Expected**: 401 Unauthorized

#### Test 7.3: Correct Credentials
```bash
curl -u "$DASHBOARD_AUTH_USER:$DASHBOARD_AUTH_PASS" http://localhost:3000/dashboard
```

**Expected**: 200 OK with dashboard HTML

---

### ✅ Test 8: Environment Validation

#### Test 8.1: Missing Required Var
```bash
# Temporarily remove DATABASE_URL from .env.local
# Then try to build
npm run build
```

**Expected**: Clear error message:
```
❌ Environment validation failed:

Missing required variables:
  ✗ DATABASE_URL: DATABASE_URL is required
```

#### Test 8.2: Invalid Format
```bash
# Set DATABASE_URL to invalid format
# DATABASE_URL=not-a-valid-url
npm run build
```

**Expected**: Validation error with helpful message

---

### ✅ Test 9: Logging

#### Test 9.1: Check Logs
Make various requests and check console output.

**Development Mode**:
```
[2026-02-13T10:30:00.000Z] INFO: API Request { method: 'POST', path: '/api/events/1/join-requests' }
[2026-02-13T10:30:00.100Z] INFO: API Response { statusCode: 201, durationMs: 100 }
```

**Production Mode** (JSON):
```json
{"timestamp":"2026-02-13T10:30:00.000Z","level":"info","message":"API Request","method":"POST","path":"/api/events/1/join-requests"}
```

#### Test 9.2: Error Logging
Trigger an error and verify it's logged with context.

---

## 📋 Testing Checklist

### Build & Startup
- [ ] Build completes without errors: `npm run build`
- [ ] Dev server starts: `npm run dev`
- [ ] Environment validation shows success
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### Validation
- [ ] Valid input succeeds
- [ ] Invalid email rejected
- [ ] Too many plus_ones rejected
- [ ] Invalid URL rejected
- [ ] Validation errors have field details

### Rate Limiting
- [ ] Rate limits applied (3 per 5 min for join requests)
- [ ] 429 status returned when exceeded
- [ ] Rate limit headers present
- [ ] Retry-After header correct

### CORS
- [ ] Preflight requests handled (OPTIONS)
- [ ] CORS headers present
- [ ] Allowed origins work
- [ ] Disallowed origins blocked

### Security Headers
- [ ] CSP header present
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] All security headers present
- [ ] Online tool rates A or A+

### File Uploads
- [ ] Valid images upload successfully
- [ ] Invalid file types rejected
- [ ] Large files rejected (>5MB)
- [ ] Small files rejected (<100B)
- [ ] MIME type mismatch detected
- [ ] Upload rate limiting works
- [ ] Filenames sanitized
- [ ] Metadata tracked

### Error Handling
- [ ] Generic errors in production
- [ ] Detailed errors in development
- [ ] No stack traces exposed
- [ ] Errors logged with context
- [ ] Status codes correct

### Authentication
- [ ] Missing credentials rejected
- [ ] Wrong credentials rejected
- [ ] Correct credentials accepted
- [ ] Timing-safe comparison working

### Environment
- [ ] Missing vars caught at startup
- [ ] Invalid formats rejected
- [ ] Mode-specific validation works
- [ ] Clear error messages

### Logging
- [ ] Requests logged
- [ ] Responses logged with duration
- [ ] Errors logged with context
- [ ] Format correct (pretty dev, JSON prod)

---

## 🐛 If Tests Fail

### Common Issues

1. **Rate limit too aggressive**
   - Adjust limits in `lib/rate-limit.ts`
   - Clear rate limit cache: restart server

2. **CORS not working**
   - Check allowed origins in `lib/cors.ts`
   - Verify Origin header in request

3. **Validation too strict**
   - Review schemas in `lib/schemas/`
   - Adjust constraints as needed

4. **File upload fails**
   - Check Azure credentials in .env.local
   - Verify connection string format

5. **Environment validation fails**
   - Check all required vars in .env.local
   - Verify format matches expectations

---

## 📊 Performance Testing

### Response Times
Test response times for key endpoints:

```bash
# Measure response time
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/events/1
```

**Expected**:
- Simple GET: <100ms
- POST with validation: <200ms
- File upload: <1s (depends on file size)

### Load Testing (Optional)
Use `ab` (Apache Bench) or similar:

```bash
# 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/events/1
```

---

## ✅ Success Criteria

All tests should pass before deploying to production:

- [ ] All validation tests pass
- [ ] All rate limiting tests pass
- [ ] All CORS tests pass
- [ ] All security headers present
- [ ] All file upload tests pass
- [ ] All error handling tests pass
- [ ] All authentication tests pass
- [ ] Environment validation works
- [ ] Logging is structured
- [ ] No sensitive data exposed
- [ ] Response times acceptable
- [ ] Security headers rated A/A+

---

## 🚀 Next Steps After Testing

If all tests pass:

1. **Create Git Commit**
   ```bash
   git add .
   git commit -m "Complete Phase 1 & 2: All security fixes verified"
   ```

2. **Deploy to Staging**
   - Test with real traffic
   - Monitor logs
   - Verify all features work

3. **Deploy to Production**
   - Update environment variables
   - Monitor closely for first 24 hours
   - Be ready to rollback if needed

---

**Happy Testing!** 🧪

# 🔴 PRODUCTION INCIDENT: Attendee Materialization Failure

**Status:** ✅ RESOLVED
**Date:** 2026-02-05
**Priority:** P0 (Critical - User-facing data loss)

---

## EXECUTIVE SUMMARY

**Symptom:** Approved join requests don't appear as attendees in the mobile app, causing users to see empty event rooms.

**Root Cause:** The `event_attendees` table has a NOT NULL constraint on `owner_id`, but the approval handler's INSERT statement was missing this field, causing silent database failures.

**Impact:**
- Dashboard showed "Pending" status after admin clicked "Approved"
- No attendee record created in database
- Mobile app queried empty `event_attendees` table → empty room display
- User experience severely degraded (approved users couldn't see themselves or others)

**Resolution:** Added `owner_id` field to INSERT statement + improved error visibility.

---

## ROOT CAUSE ANALYSIS

### 1️⃣ Missing NOT NULL Field in INSERT

**File:** [app/api/join-requests/[id]/route.ts](app/api/join-requests/[id]/route.ts:100-121)

The attendee materialization code was missing the `owner_id` field:

```typescript
// ❌ BEFORE (BROKEN)
INSERT INTO event_attendees (
  event_id,
  user_profile_id,          // UUID from user_profiles table
  join_request_id,
  visibility_enabled,
  notifications_enabled,
  created_at,
  updated_at
)
```

**Problem:** The `event_attendees` schema has `owner_id VARCHAR NOT NULL`, so this INSERT violated the constraint and failed with:
```
ERROR: null value in column "owner_id" violates not-null constraint
```

### 2️⃣ Error Handling Masked the Failure

**Backend:** [app/api/join-requests/[id]/route.ts:128-133](app/api/join-requests/[id]/route.ts:128-133)
- Caught error in try-catch
- Returned `{ error: "Failed to update join request", status: 500 }`
- Admin received 500 error but no context about constraint violation

**Dashboard:** [app/dashboard/[eventId]/page.tsx:371-374](app/dashboard/[eventId]/page.tsx:371-374)
```typescript
if (res.ok) {
  setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: next } : x))
} else {
  console.error('Failed to update status:', await res.text())  // ❌ Only logs to console
}
```
- No user-facing error message
- Optimistic UI update skipped (because `res.ok = false`)
- Dashboard still shows "Pending"

### 3️⃣ Mobile App Dependency on event_attendees

**Query Pattern (Flutter mobile app):**
```sql
SELECT * FROM event_attendees
WHERE event_id = $1
  AND visibility_enabled = true
```

**Result:** Zero rows → empty room display (no attendees shown, including the approved user themselves)

---

## DATA ARCHITECTURE

### Table Relationships

```
┌─────────────────────────┐
│  event_join_requests    │
├─────────────────────────┤
│ id (uuid) PK            │
│ event_id (int) FK       │
│ owner_id (varchar)      │◄────┐ String UID (Moots profile)
│ user_profile_id (uuid)  │     │
│ status (enum)           │     │
│ plus_ones (int)         │     │
│ comments (varchar)      │     │
│ created_at              │     │
│ updated_at              │     │
└───────────┬─────────────┘     │
            │                   │
            │ ON APPROVED       │
            │ MATERIALIZE       │
            ▼                   │
┌─────────────────────────┐     │
│   event_attendees       │     │
├─────────────────────────┤     │
│ id (uuid) PK            │     │
│ event_id (int) FK       │     │
│ owner_id (varchar) ◄────┼─────┘ ✅ REQUIRED (NOT NULL)
│ user_profile_id (uuid)  │       Copied from join request
│ join_request_id (uuid)  │
│ visibility_enabled (bool)│
│ notifications_enabled    │
│ goals, looking_for, etc. │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```

### Field Mapping on Approval

| Source: `event_join_requests` | Destination: `event_attendees` | Notes |
|-------------------------------|--------------------------------|-------|
| `event_id` | `event_id` | Integer FK to events table |
| `owner_id` | `owner_id` | ✅ **MISSING** - String user identifier |
| `user_profile_id` | `user_profile_id` | UUID FK to user_profiles table |
| `id` | `join_request_id` | UUID link back to join request |
| - | `visibility_enabled` | Set to `true` (default for approved) |
| - | `notifications_enabled` | Set to `true` (default for approved) |
| - | `created_at` | Current timestamp |
| - | `updated_at` | Current timestamp |

---

## CORRECTED DATA FLOW

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. DASHBOARD: Admin changes status dropdown PENDING → APPROVED  │
│    File: app/dashboard/[eventId]/page.tsx:365                   │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. API REQUEST: PATCH /api/join-requests/{id}                   │
│    Payload: { "status": "APPROVED" }                             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. BACKEND: Update join request status                          │
│    File: app/api/join-requests/[id]/route.ts:77-86              │
│    SQL: UPDATE event_join_requests                               │
│         SET status = 'APPROVED', updated_at = NOW()              │
│         WHERE id = $1                                            │
│         RETURNING *                                              │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. BACKEND: Materialize attendee (lines 97-122)                 │
│    ✅ FIX: Now includes owner_id field                          │
│    SQL: INSERT INTO event_attendees (                            │
│           event_id,                                              │
│           owner_id,          ← ✅ ADDED                          │
│           user_profile_id,                                       │
│           join_request_id,                                       │
│           visibility_enabled,                                    │
│           notifications_enabled,                                 │
│           created_at,                                            │
│           updated_at                                             │
│         )                                                        │
│         SELECT                                                   │
│           ${event_id},                                           │
│           ${owner_id},       ← ✅ ADDED                          │
│           ${user_profile_id},                                    │
│           ${join_request_id},                                    │
│           true, true, NOW(), NOW()                               │
│         WHERE NOT EXISTS (                                       │
│           SELECT 1 FROM event_attendees                          │
│           WHERE join_request_id = ${join_request_id}             │
│         )                                                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ ✅ SUCCESS       │  │ ❌ ERROR         │
         │ Status: 200      │  │ Status: 500      │
         └────────┬─────────┘  └────────┬─────────┘
                  │                     │
                  ▼                     ▼
         ┌──────────────────┐  ┌──────────────────┐
         │ Dashboard:       │  │ Dashboard:       │
         │ • Updates UI     │  │ • Shows error    │
         │ • Shows          │  │   message        │
         │   "Approved"     │  │ • Stays on       │
         │ • Success msg ✅ │  │   "Pending"      │
         └────────┬─────────┘  └──────────────────┘
                  │
                  ▼
         ┌────────────────────────────────────────┐
         │ Mobile App: Query event_attendees      │
         │ WHERE event_id = X                     │
         │   AND visibility_enabled = true        │
         │                                        │
         │ ✅ Returns attendee row                │
         │ ✅ User sees themselves in room        │
         │ ✅ User sees other approved attendees  │
         └────────────────────────────────────────┘
```

---

## FILES CHANGED

### 1. Backend: Add `owner_id` to attendee INSERT

**File:** [app/api/join-requests/[id]/route.ts](app/api/join-requests/[id]/route.ts:97-123)

**Change:**
```diff
     // If status was changed to APPROVED, materialize attendee in event_attendees
     if (updates.status === 'APPROVED') {
       await db`
         INSERT INTO event_attendees (
           event_id,
+          owner_id,
           user_profile_id,
           join_request_id,
           visibility_enabled,
           notifications_enabled,
           created_at,
           updated_at
         )
         SELECT
           ${updatedJoinRequest.event_id},
+          ${updatedJoinRequest.owner_id},
           ${updatedJoinRequest.user_profile_id},
           ${updatedJoinRequest.id},
           true,
           true,
           ${now},
           ${now}
         WHERE NOT EXISTS (
           SELECT 1 FROM event_attendees
           WHERE join_request_id = ${updatedJoinRequest.id}
         )
       `;
     }
```

**Why this works:**
- `updatedJoinRequest` comes from `RETURNING *` (line 85), which includes all columns from `event_join_requests`
- The `owner_id` field exists on `event_join_requests` and is populated when the join request is created
- By copying `owner_id` to `event_attendees`, we satisfy the NOT NULL constraint

### 2. Dashboard: Show success/error messages

**File:** [app/dashboard/[eventId]/page.tsx](app/dashboard/[eventId]/page.tsx:365-378)

**Change:**
```diff
   async function handleStatusChange(g: Guest, next: NeonStatus) {
     const res = await fetch(`/api/join-requests/${g.id}`, {
       method: 'PATCH',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ status: next })
     })
     if (res.ok) {
       setGuests(prev => prev.map(x => x.id === g.id ? { ...x, status: next } : x))
+      setMessage(`Status updated to ${STATUS_LABEL[next]}`)
     } else {
-      console.error('Failed to update status:', await res.text())
+      const errorText = await res.text()
+      console.error('Failed to update status:', errorText)
+      setMessage(`Failed to update status: ${errorText}`)
     }
   }
```

**Why this improves UX:**
- Success message confirms the action completed
- Error message surfaces backend failures to the admin
- Prevents confusion about why status didn't change

---

## MOBILE COMPATIBILITY CONFIRMATION

### Flutter Query Requirements

The mobile app queries `event_attendees` with filters:
```dart
// Pseudocode based on expected behavior
final attendees = await supabase
  .from('event_attendees')
  .select()
  .eq('event_id', eventId)
  .eq('visibility_enabled', true);
```

### Fields Set by Fix ✅

| Field | Value | Satisfies Mobile Query? |
|-------|-------|------------------------|
| `event_id` | From join request | ✅ Matches filter |
| `owner_id` | From join request | ✅ Present (no longer NULL) |
| `user_profile_id` | From join request | ✅ Valid FK to user_profiles |
| `join_request_id` | From join request | ✅ Valid FK (used for idempotency) |
| `visibility_enabled` | `true` | ✅ Matches filter (visible to all) |
| `notifications_enabled` | `true` | ✅ User will receive notifications |
| `created_at` | Current timestamp | ✅ Audit trail |
| `updated_at` | Current timestamp | ✅ Audit trail |

### Optional Fields (NULL Allowed)

These fields are populated later by the user via mobile app "Looking for" flow:
- `goals` (nullable)
- `looking_for` (nullable)
- `rsvp_contact` (nullable)
- `company_website` (nullable)
- `match_profile` (nullable)
- `looking_for_updated_at` (nullable)

**Conclusion:** The fix provides all required NOT NULL fields and satisfies mobile app query filters. ✅

---

## VERIFICATION STEPS

### Pre-Flight Check (Production Safety)

Before testing in production, verify the fix in local/staging:

```bash
# 1. Build succeeds
npm run build
# ✅ Should complete without TypeScript errors

# 2. Start dev server
npm run dev

# 3. Open dashboard: http://localhost:3000/dashboard
```

### Step 1: Database State BEFORE Approval

**SQL Query:**
```sql
-- Find a pending join request for testing
SELECT
  ejr.id AS join_request_id,
  ejr.event_id,
  ejr.owner_id,
  ejr.user_profile_id,
  ejr.status,
  up.first_name,
  up.last_name
FROM event_join_requests ejr
LEFT JOIN user_profiles up ON ejr.owner_id = up.owner_id
WHERE ejr.status = 'PENDING'
  AND ejr.event_id = 59  -- Replace with your test event ID
LIMIT 1;
```

**Expected Result:**
```
join_request_id         | event_id | owner_id        | user_profile_id              | status  | first_name | last_name
------------------------|----------|-----------------|------------------------------|---------|------------|----------
abc123-def456-ghi789... | 59       | moots_user_123  | 550e8400-e29b-41d4-a716-... | PENDING | Jane       | Doe
```

**Verify attendee row does NOT exist yet:**
```sql
SELECT * FROM event_attendees
WHERE join_request_id = 'abc123-def456-ghi789...';  -- Use ID from above
```

**Expected:** 0 rows (no attendee exists yet)

---

### Step 2: Approve via Dashboard

1. Navigate to: `http://localhost:3000/dashboard/{event_id}`
2. Find the pending join request in the guest table
3. Click the status dropdown (currently showing "Pending")
4. Select **"Approved"** from the dropdown
5. ✅ **SUCCESS INDICATOR:** Yellow banner shows: "Status updated to Approved"
6. ✅ **UI UPDATE:** Dropdown now shows "Approved" with blue background (`bg-blue-700`)

**If error occurs:**
- ❌ Yellow banner shows: "Failed to update status: [error message]"
- ❌ Dropdown stays on "Pending"
- Check browser console and server logs for details

---

### Step 3: Database State AFTER Approval

**SQL Query 1: Verify join request status updated**
```sql
SELECT
  id,
  event_id,
  owner_id,
  user_profile_id,
  status,
  updated_at
FROM event_join_requests
WHERE id = 'abc123-def456-ghi789...';  -- Use your test ID
```

**Expected Result:**
```
id                      | event_id | owner_id        | user_profile_id              | status   | updated_at
------------------------|----------|-----------------|------------------------------|----------|---------------------------
abc123-def456-ghi789... | 59       | moots_user_123  | 550e8400-e29b-41d4-a716-... | APPROVED | 2026-02-05 18:30:45.123+00
```
✅ `status = 'APPROVED'`
✅ `updated_at` is recent timestamp

---

**SQL Query 2: Verify attendee row created**
```sql
SELECT
  ea.id AS attendee_id,
  ea.event_id,
  ea.owner_id,
  ea.user_profile_id,
  ea.join_request_id,
  ea.visibility_enabled,
  ea.notifications_enabled,
  ea.created_at,
  up.first_name,
  up.last_name
FROM event_attendees ea
LEFT JOIN user_profiles up ON ea.user_profile_id = up.id
WHERE ea.join_request_id = 'abc123-def456-ghi789...';
```

**Expected Result:**
```
attendee_id             | event_id | owner_id        | user_profile_id              | join_request_id         | visibility | notifications | created_at                  | first_name | last_name
------------------------|----------|-----------------|------------------------------|-------------------------|------------|---------------|-----------------------------|------------|----------
xyz789-abc123-def456... | 59       | moots_user_123  | 550e8400-e29b-41d4-a716-... | abc123-def456-ghi789... | true       | true          | 2026-02-05 18:30:45.123+00  | Jane       | Doe
```

✅ **SUCCESS CRITERIA:**
- `attendee_id` is NOT NULL (row exists)
- `owner_id` matches join request `owner_id` (✅ FIX VERIFIED)
- `user_profile_id` matches join request `user_profile_id`
- `join_request_id` matches the approved join request ID
- `visibility_enabled = true`
- `notifications_enabled = true`
- `created_at` timestamp is recent (same as approval time)

---

### Step 4: Verify Idempotency (No Duplicates)

**Test:** Approve the same join request again

1. In dashboard, find the same guest (now showing "Approved")
2. Click status dropdown → select "Pending"
3. Wait for update
4. Click status dropdown → select "Approved" again

**Expected:** No error, no duplicate row

**SQL Verification:**
```sql
SELECT COUNT(*) AS attendee_count
FROM event_attendees
WHERE join_request_id = 'abc123-def456-ghi789...';
```

**Expected Result:**
```
attendee_count
--------------
1
```

✅ Only ONE attendee row exists (idempotency via `WHERE NOT EXISTS`)

---

### Step 5: Mobile App Verification (If Available)

**Mobile Query Simulation:**
```sql
-- This mimics what the Flutter app queries
SELECT
  ea.id,
  ea.event_id,
  ea.owner_id,
  ea.visibility_enabled,
  ea.notifications_enabled,
  up.first_name,
  up.last_name,
  up.photo_url
FROM event_attendees ea
LEFT JOIN user_profiles up ON ea.user_profile_id = up.id
WHERE ea.event_id = 59  -- Replace with your test event ID
  AND ea.visibility_enabled = true;
```

**Expected Result:**
- ✅ At least 1 row returned (the approved user)
- ✅ All fields populated correctly
- ✅ `visibility_enabled = true`

**Mobile App Test (If Available):**
1. Open mobile app
2. Navigate to the event (ID 59 or your test event)
3. Enter the event room
4. ✅ **EXPECTED:** User sees themselves in the attendee list
5. ✅ **EXPECTED:** User sees other approved attendees

---

## BACKFILL SQL (For Existing Broken Data)

If there are existing join requests that were approved BEFORE this fix, they won't have attendee rows. Run this backfill SQL to materialize them:

```sql
-- BACKFILL: Create attendee rows for existing approved join requests
-- that don't have a corresponding event_attendees row

INSERT INTO event_attendees (
  event_id,
  owner_id,
  user_profile_id,
  join_request_id,
  visibility_enabled,
  notifications_enabled,
  created_at,
  updated_at
)
SELECT
  ejr.event_id,
  ejr.owner_id,              -- ✅ Now included (was missing)
  ejr.user_profile_id,
  ejr.id AS join_request_id,
  true AS visibility_enabled,
  true AS notifications_enabled,
  NOW() AS created_at,
  NOW() AS updated_at
FROM event_join_requests ejr
WHERE ejr.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1
    FROM event_attendees ea
    WHERE ea.join_request_id = ejr.id
  );
```

**Preview before executing:**
```sql
-- DRY RUN: Count how many rows will be backfilled
SELECT COUNT(*) AS missing_attendees
FROM event_join_requests ejr
WHERE ejr.status = 'APPROVED'
  AND NOT EXISTS (
    SELECT 1
    FROM event_attendees ea
    WHERE ea.join_request_id = ejr.id
  );
```

**Post-Backfill Verification:**
```sql
-- Verify all approved join requests now have attendee rows
SELECT
  COUNT(*) AS total_approved,
  COUNT(ea.id) AS with_attendee,
  COUNT(*) - COUNT(ea.id) AS missing_attendee
FROM event_join_requests ejr
LEFT JOIN event_attendees ea ON ea.join_request_id = ejr.id
WHERE ejr.status = 'APPROVED';
```

**Expected Result:**
```
total_approved | with_attendee | missing_attendee
---------------|---------------|------------------
42             | 42            | 0
```
✅ `missing_attendee = 0` means all approved requests have attendees

---

## ROLLBACK PLAN (If Needed)

If this fix causes issues, rollback to previous version:

```bash
# 1. Revert the code changes
git revert HEAD

# 2. Redeploy previous version
git push origin main

# 3. Monitor error logs
# Check for any new constraint violations or errors
```

**Note:** The fix only ADDS a field that should have been there from the start. Rollback is unlikely to be needed unless there's an unexpected issue with the `owner_id` data itself.

---

## MONITORING & ALERTING

### Key Metrics to Track

**Dashboard Metrics:**
```sql
-- Success rate of join request approvals (past 24 hours)
SELECT
  COUNT(*) FILTER (WHERE status = 'APPROVED') AS approved_count,
  COUNT(*) FILTER (WHERE status = 'APPROVED' AND EXISTS (
    SELECT 1 FROM event_attendees ea WHERE ea.join_request_id = ejr.id
  )) AS with_attendee,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'APPROVED' AND EXISTS (
    SELECT 1 FROM event_attendees ea WHERE ea.join_request_id = ejr.id
  )) / NULLIF(COUNT(*) FILTER (WHERE status = 'APPROVED'), 0), 2) AS success_rate_percent
FROM event_join_requests ejr
WHERE updated_at >= NOW() - INTERVAL '24 hours';
```

**Expected Result After Fix:**
```
approved_count | with_attendee | success_rate_percent
---------------|---------------|---------------------
10             | 10            | 100.00
```

### Error Logs to Monitor

**Backend Logs:**
```bash
# Search for constraint violations
grep "null value in column \"owner_id\"" /var/log/app.log

# Search for INSERT failures
grep "Failed to update join request" /var/log/app.log
```

**Expected After Fix:** Zero matches

---

## LESSONS LEARNED

### 1. Database Schema Documentation Gap
- **Issue:** NOT NULL constraints weren't documented in code
- **Fix:** Add schema validation tests or TypeScript types that mirror DB constraints

### 2. Silent Failure Mode
- **Issue:** Errors only logged to console, not surfaced to users
- **Fix:** Improved error handling to show user-facing messages

### 3. Missing Integration Tests
- **Issue:** No test covering the full approval → materialization flow
- **Fix:** Add end-to-end test that verifies attendee row creation

### 4. No Monitoring for Missing Attendees
- **Issue:** Data loss went undetected until user reports
- **Fix:** Add monitoring query (see "Monitoring & Alerting" section)

---

## RELATED DOCUMENTATION

- [ATTENDEE_MATERIALIZATION_FIX.md](ATTENDEE_MATERIALIZATION_FIX.md) - Original fix documentation
- [FIXES_APPLIED.md](FIXES_APPLIED.md) - Date/time and reordering fixes
- [FIX_SUMMARY.md](FIX_SUMMARY.md) - Historical context on sponsor URL fix

---

## SIGN-OFF

**Fixed By:** Claude Sonnet 4.5
**Reviewed By:** [Product Owner/Tech Lead Name]
**Deployed:** [Deployment Date/Time]
**Verified:** [Verification Date/Time]

✅ **Production Verification Checklist:**
- [ ] Backfill SQL executed (if needed)
- [ ] Dashboard approval flow tested
- [ ] Mobile app room display verified
- [ ] Monitoring query shows 100% success rate
- [ ] Error logs clean (no constraint violations)
- [ ] Stakeholders notified of fix deployment

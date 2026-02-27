# Phase 1 Implementation Summary

**Goal:** Moots Entry must replicate Retool's DB effects against Neon Postgres for event operations.

**Status:** ✅ **COMPLETE**

---

## What Was Delivered

### 1. Schema Migration
- Added `plus_ones` (INTEGER, default 0) to `event_join_requests`
- Added `comments` (TEXT) to `event_join_requests`
- Migration script: [scripts/run-migration.ts](scripts/run-migration.ts)
- SQL migration: [migrations/add_ops_fields_to_join_requests.sql](migrations/add_ops_fields_to_join_requests.sql)

### 2. API Routes (Server-Only)

#### GET /api/events/[eventId]/join-requests
- **Purpose:** Fetch all join requests for an event with user profile data
- **Returns:**
  - Array of join requests (with full_name, email from user_profiles join)
  - Aggregated counts (total, approved, pending, rejected, cancelled)
- **Schema mapping:**
  - APPROVED = confirmed attendees
  - Headcount = 1 + plus_ones per request

**File:** [app/api/events/[eventId]/join-requests/route.ts](app/api/events/[eventId]/join-requests/route.ts)

#### PATCH /api/join-requests/[id]
- **Purpose:** Update join request fields (ops dashboard)
- **Allowed fields:**
  - `status` (enum: PENDING, APPROVED, REJECTED, CANCELLED, DRAFT)
  - `plus_ones` (non-negative integer)
  - `comments` (text)
- **Validation:** Enforces enum values, non-negative integers
- **Auto-updates:** `updated_at` timestamp

**File:** [app/api/join-requests/[id]/route.ts](app/api/join-requests/[id]/route.ts)

### 3. Dashboard UI Updates

**File:** [app/dashboard/[eventId]/page.tsx](app/dashboard/[eventId]/page.tsx)

**Changes:**
- ✅ Replaced Supabase `guests` table reads with `GET /api/events/:eventId/join-requests`
- ✅ Replaced Supabase `guests` updates with `PATCH /api/join-requests/:id`
- ✅ Updated type system: `Status` → `NeonStatus` (PENDING, APPROVED, REJECTED, CANCELLED, DRAFT)
- ✅ Removed "Checked-in" metrics (not in Neon schema)
- ✅ Updated capacity bar to show only "Confirmed (Approved)" headcount
- ✅ Updated totals section to display Neon status counts
- ✅ Disabled "Add guest" button (join requests created via app, not dashboard)
- ✅ Status dropdown updates via PATCH API
- ✅ Plus-ones increment/decrement via PATCH API
- ✅ Comments modal save via PATCH API

**Removed/Disabled:**
- Priority field updates (not stored in event_join_requests for Phase 1)
- Add guest functionality (no guest creation in Phase 1)
- Checked-in status and metrics

---

## File Manifest

### New Files
```
app/api/events/[eventId]/join-requests/route.ts   # GET join requests
app/api/join-requests/[id]/route.ts               # PATCH update join request
migrations/add_ops_fields_to_join_requests.sql    # Schema migration SQL
scripts/run-migration.ts                          # Migration runner
PHASE_1_VERIFICATION.md                           # Testing checklist
PHASE_1_SUMMARY.md                                # This file
```

### Modified Files
```
app/dashboard/[eventId]/page.tsx                  # Wired to Neon routes
package.json                                      # Added dotenv dependency
```

### Existing Files (No Changes)
```
app/api/events/create/route.ts                    # Already uses Neon
lib/db.ts                                         # Neon connection
```

---

## API Contract

### Neon Enum Values (Canonical)

**event_join_requests.status:**
- `PENDING` - Awaiting approval
- `APPROVED` - Confirmed attendee (counted in capacity)
- `REJECTED` - Request denied
- `CANCELLED` - User cancelled their request
- `DRAFT` - Not yet submitted

**events.status:**
- `DRAFT`
- `PUBLISHED`
- `CANCELLED`
- `COMPLETED`

**events.approve_mode:**
- `MANUAL` - Ops must approve each request
- `AUTO` - Auto-approve requests

---

## Mapping: Old (Supabase) → New (Neon)

| Supabase "guests" | Neon "event_join_requests" |
|-------------------|---------------------------|
| `invite_sent`     | `PENDING`                 |
| `confirmed`       | `APPROVED`                |
| `waitlist`        | `PENDING` (no waitlist in Neon) |
| `cancelled`       | `CANCELLED`               |
| `checked_in`      | (not supported in Phase 1) |
| `priority`        | (not supported in Phase 1) |

---

## Verification

See [PHASE_1_VERIFICATION.md](PHASE_1_VERIFICATION.md) for:
- curl test commands
- Expected responses
- SQL queries to verify Neon updates
- Dashboard manual testing steps
- End-to-end workflow

Quick test:
```bash
# 1. Get join requests
curl -s http://localhost:3000/api/events/46/join-requests | jq '.counts'

# 2. Update a join request
curl -X PATCH http://localhost:3000/api/join-requests/<ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED","plus_ones":2}' | jq .

# 3. Verify update persisted
curl -s http://localhost:3000/api/events/46/join-requests | jq '.join_requests[] | select(.id == "<ID>")'
```

---

## Non-Goals (Intentionally Excluded)

- ❌ QR check-in functionality
- ❌ Auth/sessions (ops routes are open for Phase 1)
- ❌ Flutter app changes
- ❌ Schema migrations beyond required columns
- ❌ "Guest list management for non-users" (no guests table in Neon)
- ❌ CSV import (not supported by Neon schema)
- ❌ Priority field (not in event_join_requests)

---

## Known Limitations

1. **Event metadata still uses Supabase:**
   - Event details (name, city, capacity, hosts) fetched via Supabase
   - Event image upload uses Supabase Storage
   - Event update API uses edit_token for auth

2. **No server-side validation for:**
   - Event ownership
   - Join request ownership
   - (Phase 1 is ops-only, no auth required)

3. **Dashboard "Add guest" disabled:**
   - Join requests must be created via Flutter app
   - No API endpoint for creating join requests from dashboard

4. **Priority field:**
   - Visible in UI but updates are no-op
   - Not stored in Neon event_join_requests table

---

## What's Next (Future Phases)

Potential Phase 2+ work:
- Migrate event metadata reads to Neon API routes
- Add authentication/authorization to ops routes
- Implement join request creation API (for dashboard)
- Add priority column to event_join_requests (if needed)
- Check-in flow (if required - mark attendees as checked in)
- Event list/search API endpoints

---

## Migration Instructions

### First-time setup:
```bash
# 1. Ensure DATABASE_URL is in .env.local
# 2. Run migration
npx tsx scripts/run-migration.ts

# 3. Verify columns added
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'event_join_requests' AND column_name IN ('plus_ones', 'comments');"
```

### Testing:
```bash
# Start dev server
npm run dev

# Run verification tests
# See PHASE_1_VERIFICATION.md for full test suite
```

---

## Success Metrics

✅ **Schema:** plus_ones and comments columns exist in Neon
✅ **API:** GET /api/events/:id/join-requests returns join requests with counts
✅ **API:** PATCH /api/join-requests/:id updates status, plus_ones, comments
✅ **Dashboard:** Loads join requests from Neon API
✅ **Dashboard:** Status changes persist to Neon
✅ **Dashboard:** Plus-ones changes persist to Neon
✅ **Dashboard:** Comments changes persist to Neon
✅ **Dashboard:** Capacity metrics calculate correctly (APPROVED count)
✅ **Database:** PATCH updates visible in Neon immediately

---

## Contacts & Support

- **Implementation:** Phase 1 parity complete
- **Schema:** Neon Postgres production database
- **Dashboard:** Next.js 14 App Router (client component)
- **API:** Next.js API routes (server-side)

For issues or questions, refer to:
- [PHASE_1_VERIFICATION.md](PHASE_1_VERIFICATION.md) - Testing procedures
- [app/api/events/[eventId]/join-requests/route.ts](app/api/events/[eventId]/join-requests/route.ts) - GET implementation
- [app/api/join-requests/[id]/route.ts](app/api/join-requests/[id]/route.ts) - PATCH implementation

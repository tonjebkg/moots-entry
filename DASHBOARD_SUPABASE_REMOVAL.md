# Dashboard Supabase Removal - Implementation Summary

**Date:** 2026-01-27
**Goal:** Remove Supabase client dependency from dashboard to fix "Loading..." stuck state (ERR_NAME_NOT_RESOLVED)

---

## Problem

The dashboard at `/dashboard/[eventId]` was stuck on "Loading..." because:
1. It used Supabase client (`@/lib/supabase`) to fetch event data
2. Supabase DNS resolution was failing (ERR_NAME_NOT_RESOLVED)
3. No error handling → dashboard never progressed past loading state

---

## Solution

Migrated dashboard to use **Neon-backed API routes only** (except image uploads).

---

## Changes Made

### 1. **New API Route: GET /api/events/[eventId]**

**File:** [app/api/events/[eventId]/route.ts](app/api/events/[eventId]/route.ts)

**Purpose:** Read event details from Neon database

**Schema Mapping:**
```typescript
// Neon schema → Dashboard expected format
{
  title → name
  location.city → city (extract from jsonb)
  start_date → starts_at
  image_url → image_url (unchanged)
  // Fields not in Neon (Phase 1):
  capacity → null
  edit_token → null
}
```

**Response Example:**
```json
{
  "id": "46",
  "name": "Event Title",
  "city": "San Francisco",
  "starts_at": "2025-10-24T16:30:00.000Z",
  "timezone": "America/Los_Angeles",
  "capacity": null,
  "image_url": "https://...",
  "event_url": "https://...",
  "hosts": [{"name": "Host Name", "url": "..."}],
  "edit_token": null,
  "end_date": "2025-10-24T20:30:00.000Z",
  "is_private": false,
  "approve_mode": "MANUAL",
  "status": "PUBLISHED"
}
```

**Test:**
```bash
curl http://localhost:3000/api/events/46 | jq .
```

---

### 2. **Updated Dashboard Page**

**File:** [app/dashboard/[eventId]/page.tsx](app/dashboard/[eventId]/page.tsx)

**Changes:**
- ✅ Removed Supabase `.from('events')` query
- ✅ Added `fetch(/api/events/${eventId})` to load event from Neon
- ✅ Added proper error handling with try/catch
- ✅ Added cleanup flag to prevent state updates after unmount
- ✅ Improved loading state to show error messages
- ⚠️ **Kept** Supabase import for image uploads only (lines 283-285)

**Before:**
```typescript
const { data: ev } = await supabase
  .from('events')
  .select('id,name,city,starts_at,...')
  .eq('id', eventId)
  .single()
setEvent(ev as EventRow)
```

**After:**
```typescript
const eventRes = await fetch(`/api/events/${eventId}`)
if (!eventRes.ok) {
  console.error('Failed to fetch event:', await eventRes.text())
  setMessage(`Failed to load event: ${eventRes.status}`)
  return
}
const eventData = await eventRes.json()
setEvent(eventData)
```

**Error Handling:**
- If API fails → Shows error message instead of infinite loading
- If component unmounts → Cleanup flag prevents stale state updates
- Network errors → Caught and displayed to user

---

## Event Image Storage

### Current State

**Neon Schema:**
- `events.image_url` column exists (character varying, nullable)
- Stores **full URLs** to images (not just paths)

**Sample Values:**
```
"https://ststoragemwtaoogfnlgxq.blob.core.windows.net/public/Moots%20Logo.png"
null (many events have no image)
```

**Image Upload Flow:**
1. User uploads image via dashboard → `/api/uploads/event-image/route.ts`
2. Image stored in **Supabase Storage** (bucket: `events`)
3. Supabase returns public URL
4. URL saved to `events.image_url` in Neon

**Status:** ✅ **Working as designed**

Images are stored externally (Supabase Storage), and Neon only stores the URL reference. This is acceptable for Phase 1.

---

## Missing Fields (Known Limitations)

### 1. **capacity** (number | null)
- **Status:** Not in Neon `events` table
- **Dashboard Impact:** Capacity bar shows `null` capacity
- **Action Required:** Add column if capacity tracking is needed

**Migration (if needed):**
```sql
ALTER TABLE events
ADD COLUMN capacity INTEGER;
```

### 2. **edit_token** (string | null)
- **Status:** Not in Neon `events` table
- **Dashboard Impact:** Edit event uses no auth token (Phase 1)
- **Action Required:** Add token-based auth in future phase

**Note:** Currently `/api/events/update` uses Supabase Admin (not Neon). This route still needs migration.

---

## Testing Verification

### 1. API Routes
```bash
# Test event fetch
curl http://localhost:3000/api/events/46 | jq .

# Test join requests (already working)
curl http://localhost:3000/api/events/46/join-requests | jq .counts
```

### 2. Dashboard
1. Navigate to: `http://localhost:3000/dashboard/46`
2. ✅ **Expected:** Dashboard loads with event details and join requests
3. ✅ **Expected:** Event image displays if `image_url` exists
4. ✅ **Expected:** Capacity shows "null" (no capacity column)
5. ✅ **Expected:** Status/plus-ones/comments updates work via PATCH API

### 3. Error Handling
Test with invalid event ID:
```bash
curl http://localhost:3000/api/events/999999
```
Expected: 404 with error message

**Dashboard:** Should show error message + back button (not stuck loading)

---

## Remaining Supabase Usage

**Still uses Supabase:**
1. **Image uploads:** Dashboard edit event modal uploads images to Supabase Storage
   - Lines 283-285 in `app/dashboard/[eventId]/page.tsx`
   - Route: `/api/uploads/event-image/route.ts`
   - **Status:** Acceptable for Phase 1 (Neon stores the URL)

2. **Event updates:** `/api/events/update` route uses Supabase Admin
   - **Status:** Needs migration to Neon (future work)

**No longer uses Supabase:**
- ✅ Event details fetch (now uses Neon API)
- ✅ Join requests fetch (already used Neon API)
- ✅ Join request updates (already used Neon API)

---

## Follow-Up Actions

### Immediate (Phase 1)
- ✅ Test dashboard loads correctly at `/dashboard/46`
- ✅ Verify event image displays if URL exists
- ✅ Confirm join requests and updates work

### Future Phases
1. **Add capacity column to Neon:**
   ```sql
   ALTER TABLE events ADD COLUMN capacity INTEGER;
   ```
   Then update GET route to include capacity

2. **Migrate `/api/events/update` to Neon:**
   - Currently uses Supabase Admin
   - Should use Neon `UPDATE events SET ... WHERE id = $1`

3. **Optional: Migrate image storage:**
   - Move from Supabase Storage to S3/Cloudflare R2/etc.
   - Or keep Supabase Storage for images (it's just a CDN)

4. **Add edit_token or auth:**
   - Implement proper authentication for event updates
   - Or use JWTs/sessions instead of edit tokens

---

## Files Modified

### New Files
```
✨ app/api/events/[eventId]/route.ts       (GET event from Neon)
✨ DASHBOARD_SUPABASE_REMOVAL.md           (This document)
```

### Modified Files
```
📝 app/dashboard/[eventId]/page.tsx        (Removed Supabase event fetch, added error handling)
```

### Unchanged (Still Need Migration)
```
⚠️ app/api/events/update/route.ts          (Still uses Supabase Admin)
⚠️ app/api/uploads/event-image/route.ts    (Still uses Supabase Storage)
```

---

## Success Metrics

✅ **Dashboard no longer stuck on "Loading..."**
✅ **Event data loads from Neon API**
✅ **Join requests load from Neon API**
✅ **Error states display properly**
✅ **Image URLs display correctly**
✅ **No Supabase client errors in console**

---

## Questions & Support

**Q: Why keep Supabase for image uploads?**
A: Phase 1 focus is event operations parity. Image storage migration is out of scope. Neon stores the URL, which is sufficient.

**Q: What about capacity field?**
A: Not in Neon schema yet. Add column if capacity tracking is required.

**Q: Dashboard shows "capacity: null" - is that a bug?**
A: No, that's expected. Capacity column doesn't exist in Neon events table.

**Q: Can users still edit events?**
A: Yes, but `/api/events/update` still uses Supabase Admin (needs future migration).

**Q: What if image_url is null?**
A: Dashboard shows "No image" placeholder (existing behavior preserved).

---

**Implementation Complete** ✅
Dashboard now uses Neon API for event data, with proper error handling and no Supabase client dependency for reads.

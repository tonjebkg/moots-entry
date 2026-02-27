# Phase 1 Verification Checklist

## Summary
Phase 1 implements Neon Postgres parity for event operations dashboard:
- ✅ Create Event (already implemented)
- ✅ View join requests
- ✅ Update join request status/fields
- ✅ Dashboard UI wired to Neon routes

## Prerequisites
- Dev server running: `npm run dev`
- DATABASE_URL configured in `.env.local`
- Migration applied: `npx tsx scripts/run-migration.ts`

---

## 1. Schema Verification

### Verify columns were added to Neon
```bash
# Check event_join_requests schema
psql $DATABASE_URL -c "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'event_join_requests' AND column_name IN ('plus_ones', 'comments');"
```

Expected output:
```
 column_name | data_type | column_default
-------------+-----------+----------------
 plus_ones   | integer   | 0
 comments    | text      |
```

---

## 2. API Route Testing

### A. GET /api/events/:eventId/join-requests

Fetch join requests for an event:

```bash
curl -s http://localhost:3000/api/events/46/join-requests | jq .
```

Expected response structure:
```json
{
  "join_requests": [
    {
      "id": "uuid",
      "event_id": 46,
      "owner_id": "string",
      "full_name": "First Last",
      "email": "user@example.com",
      "status": "APPROVED" | "PENDING" | "REJECTED" | "CANCELLED" | "DRAFT",
      "plus_ones": 0,
      "comments": "",
      "photo_url": null,
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
    }
  ],
  "counts": {
    "total": 5,
    "approved": 4,
    "pending": 1,
    "rejected": 0,
    "cancelled": 0
  }
}
```

### B. PATCH /api/join-requests/:id

#### Test 1: Update status only
```bash
curl -X PATCH http://localhost:3000/api/join-requests/<JOIN_REQUEST_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED"}' | jq .
```

#### Test 2: Update plus_ones only
```bash
curl -X PATCH http://localhost:3000/api/join-requests/<JOIN_REQUEST_ID> \
  -H "Content-Type: application/json" \
  -d '{"plus_ones":3}' | jq .
```

#### Test 3: Update comments only
```bash
curl -X PATCH http://localhost:3000/api/join-requests/<JOIN_REQUEST_ID> \
  -H "Content-Type: application/json" \
  -d '{"comments":"VIP guest - reserved seating"}' | jq .
```

#### Test 4: Update multiple fields at once
```bash
curl -X PATCH http://localhost:3000/api/join-requests/<JOIN_REQUEST_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED","plus_ones":2,"comments":"Bringing +2 from team"}' | jq .
```

Expected response:
```json
{
  "join_request": {
    "id": "uuid",
    "status": "APPROVED",
    "plus_ones": 2,
    "comments": "Bringing +2 from team",
    "updated_at": "recent ISO timestamp",
    ...
  },
  "message": "Join request updated successfully"
}
```

#### Test 5: Invalid status (should fail)
```bash
curl -X PATCH http://localhost:3000/api/join-requests/<JOIN_REQUEST_ID> \
  -H "Content-Type: application/json" \
  -d '{"status":"INVALID"}' | jq .
```

Expected error:
```json
{
  "error": "Invalid status. Must be one of: PENDING, APPROVED, REJECTED, CANCELLED, DRAFT"
}
```

---

## 3. Neon Database Verification

### Query join requests directly in Neon
```sql
SELECT
  id,
  event_id,
  owner_id,
  status,
  plus_ones,
  comments,
  updated_at
FROM event_join_requests
WHERE event_id = 46
ORDER BY created_at DESC;
```

### After PATCH, verify row was updated in Neon
```sql
SELECT
  status,
  plus_ones,
  comments,
  updated_at
FROM event_join_requests
WHERE id = '<JOIN_REQUEST_ID>';
```

Confirm:
- `updated_at` timestamp changed
- Field values match PATCH request

---

## 4. Dashboard UI Testing

### Manual browser testing:

1. Navigate to: `http://localhost:3000/dashboard/46`

2. **Verify data loads:**
   - Event details display (name, city, date, hosts)
   - Join requests table populates from Neon
   - Capacity bar shows "Confirmed (Approved) headcount"
   - Totals section shows: Total, Approved, Pending, Rejected, Cancelled counts

3. **Test status dropdown:**
   - Click status dropdown on any join request
   - Change from PENDING → APPROVED
   - Verify:
     - Status changes immediately in UI
     - Approved count increments in totals
     - Pending count decrements

4. **Test plus-ones increment/decrement:**
   - Click + button to add plus-ones
   - Click − button to remove plus-ones
   - Verify:
     - Number updates immediately
     - Confirmed headcount recalculates (includes plus-ones)

5. **Test comments modal:**
   - Click on comments field for any guest
   - Modal opens with current comment
   - Type new comment text
   - Click Save
   - Verify:
     - Modal closes
     - Comment field shows updated text

6. **Verify "Add guest" is disabled:**
   - Button should show "Add guest (disabled)"
   - Button should be grayed out with cursor-not-allowed
   - Tooltip: "Phase 1: Join requests are created by app users"

---

## 5. End-to-End Flow

### Complete workflow test:

```bash
# 1. Get a join request ID
JR_ID=$(curl -s http://localhost:3000/api/events/46/join-requests | jq -r '.join_requests[0].id')
echo "Testing with join request: $JR_ID"

# 2. Update status to APPROVED
curl -X PATCH http://localhost:3000/api/join-requests/$JR_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"APPROVED","plus_ones":2,"comments":"Ops test - approved with +2"}' | jq .

# 3. Verify via GET
curl -s http://localhost:3000/api/events/46/join-requests | jq ".join_requests[] | select(.id == \"$JR_ID\")"

# 4. Verify counts updated
curl -s http://localhost:3000/api/events/46/join-requests | jq '.counts'
```

Expected flow:
1. PATCH returns 200 with updated join_request
2. GET shows the join request with new values
3. Counts reflect the status change

---

## 6. Regression Checks

### Events API (already implemented)
```bash
# Verify POST /api/events/create still works
curl -X POST http://localhost:3000/api/events/create \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "title": "Phase 1 Test Event",
      "city": "San Francisco",
      "start_date": "2026-02-15T19:00:00Z",
      "hosts": [{"name": "Test Host"}]
    }
  }' | jq .
```

Expected: Returns `event_id` and success message

---

## Known Limitations (Phase 1)

- ❌ No "Add guest" from dashboard (join requests created via app only)
- ❌ No "Priority" field updates (not in Neon event_join_requests schema)
- ❌ No "Checked-in" status (removed from dashboard metrics)
- ❌ Event list/read via API (not part of Phase 1 scope)
- ⚠️ Event update still uses Supabase for image storage

---

## Success Criteria

✅ All curl commands return 200 OK
✅ PATCH updates persist in Neon database
✅ Dashboard loads without errors
✅ Dashboard status/plus_ones/comments updates work
✅ Capacity metrics calculate correctly (1 + plus_ones per approved)
✅ Status enum values match Neon (PENDING, APPROVED, REJECTED, CANCELLED, DRAFT)

---

## Troubleshooting

### Issue: PATCH returns "type user_defined does not exist"
**Fix:** Update query to cast to correct enum type `eventjoinrequeststatus`

### Issue: Dashboard shows "Loading..." forever
**Fix:** Check browser console for fetch errors. Verify API routes return 200.

### Issue: plus_ones or comments not found
**Fix:** Run migration: `npx tsx scripts/run-migration.ts`

### Issue: Counts don't update in dashboard
**Fix:** Refresh page or check if state update is optimistic (updates locally before API call)

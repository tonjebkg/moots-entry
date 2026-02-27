# Fix: Materialize Attendees on Join Request Approval

## Problem
When a join request status is set to `APPROVED`, no corresponding row is created in `event_attendees`. This causes approved guests to be missing from attendee lists in both the dashboard and mobile app.

## Solution
Modified the join request approval handler to automatically create an `event_attendees` row when status changes to `APPROVED`.

## File Changed

**[app/api/join-requests/[id]/route.ts](app/api/join-requests/[id]/route.ts:95-128)**

## Minimal Diff

```typescript
// After updating join request (line 88-93)
if (!result || result.length === 0) {
  return NextResponse.json(
    { error: 'Join request not found' },
    { status: 404 }
  );
}

+   const updatedJoinRequest = result[0];
+
+   // If status was changed to APPROVED, materialize attendee in event_attendees
+   if (updates.status === 'APPROVED') {
+     await db`
+       INSERT INTO event_attendees (
+         event_id,
+         user_profile_id,
+         join_request_id,
+         visibility_enabled,
+         notifications_enabled,
+         created_at,
+         updated_at
+       )
+       SELECT
+         ${updatedJoinRequest.event_id},
+         ${updatedJoinRequest.user_profile_id},
+         ${updatedJoinRequest.id},
+         true,
+         true,
+         ${now},
+         ${now}
+       WHERE NOT EXISTS (
+         SELECT 1 FROM event_attendees
+         WHERE join_request_id = ${updatedJoinRequest.id}
+       )
+     `;
+   }

return NextResponse.json({
-     join_request: result[0],
+     join_request: updatedJoinRequest,
  message: 'Join request updated successfully',
});
```

## Implementation Details

### Idempotency
- Uses `WHERE NOT EXISTS` to prevent duplicate attendee rows if approval is clicked multiple times
- No unique constraint exists on `join_request_id`, so explicit check is required

### Fields Set
- `event_id`: from `updatedJoinRequest.event_id`
- `user_profile_id`: from `updatedJoinRequest.user_profile_id`
- `join_request_id`: from `updatedJoinRequest.id`
- `visibility_enabled`: `true` (default for approved attendees)
- `notifications_enabled`: `true` (default for approved attendees)
- `created_at` / `updated_at`: current timestamp (same as join request update)

### Trigger Condition
Only runs when `updates.status === 'APPROVED'`, meaning:
- If status is already `APPROVED` and user updates `plus_ones` or `comments`, no duplicate insert attempt
- Only fires on the exact PATCH that changes status to `APPROVED`

## Manual Verification Checklist

### Setup
1. Find a join request with status `PENDING` for event ID 59 (or any event)

### Test Steps
1. Approve the join request via dashboard (or API: `PATCH /api/join-requests/{id}` with `{"status": "APPROVED"}`)
2. Run verification SQL:
   ```sql
   SELECT
     ejr.id AS join_request_id,
     ejr.status,
     ejr.user_profile_id,
     ea.id AS attendee_id,
     ea.event_id AS attendee_event_id,
     ea.visibility_enabled,
     ea.notifications_enabled
   FROM event_join_requests ejr
   LEFT JOIN event_attendees ea
     ON ea.join_request_id = ejr.id
   WHERE ejr.event_id = 59
     AND ejr.status = 'APPROVED';
   ```

### Success Criteria
- ✅ `attendee_id` is NOT NULL (attendee row exists)
- ✅ `attendee_event_id` matches `ejr.event_id`
- ✅ `visibility_enabled = true`
- ✅ `notifications_enabled = true`

### Idempotency Test
1. Approve the same join request again (or PATCH with `{"status": "APPROVED"}` again)
2. Re-run the verification SQL
3. Confirm: only ONE `event_attendees` row exists for that `join_request_id` (no duplicates)

## Build Status
✅ TypeScript compilation successful
✅ No runtime errors
✅ Minimal change (only modified approval handler)

## Notes
- Does NOT use `rsvp_contact` or email for identity (uses `user_profile_id` from join request)
- Does NOT backfill existing approved join requests (only handles new approvals going forward)
- If backfill needed, run:
  ```sql
  INSERT INTO event_attendees (
    event_id,
    user_profile_id,
    join_request_id,
    visibility_enabled,
    notifications_enabled,
    created_at,
    updated_at
  )
  SELECT
    ejr.event_id,
    ejr.user_profile_id,
    ejr.id,
    true,
    true,
    NOW(),
    NOW()
  FROM event_join_requests ejr
  WHERE ejr.status = 'APPROVED'
    AND NOT EXISTS (
      SELECT 1 FROM event_attendees ea
      WHERE ea.join_request_id = ejr.id
    );
  ```

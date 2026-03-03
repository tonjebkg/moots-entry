# Platform Review — Round 3 Fixes

Feedback from product review of the latest Claude Code commit. Covers button styling consistency, targeting count mismatches, invitation campaigns (still empty after 3 attempts), role column inconsistency, guest profile notes, contact profile editing, and event history.

---

## 1. TARGETING TAB: "+ Add Criteria" Button Styling Inconsistency

**Current state**: On the Targeting tab, the "+ Add Criteria" button has a completely different style (outlined, small, left-aligned) from the action buttons on other tabs like Check-in & Seating ("+ Add Walk-in" is a filled terracotta button, "Staff Check-in Link" is an outlined button — both right-aligned in the action bar).

**Fix**: Make the "+ Add Criteria" button visually consistent with the "Add Walk-in" button pattern used on Check-in & Seating. Specifically:
- Use the same filled terracotta button style as "Add Walk-in"
- Position it in the same area (top right of the content area, aligned with the page heading)
- The button hierarchy should be consistent across all tabs: primary actions get the filled terracotta treatment, secondary actions get the outlined treatment

This is about design system consistency — every tab should use the same button patterns so the platform feels cohesive.

---

## 2. TARGETING TAB: Qualified Contact Counts Don't Match Guest Intelligence

**Current state**: Each targeting criterion shows a "X contacts currently qualify based on this objective" count. When the user clicks these links, they navigate to Guest Intelligence — but the numbers don't match:

- Targeting Criterion 1 (weight 1, PE/VC decision-makers): says **43 contacts** qualify → Guest Intelligence shows a different number
- Targeting Criterion 2 (weight 2, C-suite tech): says **28 contacts** qualify → Guest Intelligence shows a different number
- Targeting Criterion 3 (weight 3, Institutional LPs): says **15 contacts** qualify → Guest Intelligence shows a different number

**Guest Intelligence is the source of truth** for scores and qualification. The per-criterion counts on the Targeting tab must be derived from the same data source.

**Fix**:
- The per-criterion counts on the Targeting tab should be calculated from the actual Guest Intelligence scoring data — count how many contacts score above the qualification threshold specifically for that criterion
- When clicking the count link, it should navigate to Guest Intelligence with a filter pre-applied showing only contacts that qualify for that specific criterion
- The numbers must match exactly between the two views — there should be zero discrepancy
- Also: the text still says "based on this objective" — change to "based on this criterion" to match the "Targeting" terminology

---

## 3. INVITATIONS: Campaigns STILL Not Created (3rd Attempt)

**Current state**: The Invitations tab (`/dashboard/86/campaigns`) STILL shows the empty state: "I'm ready to build your first invitation campaign." This is the **third time** this has been requested and it still hasn't been implemented.

**This is a critical blocker for the demo.** The entire story of how guests were invited and responded is missing.

**What MUST happen**: Create 2 seed invitation campaigns with full data. The campaign data should be seeded in the database — not just displayed in the UI. This means:

### Implementation approach:
1. Create the database records for 2 campaigns with all recipient data
2. The campaign list view should show both campaigns as cards/rows with: name, status badge, sent date, recipient count, response rate
3. Clicking a campaign should show a detail view with the recipient table

### Campaign 1: "Q2 Executive Dinner — Founding Table"
- Status: Completed
- Sent: March 20, 2026
- 12 recipients → 10 Accepted, 1 Declined (David Nakamura), 1 No Response (Robert Kensington)
- Response rate: 83%

### Campaign 2: "Q2 Executive Dinner — Extended Circle"
- Status: Completed
- Sent: March 28, 2026
- 10 recipients → 7 Accepted, 2 Declined (Victoria Langley, Sarah Worthington), 1 Pending (Dahlia Rosenberg)
- Response rate: 70%

Each recipient row should show: name, company, send date, status (Accepted/Declined/Pending/No Response), response date.

**If the campaign feature's backend isn't built**: Build it. At minimum, create a campaigns table in the database, seed the data, and create API endpoints that the existing UI can consume. The UI shell already exists (it shows the empty state with "New Invitation Campaign" button) — it just needs data.

**Also**: Change the URL route from `/campaigns` to `/invitations` to match the renamed tab.

---

## 4. ROLE COLUMN: Must Be Identical Between Guest Intelligence and Check-in

**Current state**: This is a significant inconsistency:

**Guest Intelligence** Role column: Shows "— ∨" (empty dropdown) for ALL contacts. The Role field is a dropdown but no values have been selected/populated.

**Check-in** Role column: Shows invented values like "GP", "LP", "Advisor", "LP Prospect", "Speaker", "Partner", "Operating Partner Prospect", "Pipeline Target", "Operating Advisor Prospect". These were created by Claude Code as new data that doesn't exist in Guest Intelligence.

**The problem**: These should be THE SAME column showing THE SAME data. The Role on Check-in should be pulled directly from Guest Intelligence — it's the same field on the same contact. Claude Code should not have invented separate role values for the Check-in table.

**Fix**:
1. **Populate the Role field in Guest Intelligence** for all scored contacts. The Role dropdown should contain these standard values: LP, GP, Advisor, Service Provider, Speaker, Partner, Team, Operating Partner, Media
2. **The Check-in table should pull its Role column directly from Guest Intelligence** — not maintain a separate Role field. Whatever role a contact has in Guest Intelligence is what appears in Check-in
3. **For the demo narrative**, assign roles to checked-in guests as follows (these should be set in Guest Intelligence and automatically appear in Check-in):
   - **LP**: Patricia Donovan (MIT), Philip Wainwright (Wainwright Foundation), Walter Edmonds (Temasek), Eleanor Blackwood (Blackwood Partners), Fiona O'Malley (ILPA), Yuki Tanaka (SoftBank — walk-in)
   - **GP**: Andrew Sterling (Thoma Bravo), James Harrington (Blackstone), Diana Okonkwo (Vista Equity), Sofia Chen-Ramirez (Advent), Ian MacGregor (Bridgepoint)
   - **Speaker**: James Harrington (Blackstone) — he's giving the keynote market outlook (he can have both GP and Speaker; if only one value is allowed, use Speaker since it's more distinctive for the demo)
   - **Partner**: Martin Cross (Deloitte) — event sponsor partner
   - **Advisor**: Oliver Pennington (Evercore), Louise Hensley (McKinsey)
   - **Operating Partner**: Lisa Chang (Snowflake), Brian Callahan (Toast), Jason Mitchell (UiPath), Evelyn Marshall (Notion)
   - **Team**: Sarah Chen, Marcus Rivera, Julia Park
   - **LP** (walk-in): Gregory Mansfield — actually his role is more "Placement Agent" but since that's not a standard role, use "Advisor"

4. **Remove the invented Check-in-only roles** like "LP Prospect", "Pipeline Target", "Operating Partner Prospect", "Operating Advisor Prospect". These are not standard roles — they read like AI-generated descriptions. Keep role values short and standard.

---

## 5. GUEST PROFILE DRAWER: Add Notes Capability

**Current state**: The Guest Profile drawer (opened from Check-in or Guest Intelligence by clicking a guest name) shows AI Summary, Why They Match, Talking Points, Criteria Match — but there is **no way to add notes** about the guest during or after the event.

**Fix**: Add an "Event Notes" section to the Guest Profile drawer. This should:
- Appear between the Team Assignment section and the AI Summary section (or right after Team Assignment)
- Show a text area where the user can type notes about this guest for this specific event
- Notes are **event-scoped** — they belong to this guest's record within this event, not their global contact profile
- Have a simple "Add Note" button or inline editable field (click to type, auto-saves)
- Show existing notes with timestamps and who wrote them
- These event notes should also appear in (or be referenced from) the Contact Profile in the People Database — under a section like "Notes from Events" or "Event History"

---

## 6. CONTACT PROFILE (People Tab): Full Editable Contact Card

**Current state**: In the People Database, clicking a contact opens the Contact Profile drawer. The "Edit" button currently only allows editing tags and internal notes. You **cannot edit the actual contact information**: first name, last name, email, phone number, company, title, LinkedIn URL, or add new fields like address.

**Fix**: The Edit mode should make ALL contact fields editable. When clicking "Edit", the Contact Profile should switch to an editable form with these fields:

### Contact Information (editable):
- **First Name** — text input
- **Last Name** — text input
- **Email** — text input (currently shown as read-only)
- **Phone Number** — text input (currently missing entirely — this field needs to be added)
- **LinkedIn URL** — text input (currently shown as a link but not editable)
- **Address** — text input (city, state/country — currently missing)

### Professional Information (editable):
- **Company** — text input
- **Title** — text input
- **Industry/Sector** — text input or dropdown

### Other (already editable, keep as-is):
- **Tags** — add/remove tags (already works)
- **Internal Notes** — textarea (already works)

The edit form should have "Save" and "Cancel" buttons. All changes should persist to the database.

**Important UX note**: The current flow where you have to click "Edit" to see that you can add notes is not obvious. Consider making the Internal Notes section always show an "Add a note..." placeholder that's directly clickable, without requiring the Edit button first.

---

## 7. CONTACT PROFILE: Event History Section

**Current state**: The Contact Profile shows "Scores Across Events" at the bottom with just the event name, date, and score number. There is no history of what happened at those events — no notes from the event, no check-in status, no follow-up status.

**Fix**: Expand the "Scores Across Events" section into a full **Event History** section that shows, for each event the contact participated in:

- **Event name and date** (already shown)
- **Score** (already shown)
- **Status at that event**: Confirmed, Checked In, Walk-in, Declined, No Show
- **Check-in time** (if they attended)
- **Team member assigned** (if any)
- **Event notes** — any notes written about this person during that event (from Fix #5)
- **Follow-up status** — Pending, Sent, Opened, Replied, Meeting Booked

This is critical for relationship continuity. When someone opens a contact's profile before the next event, they should be able to see: "Last event: Q2 Executive Dinner on 04/17/2026 — Score 26, Checked In at 8:25 PM, assigned to Marcus Rivera, follow-up sent, meeting booked. Notes from event: 'Very interested in Fund IV co-investment. Wants to discuss North American deal flow.'"

For the current demo, this section should show the Q2 Executive Dinner data with realistic details for all checked-in guests.

---

## 8. CONTACT PROFILE: Notes From Previous Events Should Surface

**Current state**: Internal Notes shows "No notes" for contacts. Even when notes are added, there's no concept of notes being linked to specific events.

**Fix**: Notes should have two layers:
1. **Global internal notes** — permanent notes about this contact (already exists, just needs to be more prominent)
2. **Event-specific notes** — notes written about this contact during a specific event (from Fix #5 above)

In the Contact Profile, both types should be visible:
- Global notes at the top of the Internal Notes section
- Event notes grouped under their respective events in the Event History section
- When viewing a contact before an upcoming event, the notes from their previous events should be immediately visible — this is how institutional knowledge builds over time

---

## PRIORITY ORDER

1. **Invitation campaigns** (#3) — 3rd attempt, critical demo blocker, must be implemented this time
2. **Role column consistency** (#4) — Guest Intelligence and Check-in must show the same Role values
3. **Contact profile full edit** (#6) — users need to add phone, edit email, edit all contact fields
4. **Guest profile notes** (#5) — ability to add event-scoped notes on guest profiles
5. **Contact profile event history** (#7) — past event data for relationship continuity
6. **Targeting count mismatch** (#2) — numbers must match Guest Intelligence
7. **Button styling consistency** (#1) — design system coherence
8. **Notes from previous events** (#8) — notes flowing across events

---

## NOTES ON WHAT'S WORKING WELL

- **Guest Profile drawer** — the AI Summary, Why They Match, Talking Points, and Criteria Match are excellent. The user specifically said "I like the guest profile a lot."
- **Team button** — moved out of global header into event-level, which is the right pattern
- **Targeting URL** — now correctly redirects from `/objectives` to `/targeting`
- **"Targeting" button** on Guest Intelligence — renamed from "Objectives" (confirmed working)
- **"130 contacts awaiting scoring"** — removed from Needs Attention (confirmed working)
- **Team members in Check-in** — Sarah Chen, Marcus Rivera, Julia Park appear as checked-in staff
- **Contact Profile enrichment** — AI Summary, tags, LinkedIn, email all showing correctly

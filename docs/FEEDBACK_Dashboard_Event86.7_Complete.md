# FEEDBACK — Dashboard Event 86.7 (Role/Priority Polish + Check-in & Seating Overhaul)

**Date:** 2026-03-01
**Reviewer:** Founder + Independent QA
**Scope:** Guest Intelligence tab (All Contacts + Pending Review), Check-in & Seating tab (Check-in + Seating sub-tabs), Column Stability
**Build:** Post-86.6

---

## Context

Read these files before starting:
- `docs/MOOTS_VISION.md`
- `docs/PRODUCT_PRINCIPLES.md`

Key principles:
- **Agent Model**: Agent proposes → Human decides → Agent responds → Agent learns
- **Font minimum**: No text under 13px. Body 16px minimum. Target user is 40+.
- **Event Status Pipeline**: In Pool → Selected → Invited → Confirmed → Declined → Waitlist.
- **Role column values**: Team Member, Partner, Co-host, Speaker, Talent (functional roles)
- **Priority column values**: VIP (yellow/gold), Tier 1, Tier 2, Tier 3, Waitlist (invitation waves)

---

## What's Working in 86.6 (Keep These)

- Role and Priority are now two separate columns after Title — correct structure.
- Role dropdown options are correct: —, Team Member, Partner, Co-host, Speaker, Talent.
- Priority dropdown options are correct: —, VIP, Tier 1, Tier 2, Tier 3, Waitlist.
- VIP priority pill has yellow/gold treatment (`bg-amber-100`, `text-amber-800`, `border-amber-300`) — stands out correctly.
- VIP in Tags column now uses neutral gray pill styling (`bg-brand-cream`) — no more red emphasis. Fixed from 86.5.
- Priority column default is "—" (dash) — correct.
- Pending Review has full column parity with All Contacts (same columns).
- Check-in & Seating tab exists with Check-in, Seating, and Introductions sub-tabs.
- "Not Yet Arrived (3)" section is expanded when count ≤ 3 — correct behavior.
- Seating sub-tab shows Table 1, Table 2, and Unassigned Guests sections.

---

## Issues

### ISSUE 1 — Role column default should be "—" (dash), not "Set role" text (CRITICAL)

**Current state:** When no role is assigned, the Role cell displays gray "Set role" placeholder text. The Priority column correctly shows "—" for its empty state.

**Required change:** Replace "Set role" with "—" (em dash) as the default display, matching the Priority column pattern. The dropdown already has "—" as the first option — the cell display should match. Both columns should look consistent when empty.

Additionally, ensure the dropdown includes a way to clear a role back to "—" once set. Currently the "—" option in the dropdown serves this purpose — verify it works correctly after selection.

### ISSUE 2 — Sorting not implemented on Role and Priority columns (CRITICAL)

**Current state:** The Role and Priority column headers have no sort functionality. They have `cursor: auto` and no click handlers. Score, Name, Company, and Title all have `cursor: pointer` and working sort (Score shows ▼ indicator). Clicking Role/Priority does nothing.

**Required change:** Add sort functionality to both Role and Priority column headers:
- **Role sort order**: —, Team Member, Partner, Co-host, Speaker, Talent
- **Priority sort order**: —, VIP, Tier 1, Tier 2, Tier 3, Waitlist (or reverse: Waitlist → VIP)
- Both columns should show ▲/▼ sort indicators when active
- Both should have `cursor: pointer` and `hover:bg-brand-cream` like the other sortable headers

### ISSUE 3 — Pending Review table has NO sorting at all (CRITICAL)

**Current state:** In the Pending Review tab, NO columns are sortable — not even Score, Name, Company, or Title. Every header has `cursor: auto` and no click handler. In All Contacts, Score/Name/Company/Title all sort correctly.

**Required change:** Pending Review must have the same sorting capabilities as All Contacts. All sortable columns (Score, Name, Company, Title, Role, Priority) should work identically in both tabs.

### ISSUE 4 — Check-in tab missing columns: Role, Priority, Assigned Team Member (MEDIUM)

**Current state:**

*Not Yet Arrived table* shows: Name, Company, Title, Score, Table
*Recent Check-ins table* shows: Time, Name, Score, Company, Title, Tags, Table, Status

Both tables are missing key columns needed for event-day operations.

**Required change:**
- **Add**: Role, Priority (with VIP gold styling), Tags (on Not Yet Arrived), Assigned Team Member
- **Remove**: Score — not needed on event day. The team cares about who the person IS and who is hosting them, not their AI score.
- Final columns for **Not Yet Arrived**: Name, Company, Title, Role, Priority, Tags, Assigned Team Member, Table
- Final columns for **Recent Check-ins**: Time, Name, Company, Title, Role, Priority, Tags, Assigned Team Member, Table, Status

### ISSUE 5 — Check-in expanded rows show full AI notes — remove them (MEDIUM)

**Current state:** Expanding a row in Recent Check-ins shows: Score, Tags, AI-GENERATED INSIGHTS, WHY THEY MATCH, OBJECTIVE BREAKDOWN, TALKING POINTS, and View Full Profile button. This is the full Guest Intelligence profile.

**Required change:** Remove AI-GENERATED INSIGHTS, WHY THEY MATCH, and OBJECTIVE BREAKDOWN from the expanded row. **Keep TALKING POINTS** — these are useful on event day for the host to quickly recall conversation starters. The expanded row should show:
- **Talking Points** (keep as-is)
- Tags (if not already in columns)
- Role and Priority (if not already in columns)
- Assigned Team Member
- Table assignment
- A "View Full Profile" link (to navigate to Guest Intelligence for the full brief)

Remove the vetting/scoring analysis but preserve the actionable conversation prep.

### ISSUE 6 — Seating cards missing VIP, Team Member, and Sponsor indicators (MEDIUM)

**Current state:** Each seating card shows: drag handle, Name, Title · Company, Score number. No role, priority, or team assignment info is visible.

**Required change:** Seating cards should display:
- **VIP indicator** — show "VIP" badge with yellow/gold styling (same as Priority column) if the guest is VIP
- **Team Member** — show which team member is assigned to this guest (e.g., small text: "Host: Sarah")
- **Sponsor** — if applicable, show the sponsor tag
- **Remove**: Score number — not useful for seating decisions

The card should quickly tell the host: "This is a VIP, they're being hosted by Sarah, and they're sponsored by X."

### ISSUE 7 — Remove "Move to" dropdown from Seating cards (LOW)

**Current state:** Each seating card has a hidden "Move to..." `<select>` dropdown (opacity:0, appears on hover) with options to move the guest to another table. There are 17 of these across all cards.

**Required change:** Remove the "Move to" dropdown entirely. Seating reassignment should be done exclusively via drag-and-drop. The "Move to" dropdown adds visual clutter on hover and is redundant with drag functionality.

### ISSUE 8 — Unassign from table (× button and drag-to-unassigned) does not work (CRITICAL)

**Current state:** Each seating card has a hidden "×" button (opacity:0, appears on hover, `text-red-500`). Clicking it does nothing — the guest stays in their table and Unassigned Guests remains at (0). Dragging a card to the Unassigned Guests section also does nothing.

**Required change:** Both unassign mechanisms must work:
1. **× button**: Clicking × should immediately move the guest from their table to the Unassigned Guests section. The table seat count should decrease and Unassigned count should increase.
2. **Drag to Unassigned**: Dragging a card from a table and dropping it on the Unassigned Guests section should unassign the guest.

If the decision is to remove the "Move to" dropdown (Issue 7), then drag-and-drop + the × button become the ONLY ways to manage seating, so they MUST work.

### ISSUE 9 — Column width still shifts when selecting longer Role/Priority values (CARRY-OVER)

**Current state:** The Role column has `min-width: 110px` and Priority has `min-width: 90px`. When "Set role" (placeholder) is displayed, the Role column is 134px wide. When "Team Member" is selected, the column expands to 178px (+44px), pushing Name (-7px), Company (-9px), Title (-8px), and Tags (-9px) narrower.

**Required change:** Set `min-width` on both columns to accommodate the longest possible value **including padding and the dropdown chevron**:
- **Role**: longest value is "Team Member" → needs `min-width: 180px`
- **Priority**: longest value is "Waitlist" → needs `min-width: 110px`
- Same fixed min-widths must apply to **Event Status** column (longest value: "Confirmed" or "Declined")

The table must look identical whether cells show "—" or their longest value. No layout shift on any interaction.

### ISSUE 10 — "Not Yet Arrived" collapse behavior for > 4 people (LOW)

**Current state:** With 3 guests, "Not Yet Arrived" is expanded (correct — ≤ 3 should be open). Cannot test the > 4 collapse behavior in this build since there are only 3 not-arrived guests.

**Required change:** When more than 4 people have not yet arrived, the "Not Yet Arrived" section should default to **collapsed** (closed). When 3 or fewer, it should default to **expanded** (open). The user should always be able to manually toggle open/closed regardless of the count.

---

## Execution Order

Follow this sequence. Each step must be completed and verified before moving to the next.

1. **Fix Role default display** — Change the empty Role cell from "Set role" to "—" (dash), matching Priority column behavior. Verify the "—" option in dropdown correctly clears the value. Apply to All Contacts and Pending Review. (Issue 1)

2. **Add sorting to Role and Priority columns** — Add `cursor: pointer`, click handler, and ▲/▼ indicators to Role and Priority headers in All Contacts. Define sort order for both columns. (Issue 2)

3. **Add sorting to ALL columns in Pending Review** — Pending Review currently has zero sorting. Add sorting to Score, Name, Company, Title, Role, Priority — matching All Contacts behavior. (Issue 3)

4. **Fix column width stability** — Increase `min-width` on Role to 180px, Priority to 110px. Verify no layout shift when selecting any value. Apply to Event Status as well. (Issue 9)

5. **Overhaul Check-in tab columns** — Remove Score from both tables. Add Role, Priority, Tags, Assigned Team Member columns to Not Yet Arrived and Recent Check-ins. (Issue 4)

6. **Remove AI notes from Check-in expanded rows** — Strip AI-GENERATED INSIGHTS, WHY THEY MATCH, OBJECTIVE BREAKDOWN from the expanded row. **Keep TALKING POINTS.** Keep operational info + "View Full Profile" link. (Issue 5)

7. **Update Seating cards** — Remove Score. Add VIP badge, Team Member assignment, Sponsor tag. Remove "Move to" dropdown. (Issues 6 + 7)

8. **Fix unassign functionality** — Make × button work to unassign guests from tables. Make drag-to-Unassigned work. Verify both update seat counts correctly. (Issue 8)

9. **Implement "Not Yet Arrived" collapse logic** — Default collapsed if > 4 not-arrived, default expanded if ≤ 3. Allow manual toggle. (Issue 10)

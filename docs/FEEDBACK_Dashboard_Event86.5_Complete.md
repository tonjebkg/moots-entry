# FEEDBACK — Dashboard Event 86.5 (Guest Intelligence + Tables)

**Date:** 2026-03-01
**Reviewer:** Founder + Independent QA
**Scope:** Guest Intelligence tab (All Contacts + Pending Review), Bulk Actions, Table Design (platform-wide)
**Build:** Post-86.4

---

## Context

Read these files before starting:
- `docs/MOOTS_VISION.md`
- `docs/PRODUCT_PRINCIPLES.md`
- `docs/FEEDBACK_Dashboard_Event86.4_Complete.md` (for prior context)

Key product principles to keep in mind:
- **Agent Model**: Agent proposes → Human decides → Agent responds → Agent learns
- **Font minimum**: No text under 13px anywhere. Body 16px minimum. Target user is 40+.
- **Event Status Pipeline**: In Pool → Selected → Invited → Confirmed → Declined → Waitlist. "Qualified" is NOT an event status.

---

## Issues

### ISSUE 1 — Replace VIP stars and Tier pills with a dedicated "Role" column (CRITICAL)

**Current state:** VIP is shown as a gold ★ star inline next to the guest's name. Tier badges (T1/T2/T3) are tiny 9px pills next to avatars. These are scattered, inconsistent, and hard to read.

**Required change:** Add a new table column called **"Role"** positioned after the "Title" column. This column displays one value per guest from the following hierarchy (lowest to highest):

- *(empty/undefined placeholder)* — default for contacts with no role assigned
- Tier 1
- Tier 2
- Tier 3
- Team Member
- Partner
- Co-host
- Speaker
- Talent
- VIP

**Requirements:**
- The Role value must be **editable inline** via a dropdown — click the cell to change it.
- Default state is an empty/undefined placeholder (e.g., light gray "—" or "Set role") that is clearly clickable.
- Remove the current ★ star icons from the Name column.
- Remove the current T1/T2/T3 pill badges from next to the avatars.
- This column must appear on **ALL tables platform-wide**: All Contacts, Pending Review, and any other table that displays contacts (Campaigns, Check-in, Seating, etc.).
- Font size for the Role value must be at least 13px.

### ISSUE 2 — Remove "Qualified" from Event Status everywhere (CRITICAL)

**Current state:** "Qualified" appears as:
1. A selectable option in the Event Status dropdown on every contact row
2. The current status badge displayed on most scored contacts (e.g., "Qualified ▾")
3. A pipeline summary card labeled "QUALIFIED (60+)" with count 44

**Required change:**
- Remove "Qualified" from the Event Status dropdown entirely. The only valid event statuses are: **In Pool, Selected, Invited, Confirmed, Declined, Waitlist**.
- Contacts currently labeled "Qualified" should revert to **"In Pool"** (their default state before any event action is taken).
- The pipeline summary card "QUALIFIED (60+)" can remain as a **scoring metric card** (it describes AI scoring, not event status), but it must NOT be confused with an event status. Consider renaming it to "Scored 60+" or "AI Qualified" to make the distinction clear. It should not use the same badge styling as actual event statuses.

### ISSUE 3 — Fix sticky bulk action bar overlapping top navigation (HIGH)

**Current state:** When contacts are selected and the user scrolls down, the bulk action bar becomes sticky at the top of the viewport. However, it slides **underneath** the "Moots | Events | People" top navigation bar, causing both bars to overlap. The bulk bar is partially hidden behind the nav.

**Required change:** The sticky bulk action bar must stop just **below** the top navigation bar (and below the event sub-tabs if those are also sticky). It should never overlap or go behind any existing fixed/sticky elements. Calculate the correct `top` offset by measuring the height of all sticky elements above it.

### ISSUE 4 — Add missing bulk action options and clarify "Add to Wave" (HIGH)

**Current state:** The bulk action bar contains: "+ Add to Wave" | "Change Status ▾" | "⊘ Decline Selected" | "Clear". Missing key actions, and "Add to Wave" is unclear.

**Required changes:**
1. **Rename "Add to Wave"** to something more explicit: **"Send Invites"** or **"+ Invite Selected"**. "Add to Wave" is internal jargon that a host won't immediately understand. The purpose is to send invitations, so say that.
2. **Add "✓ Approve Selected"** button — for Pending Review tab, hosts need one-click bulk approval. This should change selected contacts from "Pending Review" to "In Pool" (or "Selected" depending on the flow).
3. **Add "Assign to Team Member"** button — a dropdown that lists workspace members, allowing bulk assignment of a team member as the point of contact for all selected guests.

### ISSUE 5 — Make "+ Assign Member" button functional (HIGH)

**Current state:** The ASSIGNED TEAM section in the expanded row shows a "+ Assign Member" button, but clicking it does absolutely nothing. No dropdown, no modal, no team member picker appears.

**Required change:** Clicking "+ Assign Member" must open a dropdown or modal listing all workspace members (team members who have access to this event). The host selects a member, and that person is assigned as the point of contact for this guest. Once assigned:
- The team member's name and avatar should appear in the ASSIGNED TEAM section.
- A remove (×) button should allow unassigning.
- This is the foundation for future features: briefings, check-in notifications, and follow-up accountability.

### ISSUE 6 — Show 2-3 tags in table rows with tooltip overflow (MEDIUM)

**Current state:** The Tags column shows 1-2 tags and a "+1" (or "+2") overflow counter at 10px font. There is significant unused horizontal space in the table.

**Required changes:**
- Show up to **3 tags** in the table row before overflowing.
- The overflow counter ("+N") should display a **tooltip on hover** listing all remaining tags.
- All tag text must be at least **13px** (currently 12px).
- The "+N" overflow counter must be at least **13px** (currently 10px).
- In the expanded row, clicking "Manage Tags" should show the **complete list** of tags with the ability to add/remove.

### ISSUE 7 — Font size violations: 1,042 elements under 13px (MEDIUM)

**Current state:** Platform-wide font size audit reveals systematic violations of the 13px minimum rule:
- **Tier badges (T1/T2/T3):** 9px — being replaced by Role column per Issue 1
- **RSVP / Import source badges:** 10px
- **"+N" tag overflow counters:** 10px
- **Score numbers in table rows:** 12px
- **Tag pills (Credit, Direct Lending, etc.):** 12px
- **Avatar initials (CM, EW, etc.):** 10.64px
- **Sort arrow (▼):** 10px
- **Min Score label and value:** 12px

**Required change:** Audit all text elements and ensure nothing renders below 13px. Key targets:
- Score numbers: increase to at least 14px (this is the primary ranking metric)
- Source badges (RSVP, Import): increase to 13px minimum
- Tag pills: increase to 13px minimum
- Avatar initials: these can stay smaller as they're decorative, but should be at least 11px
- Min Score label/value: increase to 13px

### ISSUE 8 — Pending Review table must have full parity with All Contacts (MEDIUM)

**Current state:** Pending Review broadly mirrors All Contacts, but it needs to be confirmed that the new Role column (Issue 1), the functional Assign Member (Issue 5), the improved tags display (Issue 6), and the font fixes (Issue 7) are also applied to Pending Review.

**Required change:** Every fix in this document applies to BOTH All Contacts and Pending Review tables. They must be identical in column structure, inline editing capabilities, and visual design. The only difference is the filter (Pending Review shows only contacts awaiting review) and the additional Approve action button.

### ISSUE 9 — AI chatbar overlaps table content (LOW)

**Current state:** The floating "Ask Moots about your event..." chatbar with suggested prompts permanently covers the bottom ~80px of the viewport. The last 1-2 table rows are always partially hidden behind it.

**Required change:** Either:
- Make the chatbar **collapsible** (a small toggle to minimize it to just a thin bar or icon), OR
- Add enough **bottom padding** to the table container so the last row is never obscured when scrolled to the bottom.

---

## Execution Order

Follow this sequence. Each step must be completed and verified before moving to the next.

1. **Remove "Qualified" from Event Status** — Delete it from the status dropdown options, update any contacts currently set to "Qualified" to "In Pool", and consider renaming the pipeline card. (Issue 2)

2. **Add the "Role" column to All Contacts table** — New column after Title with inline-editable dropdown. Options: empty, Tier 1, Tier 2, Tier 3, Team Member, Partner, Co-host, Speaker, Talent, VIP. Remove ★ stars and T1/T2/T3 pills. (Issue 1)

3. **Add the "Role" column to Pending Review table** — Same implementation as step 2. Ensure full parity. (Issues 1 + 8)

4. **Fix sticky bulk action bar z-index and top offset** — Bar must dock below the top nav, never overlap it. (Issue 3)

5. **Update bulk action bar options** — Rename "Add to Wave" → "Send Invites" or "Invite Selected". Add "✓ Approve Selected". Add "Assign to Team Member" dropdown. (Issue 4)

6. **Make "+ Assign Member" functional** — Clicking it opens a workspace member picker. Selected member appears in the section with a remove option. (Issue 5)

7. **Improve tag display in table rows** — Show up to 3 tags, tooltip on overflow "+N", increase all tag font sizes to 13px+. (Issue 6)

8. **Fix font sizes platform-wide** — Audit and fix all text under 13px: scores, source badges, tags, overflow counters, Min Score label. (Issue 7)

9. **Fix AI chatbar overlap** — Add bottom padding to table container or make chatbar collapsible. (Issue 9)


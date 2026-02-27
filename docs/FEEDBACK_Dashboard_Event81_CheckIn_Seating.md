# Feedback: Dashboard Event 81 — Check-in & Seating Tab

**INSTRUCTION FOR CLAUDE CODE:** This is a prioritized review of the Check-in & Seating tab at `localhost:3003/dashboard/81/day-of`. Work through items in priority order. After fixing each item, verify the fix is visible in the browser. Items marked P0 are bugs or critical UX failures. Items marked P1 are design consistency issues. Items marked P2 are enhancements.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 81)
**URL:** `localhost:3003/dashboard/81/day-of`
**Sub-tabs reviewed:** Check-in, Seating, Introductions

---

## P0 — Critical Issues

### 1. Check-in table is inconsistent with Guest Intelligence table (P0)

**Current:** The "Recent Check-ins" list shows: `Name`, `email · Company`, then `Status badge` and `Time` on the far right. No title column, no score, no expandable rows, rows are not clickable. This is a completely different table design from the Guest Intelligence table.

**Problem:** The Guest Intelligence table is well-designed — it shows Name, Company, Title, Tags, Source, Status, and has expandable rows with AI insights and a link to the full guest profile. The Check-in table throws all of that away and shows a stripped-down list that's almost useless for an event director who needs to know WHO just checked in, not just their name and email.

**Fix — Use the same base table component as Guest Intelligence, adapted for check-in context:**

| Check-in Time | Name | Company | Title | Tags | Table | Check-in Status |
|---|---|---|---|---|---|---|
| 8:25 PM | Amara Osei | African Capital Alliance | Managing Director | Speaker, VIP | Table 2 | Checked In |

Key adaptations:
- Add **Check-in Time** as the first column (in 12-hour format — see item 2)
- Add **Table** column showing which table they're assigned to (connects Check-in to Seating)
- Keep expandable rows — when an event director sees a VIP just checked in, they want instant access to talking points and profile
- Clicking a row should open the guest profile side panel, same as in Guest Intelligence
- Default sort: most recent check-in first (descending by time)
- Remove the email display — it wastes space and the event director doesn't need it during check-in

### 2. Time format is 24-hour — must be 12-hour AM/PM (P0)

**Current:** Times display as `20:25:00`, `19:45:00`, `19:33:00`.

**Problem:** This platform is built for the US market. American users expect 12-hour format with AM/PM. The 24-hour format looks like a developer oversight.

**Fix:** Convert all time displays across the entire platform to 12-hour format:
- `20:25:00` → `8:25 PM`
- `19:45:00` → `7:45 PM`
- Drop the seconds — they add clutter with no value. `8:25 PM` not `8:25:00 PM`.

**Scope:** This is likely a global formatting issue. Check and fix ALL time displays platform-wide, not just the check-in tab. (Check Briefings, Analytics, Activity logs, etc.)

### 3. Introduction Pairings — reasoning text references wrong people (P0)

**Current:** The Introduction Pairings cards show two people (e.g., "Michael Thornton ↔ Amara Osei") but the reasoning text below references completely different names (e.g., "Harrington (Blackstone) and Sinclair (Sinclair Holdings)"). This is consistent across multiple pairings:
- Card: Theresa Knox ↔ Alexander Volkov → Text: "Chen-Ramirez (Advent) and Chen (CalSTRS)"
- Card: Philip Wainwright ↔ Megan Ellis → Text: "Thornton (Carlyle) and Barretti (Stanford Endowment)"
- Card: Andrew Sterling ↔ Beatrice Vanderholt → Text: "Waverly (Apollo) and Rhodes (NY State CRF)"
- Card: James Harrington ↔ Patrick O'Brien → Text: "Aldrich (KKR) and Vanderholt (Vanderholt Capital)"

**Problem:** The names in the header and the names in the reasoning are completely disconnected. This makes the introductions useless and destroys trust — the event director cannot rely on any of these pairings if the reasoning doesn't match the people.

**Fix:** The reasoning text must reference the actual people shown in the pairing card. This is likely a data mapping bug where the AI-generated reasoning is being assigned to the wrong pairing, or the reasoning was generated for placeholder/different people and not regenerated for the actual guest data.

### 4. Seating — no way to add or remove tables, no way to set seats per table (P0)

**Current:** The seating view shows Table 1 (9/10 seats) and Table 2 (8/10 seats). There is no button to add a new table, remove a table, or change the number of seats at a table. The table count and seat capacity appear to be hardcoded.

**Problem:** Every event has a different venue layout. A seated dinner for 20 at one venue might be 2 tables of 10, at another it might be 4 tables of 5. The event director MUST be able to:
- Add a new table (e.g., "+ Add Table" button)
- Remove a table (e.g., "×" on the table header, with confirmation)
- Set the number of seats per table (e.g., click on "10 seats" to edit, or a settings icon on each table)
- Rename tables (e.g., "Table 1" → "Host Table", "VIP Table", "Sponsor Table")

**Fix:** Add table management controls:
- "+ Add Table" button below the existing tables
- Each table header should have: editable name, seats count (editable), remove button (with confirmation)
- When seats are reduced below current assignments, show which guests would need reassignment

### 5. Seating — clicking a guest name does not open their profile (P0)

**Current:** Clicking a guest in the seating view does nothing useful — it just shows a small "×" to remove them. No profile panel, no side window, no guest details.

**Problem:** The event director arranging seating needs instant access to guest context. When deciding whether to seat James Harrington next to Amara Osei, they need to see: who are they, what's their role, what are the talking points, are they a sponsor contact? Without this, the seating view is just a list of names — no intelligence.

**Fix:** Clicking a guest name in the seating view should open the same guest profile side panel used in Guest Intelligence. This gives the event director instant context while arranging tables.

---

## P1 — Design & UX Issues

### 6. Seating — missing Title (job title) column (P1)

**Current:** Each guest in the seating view shows: Name, Company, Score. No job title.

**Problem:** "James Harrington, Blackstone Group" is not enough context. Is he a Managing Director? An Analyst? An intern? The title is essential for seating decisions — you don't seat a junior analyst next to your CEO.

**Fix:** Add title below the name, same format as Guest Intelligence: `James Harrington` / `Managing Director · Blackstone Group`. If space is tight, at minimum show it on hover or in a tooltip.

### 7. Seating — no visual indicator for host team members, sponsors, or VIPs (P1)

**Current:** All guests look identical — name, company, score. No way to distinguish between a sponsor's CEO, the host company's VP of Sales, a VIP speaker, or a regular attendee.

**Problem:** The event director needs to know at a glance: which people at this table are "ours" (host company team), which are sponsors, which are VIPs? This is critical for table composition. A table with no host team member means no one is facilitating introductions.

**Fix:** Add subtle visual indicators:
- **Host team:** Small icon or colored left border (e.g., the company's brand color)
- **Sponsor:** Sponsor badge or tag showing sponsor tier
- **VIP/Speaker:** VIP badge
- These should be visible without clicking — the whole point is at-a-glance table composition awareness

### 8. Check-in — no "Not Yet Checked In" section (P1)

**Current:** The check-in list only shows "Recent Check-ins" — people who have already arrived. There is no separate section or filter for guests who haven't checked in yet.

**Problem:** During an event, the event director's most urgent question is often: "Who hasn't arrived yet? Who do I need to call?" The current view only answers "who's here" but not "who's missing."

**Fix:** Add a section or toggle below the stats cards:
- **"Checked In" / "Not Yet Arrived"** toggle or two sections
- The "Not Yet Arrived" list should show the same table format, with the guest's expected status (Confirmed, Invited) and an action button (e.g., "Send Reminder" or "Call")
- Sort "Not Yet Arrived" by priority: VIPs and sponsors first

### 9. Check-in — capacity math is confusing with walk-ins (P1)

**Current:** Expected: 17, Checked In: 16, Walk-ins: 2, Check-in Rate: 94%, Capacity: 16/17.

**Problem:** 16 checked in + 2 walk-ins = 18 people actually present. But capacity shows 16/17. Are walk-ins counted in "Checked In"? Are they separate? The event director needs to know: how many humans are physically in the room right now?

**Fix:** Clarify the metrics:
- **Expected:** 17 (confirmed guests)
- **Arrived:** 18 (includes walk-ins)
- **Walk-ins:** 2
- **Missing:** 1 (confirmed but not arrived)
- Capacity bar should show 18/20 seats (actual people present vs. total capacity)

### 10. Seating — no drag-and-drop for moving guests between tables (P1)

**Current:** There's no visible way to move a guest from Table 1 to Table 2. Clicking a guest shows only an "×" (remove). No drag handle, no "Move to" option.

**Problem:** Table reassignment is one of the most frequent last-minute actions at events. If the director realizes two competitors are at the same table, they need to move someone in 2 seconds.

**Fix:** Enable drag-and-drop for guest cards between tables. Also add a right-click or long-press context menu: "Move to Table 2", "Move to Unassigned", "View Profile". The drag-and-drop is the primary interaction; the context menu is the fallback.

---

## P2 — Enhancements

### 11. Seating — "AI Suggest" button needs visible reasoning (P2)

**Current:** There's an "AI Suggest" button with a "Mixed Interests" dropdown. The AI has clearly done something (guests are assigned to tables), but there's no explanation of why each person is at their table.

**Enhancement:** After AI suggests seating, show a brief reasoning tooltip or expandable card for each table: "Table 1 theme: PE & Healthcare co-investment. Host facilitator: [name]. Sponsor objective served: [objective]." This connects to the vision of the agent being visibly intelligent.

### 12. Seating — add an "AI Suggest" reasoning log (P2)

**Enhancement:** When "AI Suggest" is clicked, show a brief activity log of what the AI considered: "Analyzed 17 guests across 6 objectives... Separated 2 competitor pairs... Placed sponsor contacts at sponsor-adjacent tables... Balanced seniority across tables." This is the "agent visibly working" principle from the Moots Vision document.

### 13. Introductions — add "Facilitate" action button (P2)

**Current:** Pairings show the two people and reasoning, but there's no action the director can take.

**Enhancement:** Add a "Facilitate" button that creates a task or note: "Introduce Michael Thornton (Carlyle) to Theresa Knox (Jefferies) — common ground: Healthcare PE co-investment." Could also integrate with the Check-in tab: when both people in a pairing have checked in, surface a prompt: "Both Michael and Theresa have arrived — time for the introduction."

---

## Summary: What's Improved Since Event 80

- Seating no longer crashes (the `seating_format` JS error is fixed)
- Seating now shows actual guests in tables with scores
- Introductions sub-tab has real content with pairings (was empty/broken in event 80)
- Walk-in button is functional
- "AI Suggest" button exists (new)
- "Unassigned Guests" panel with search exists (new)

## Issue Index

| # | Priority | Issue | Type |
|---|----------|-------|------|
| 1 | P0 | Check-in table inconsistent with Guest Intelligence table | Design |
| 2 | P0 | Time format 24h → must be 12h AM/PM (platform-wide) | Bug |
| 3 | P0 | Introduction reasoning text references wrong people | Bug |
| 4 | P0 | Seating — no way to add/remove tables or set seat count | Missing Feature |
| 5 | P0 | Seating — clicking guest doesn't open profile | Missing Feature |
| 6 | P1 | Seating — missing job title | Design |
| 7 | P1 | Seating — no visual indicator for host/sponsor/VIP | Design |
| 8 | P1 | Check-in — no "Not Yet Checked In" section | Missing Feature |
| 9 | P1 | Check-in — capacity math confusing with walk-ins | UX |
| 10 | P1 | Seating — no drag-and-drop between tables | Missing Feature |
| 11 | P2 | Seating — AI Suggest needs visible reasoning | Enhancement |
| 12 | P2 | Seating — AI reasoning activity log | Enhancement |
| 13 | P2 | Introductions — add "Facilitate" action button | Enhancement |

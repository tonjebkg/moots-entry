# Feedback: Dashboard Event 86.4 — Guest Intelligence Tab (Post-86.3 Build)

**INSTRUCTION FOR CLAUDE CODE:** This is a focused review of the Guest Intelligence tab after the 86.3 build. It merges the founder's direct voice-note feedback with an independent senior QA review. Work through items in the execution order at the bottom. After each fix, verify in the browser at `localhost:3003/dashboard/86/guest-intelligence`. Read `docs/MOOTS_VISION.md` and `docs/PRODUCT_PRINCIPLES.md` before starting — several items here touch core platform principles (agent-as-teammate, orchestration, VIP treatment).

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 86)
**URL:** `localhost:3003/dashboard/86/guest-intelligence`
**Date reviewed:** 2026-03-01

---

## What's Working Well — Preserve These

1. **"Add Guests" dropdown** with 4 import options (Single Guest, CSV, People, Previous Event) — the 86.3 feature gap was addressed. ✓
2. **Tags now show 2 visible** in table rows with "+1" overflow — improved from 1 tag before. ✓
3. **"Manage Tags" link** in All Contacts expanded view — tag management exists. ✓
4. **Event Status is a clickable dropdown** on All Contacts rows — shows status options with chevron. ✓
5. **Bulk action bar** on both All Contacts AND Pending Review now includes: + Add to Wave, Change Status ▾, Decline Selected. Was only "Add to Wave" before. ✓
6. **Pending Review now has checkboxes**, bulk action bar, Select All, and Min Score slider — all missing before. ✓
7. **Rich expanded row content** preserved: AI-Generated Insights, Why They Match, Objective Breakdown (per-objective scores), Suggested Talking Points. ✓
8. **Pipeline summary cards** clear and accurate: Guest Pool (200) → Scored (72) → Qualified 60+ (44) → Pending Review (31) → Selected (20) → Confirmed (17). ✓
9. **"24 qualified contacts scoring 60+ haven't been added to a campaign yet. View them →"** — proactive AI nudge. ✓

---

## ISSUES

### 1. "Add Guests" dropdown too narrow — "Import from Previous Event" wraps to two lines (P1 / POLISH)

**Current state (verified):** The dropdown menu for "✦ Add Guests" is not wide enough. "Import from Previous Event" breaks onto two lines: "Import from Previous" / "Event". The other 3 options fit on one line.

**The fix:**
- Increase the dropdown `min-width` so ALL options render on a single line
- Target: `min-width: 240px` or `w-60` in Tailwind (test to confirm)
- All 4 options should be single-line: "Add Single Guest", "Import from CSV", "Import from People", "Import from Previous Event"

---

### 2. VIP, Tier, and Team Member indicators missing from ALL tables (P0 / PLATFORM-WIDE)

**Current state (verified):** Charles Montgomery has a "VIP" tag (visible in expanded row under "TAGS: Credit, Direct Lending, VIP"), but in the table row, VIP is hidden behind the "+1" overflow badge. There is NO visual distinction between a VIP guest and any regular guest. No Tier 1/2/3 indicators. No Team Member badge. Every row looks identical regardless of importance.

**Founder feedback:** "In the table, we don't see who's a VIP, a Tier 1, Tier 2, or Tier 3. We don't even see who's a team member. Being able to see who's a VIP or the different tiers is really important so users can pay certain attention to those special guests."

**Founder escalation:** "This has to be reflected on ALL tables across the platform. Every time there's a table — Guest Intelligence, Campaigns, Briefings, Check-in, Seating, Follow-Up, Analytics — every time a guest is mentioned, their tier has to appear, and it also has to be reflected in the guest profile and the expanded modal."

**The fix — implement a guest badge system:**

**A) Define special guest categories (data model):**
- **VIP** — highest priority guest, manually assigned or flagged by the system
- **Tier 1 / Tier 2 / Tier 3** — configurable tiers defined per event or workspace (e.g., Tier 1 = keynote speakers, Tier 2 = major donors, Tier 3 = general attendees)
- **Team Member** — someone from the host organization's workspace (staff, partners, sponsors' team members)

**B) Visual treatment in table rows:**
- **VIP:** Gold star icon (★) next to the guest's name + subtle gold left-border or row highlight. The VIP badge should be ALWAYS visible — never hidden behind "+N" overflow.
- **Tier badge:** Small colored pill next to the name: "T1" (dark/primary), "T2" (medium), "T3" (light). Position: between the avatar and the name, or right after the name.
- **Team Member:** Small team icon (👥 or a people icon) next to the name, in a distinct color (e.g., blue). Helps users immediately spot internal team in the guest list.

**C) Where these badges must appear (PLATFORM-WIDE):**
1. Guest Intelligence — All Contacts table rows
2. Guest Intelligence — Pending Review table rows
3. Guest Intelligence — expanded row / modal
4. Guest Intelligence — Guest Profile page
5. Campaigns — any guest lists/tables
6. Briefings — guest mentions
7. Check-in & Seating — guest tables and seat assignments
8. Follow-Up — guest lists
9. Analytics — any guest references
10. Any future table that lists guests

**D) Implementation approach:**
- Add `vipStatus`, `tier`, and `isTeamMember` fields to the guest/contact model (or use tags with special treatment)
- Create a shared `<GuestBadges>` component that reads these fields and renders the appropriate icons/pills
- Use this component in every table row that displays a guest name
- The badge should be part of the Name column cell, positioned right after the avatar initials and before the name text

**For this PR:** Start with Guest Intelligence (All Contacts + Pending Review + expanded view + Guest Profile). Other tabs can follow in a subsequent PR but the shared component should be built now so it's ready.

---

### 3. Search must query tags (P0 / BUG)

**Current state (verified):** Typing "VIP" in the search bar returns "Showing 0 contacts · 'VIP'" and "No matching contacts" — despite Charles Montgomery having a VIP tag. Search only matches Name, Company, and Title.

**Founder feedback:** "Search should be able to search also by tags. It seems search is querying first name, last name, company, title, but not the tags. It's really important to be able to search the tags and have the guests filtered based on the tags."

**The fix:**
- Extend the search filter logic to also match against the contact's `tags` array
- When a user types "VIP", "PE", "Credit", "Direct Lending", etc., contacts with matching tags should appear
- Search should be case-insensitive and match partial strings (e.g., "cred" matches "Credit")
- The search result count should reflect tag matches: "Showing 15 contacts · 'VIP'"

---

### 4. "Qualified" and "In Pool" missing from Event Status dropdown (P0 / BUG)

**Current state (verified):** The Event Status dropdown (both per-row and bulk "Change Status") shows: Selected, Invited, Confirmed, Declined, Waitlist. Missing: **Qualified** and **In Pool**.

This means:
- A guest currently "Qualified" cannot be moved back to "Qualified" after being changed
- A guest on "Waitlist" cannot be moved back to "In Pool" — there's no going backward
- "Qualified" is already a status used in the table but it's not in the dropdown options

**Founder feedback:** "When I click on the list of statuses, I don't see Qualified. I see Selected, Invited, Confirmed, Declined, Waitlist, but I don't see Qualified. We should have Qualified added. And if I put someone on Waitlist, I cannot put them back to In Pool or Scored."

**Founder clarification on "Scored":** "Scored is not a status of a selection by the team. Scored means we actually did our job to score the profile against the objectives. In Pool makes sense — it means no decision has been made. Qualified makes sense. Selected doesn't mean a lot."

**The fix — revise the status options:**
The dropdown should include these statuses in this order:
1. **In Pool** — no decision made yet (the default/starting status)
2. **Qualified** — passed AI scoring threshold, team acknowledges quality
3. **Selected** — (keep for now, but consider renaming to something more meaningful like "Shortlisted" in future)
4. **Invited** — invitation sent
5. **Confirmed** — guest confirmed attendance
6. **Declined** — guest declined or was declined by team
7. **Waitlist** — on hold, may be invited if space opens

**Key behaviors:**
- Status changes should be bidirectional — a user MUST be able to move someone from Waitlist back to In Pool, or from Declined back to Qualified
- Both the per-row dropdown AND the bulk "Change Status" dropdown must show the same complete list
- The Pending Review per-row status badge should ALSO be a clickable dropdown (see issue #6)

---

### 5. Pending Review: needs "Approve" / "Qualify" as primary action (P0 / UX)

**Current state (verified):** The Pending Review expanded row offers only: "View Guest Profile", "+ Add to Wave", "⊘ Decline". The most common action — approving/qualifying a pending guest — has no dedicated button. Users must either use the bulk action bar (check box → Change Status → Qualified) or there's no direct path.

**Founder feedback:** "Pending review means it should be easy for users to put a contact pending review as qualified or approved or declined or put on the waitlist. So then they move from the table pending review to the table all contacts."

**The fix:**
- **Add a primary "✓ Approve" button** (or "✓ Qualify") to the Pending Review expanded row, positioned prominently BEFORE "+ Add to Wave"
- Button order in Pending Review expanded row: **"✓ Approve"** (green/primary) | "+ Add to Wave" (brand color) | "⊘ Decline" (red/destructive) | "View Guest Profile" (ghost/text)
- Clicking "Approve" should move the contact to "Qualified" status
- **Show a brief toast/confirmation:** "Charles Montgomery moved to Qualified" with an "Undo" link (3-5 seconds)
- The contact should then disappear from Pending Review and appear in All Contacts with "Qualified" status
- **Also add quick-action buttons per row (without expanding):** On hover, show small "✓" (approve) and "✗" (decline) icon buttons at the end of the row, so reviewers can make fast decisions without expanding each of the 31 contacts

---

### 6. Pending Review: Event Status badge must be a clickable dropdown (P0 / CONSISTENCY)

**Current state (verified):** On All Contacts, clicking a status badge like "Qualified ▾" opens a dropdown with status options. On Pending Review, clicking "Pending Review" just expands/collapses the row — no dropdown appears. The behavior is inconsistent between the two sub-tabs.

**The fix:**
- Make the "Pending Review" status badge on each row a clickable dropdown, same as All Contacts
- The dropdown should show the same complete status list (In Pool, Qualified, Selected, Invited, Confirmed, Declined, Waitlist)
- Clicking the chevron (▾) opens the dropdown; clicking the row name area expands the row
- When a user changes status from the dropdown, the contact moves to the appropriate list and shows a confirmation toast

---

### 7. Bulk action bar must be sticky on scroll (P0 / UX)

**Current state (verified):** When selecting contacts and scrolling down the table, the bulk action bar ("1 contact selected" | + Add to Wave | Change Status | Decline Selected) scrolls off-screen. Users must scroll all the way back up to act on their selections.

**Founder feedback:** "When we scroll down, we lose the view of the option bar. The option bar should be frozen at the top when we scroll down. We can select a lot of people, and when we're at the bottom of the list, we don't have to scroll up to see the options."

**The fix:**
- Make the bulk action bar `position: sticky; top: 0; z-index: 10;` (or equivalent Tailwind: `sticky top-0 z-10`)
- The bar should remain visible at the top of the viewport as the user scrolls through the table
- Include the selected count in the sticky bar so users always know how many contacts they've selected
- Test on both All Contacts (200 rows) and Pending Review (31 rows) — the bar should stick on both

---

### 8. Auto-scoring on contact addition + manual "Score" CTA fallback (P1 / FEATURE)

**Current state:** Pipeline shows Guest Pool (200) but only Scored (72). For the ~128 unscored contacts, there is no visible "Score" or "Score Now" button in the expanded view. No indication of whether scoring is running or queued.

**Founder feedback:** "For contacts who haven't been scored yet, we should have a CTA in the expanded model to score them. Scoring should be done automatically and instantly for all contacts. When a contact is added to this event, we should run the scoring automatically. If we follow the product principle, we have to demonstrate the power of orchestration from the agent to do the work as a team member."

**The fix:**
1. **Auto-score on addition:** When a contact is added to an event (via any import method), trigger AI scoring automatically in the background. No user action needed.
2. **Show scoring status:** For contacts being scored, show a "Scoring..." indicator with a subtle animation (spinner or progress) in the Score column instead of a number
3. **Manual "Score" CTA:** In the expanded view, if a contact has NOT been scored yet (Score = 0 or null), show a "✦ Score Now" button that triggers manual scoring
4. **For already-scored contacts:** Show "✦ Re-score" in the expanded view (this already exists as "Re-score All" in the header, but a per-contact option is useful)

---

### 9. Pending Review expanded row missing "Manage Tags" section (P1 / CONSISTENCY)

**Current state (verified):** All Contacts expanded view shows a "TAGS" section with "Credit, Direct Lending, VIP" and a "Manage Tags" link. Pending Review expanded view does NOT show this section — only source badges (LinkedIn, AI Scored) and AI content sections.

**The fix:**
- Add the same "TAGS" section with "Manage Tags" link to the Pending Review expanded view
- Position it in the same location as All Contacts (below source badges, above AI-Generated Insights)
- Same functionality: show all tags as pills, "Manage Tags" opens the tag editor

---

### 10. Team member assignment to guests (P0 / MAJOR FEATURE — VISION)

**Founder feedback (direct quote):** "I'd like to have a way to assign members of the workspace, like team members, partners, and sponsors, to guests. A guest A is already invited by sponsor B, and team member C and team member D are assigned to guest A. Assigned here means being the main contact. So team member C and D will be the main contact for guest A. They will receive an extended briefing about guest A. They will receive specific in-app notifications when guest A checks in. They will be responsible for making introductions to guest A and are responsible for post-event follow-ups."

**This is a critical platform feature. Implementation plan:**

**A) Data model:**
- Add `assignedMembers` array to each guest/contact (list of workspace member IDs)
- Add `referredBy` field (who invited/referred this guest — a partner, sponsor, team member)
- Workspace members need a simple model: name, role, email, avatar

**B) Guest Intelligence UI — Expanded Row:**
- Add an **"Assigned Team"** section in the expanded view (below Tags, above AI-Generated Insights)
- Show assigned members as avatar chips: "[TU] Tonje" "[JD] John Doe"
- **"+ Assign Member"** button that opens a dropdown/search of workspace members
- **"Referred by: [Sponsor Name]"** line if the guest was referred by someone

**C) Guest Intelligence UI — Table Row:**
- In the Name column area, show small stacked avatars (max 2-3) of assigned team members, with "+N" overflow
- Or add an "Assigned" column showing team member initials

**D) Downstream effects (future PRs but design for them now):**
- Briefings tab: assigned members receive extended briefing content for their assigned guests
- Check-in tab: assigned members get notified when their assigned guests check in
- Follow-Up tab: assigned members are responsible for post-event follow-up with their guests
- The referrer/sponsor relationship should influence scoring: "Low score BUT referred by CEO → flag for review"

**For this PR:** Build the "Assigned Team" section in the expanded view with the ability to assign/remove workspace members. Add the `assignedMembers` and `referredBy` fields to the data model. The downstream effects (notifications, briefings integration) can come in later PRs.

---

### 11. Sponsor/referrer context and priority flagging (P1 / VISION)

**Founder feedback:** "If a guest has a low score but is invited or referred by a partner, a sponsor, a donor, or co-host, or even a high-ranked team member like the CEO or president, naturally this would be flagged to the team. When they finalize the list of guests or think about how to host those guests, this will be taken into consideration."

**The fix:**
- Add a **"Referred by"** field to the guest model
- In the expanded view, show: "Referred by: [Name] — [Role: Sponsor / Co-host / CEO]"
- **Priority flag logic:** If a guest has a low score (e.g., below 60) BUT was referred by a partner/sponsor/high-rank team member, show a special flag: "⚑ Low score, referred by [Name]" — this tells the reviewer to consider the relationship, not just the score
- In the table row, a small referral icon (🔗 or similar) could indicate this guest was referred by someone important

---

## Summary — Execution Order for Claude Code

```
STEP 1: Fix "Add Guests" dropdown width (issue #1)
  → Increase min-width to fit "Import from Previous Event" on one line
  → Verify: open dropdown → all 4 options on single lines

STEP 2: Add "Qualified" and "In Pool" to status dropdowns (issue #4)
  → Update both per-row dropdown AND bulk "Change Status" dropdown
  → Full list: In Pool, Qualified, Selected, Invited, Confirmed, Declined, Waitlist
  → Ensure bidirectional status changes work (Waitlist → In Pool)
  → Verify: click any status dropdown → see all 7 options → change status → status updates

STEP 3: Make search query tags (issue #3)
  → Extend search filter to match against contact tags array
  → Case-insensitive, partial match
  → Verify: search "VIP" → Charles Montgomery appears → search "PE" → PE-tagged contacts appear

STEP 4: Make Pending Review status badge a clickable dropdown (issue #6)
  → Same dropdown behavior as All Contacts
  → Verify: click "Pending Review" chevron → dropdown appears → change to "Qualified" → contact moves

STEP 5: Add "Approve" button to Pending Review expanded row + quick hover actions (issue #5)
  → Add "✓ Approve" as primary green button before "+ Add to Wave"
  → Add hover quick-action icons (✓ and ✗) on each Pending Review row
  → Show toast with undo on status change
  → Verify: expand row → click Approve → contact moves to Qualified → toast shows

STEP 6: Make bulk action bar sticky (issue #7)
  → Add sticky positioning to the bulk action bar
  → Must stick on both All Contacts and Pending Review
  → Verify: select contacts → scroll to bottom → bar remains visible at top

STEP 7: Add "Manage Tags" to Pending Review expanded view (issue #9)
  → Same TAGS section as All Contacts expanded view
  → Verify: expand row in Pending Review → TAGS section with "Manage Tags" visible

STEP 8: Implement VIP/Tier/Team Member badge system (issue #2)
  → Create shared <GuestBadges> component
  → Add VIP star (★), Tier pills (T1/T2/T3), Team Member icon to Name column
  → VIP badge must NEVER be hidden behind "+N" overflow
  → Apply to: All Contacts rows, Pending Review rows, expanded view, Guest Profile
  → Verify: Charles Montgomery shows ★ VIP badge in table row → visible without expanding

STEP 9: Add auto-scoring + manual "Score Now" CTA (issue #8)
  → Auto-trigger scoring when contacts are added
  → Show "Scoring..." indicator for in-progress scoring
  → Add "✦ Score Now" button in expanded view for unscored contacts
  → Verify: unscored contact shows "Score Now" → click → scoring runs → score appears

STEP 10: Add team member assignment to expanded view (issue #10)
  → Add "Assigned Team" section to expanded view
  → "+ Assign Member" dropdown with workspace member search
  → Add "Referred by" field showing who invited/referred the guest
  → Add assignedMembers and referredBy to data model
  → Verify: expand guest → assign team member → member avatar appears → referral info shows

STEP 11: Add referrer priority flagging (issue #11)
  → If guest score < 60 AND referredBy is set → show "⚑ Low score, referred by [Name]"
  → Show referral icon in table row for referred guests
  → Verify: low-score referred guest shows flag in expanded view
```

**IMPORTANT — Platform-wide badge propagation (issue #2 follow-up):**
After completing Steps 1-11 for Guest Intelligence, the `<GuestBadges>` component built in Step 8 must also be applied to guest tables in: Campaigns, Briefings, Check-in & Seating, Follow-Up, and Analytics tabs. This can be a follow-up PR, but the component should be built as a shared/reusable component from the start.

**After completing all steps, verify the full flow:**
1. Open Guest Intelligence → VIP guest shows ★ badge in table row without expanding
2. Search "VIP" → VIP-tagged contacts appear
3. Click any status dropdown → see all 7 statuses including Qualified and In Pool
4. Switch to Pending Review → status badges are clickable dropdowns → click "✓ Approve" → contact moves to Qualified with toast
5. Select 5 contacts → scroll to bottom → bulk action bar stays visible (sticky)
6. Expand a guest → see Assigned Team section → assign a team member → see Manage Tags → see referral info
7. Open "Add Guests" → all 4 options on single lines

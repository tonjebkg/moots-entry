# Feedback: Dashboard Event 86.3 — Objectives Tab + Guest Intelligence Tab

**INSTRUCTION FOR CLAUDE CODE:** This is a focused, prioritized review of the Objectives tab AND the Guest Intelligence tab in the latest build (Event 86). It merges the founder's direct voice-note feedback with an independent review that measured font sizes, tested interactivity, clicked every element, and checked element behavior. Work through items in strict priority order. After each fix, verify it in a browser at 100% zoom. Do NOT move to other tabs until ALL items below are resolved.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 86)
**URLs:**
- `localhost:3003/dashboard/86/objectives`
- `localhost:3003/dashboard/86/guest-intelligence`
**Date reviewed:** 2026-02-28

**IMPORTANT — This document SUPERSEDES FEEDBACK_Dashboard_Event86.2_Complete.md on all Objectives tab items.** Where guidance conflicts (especially around auto-save vs. save button), follow THIS document.

---

## What's Working Well — Preserve These

### Objectives Tab
1. **Reverse objective order is working** — Objective 3 appears at the top, then 2, then 1. Newest-first display is correct. ✓
2. **"+ Add Objective" button at the top** — directly below the "Event Objectives" heading. Good. ✓
3. **AI Interpretation text is no longer italic** — regular weight, brown/terracotta color. Easier to read. ✓
4. **Refinement suggestions are now styled as clickable chips** with "+" icons — visual improvement over plain text. ✓
5. **"15 contacts currently qualify based on this objective"** is now displayed in the brand terracotta color and appears to be a link — it navigates to Guest Intelligence with a `?objective=` URL parameter. Partial fix (see issue #2 below). ✓
6. **3 well-written seed objectives** with distinct AI interpretations and per-objective qualify counts (43, 28, 15). ✓
7. **Helper text** "Describe who you want at this event in plain language. Moots handles the scoring." is present. ✓

### Guest Intelligence Tab
1. **Pipeline cards** at the top are clear: Guest Pool (200) → Scored (72) → Qualified 60+ (44) → Pending Review (31) → Selected (20) → Confirmed (17). Good overview. ✓
2. **"24 qualified contacts scoring 60+ haven't been added to a campaign yet. View them →"** — proactive AI nudge with a direct action link. Excellent pattern. ✓
3. **Two sub-tabs**: "All Contacts (50)" and "Pending Review (31)" — clear separation. ✓
4. **Expanded row content is rich and valuable**: AI-Generated Insights, Why They Match, Objective Breakdown with per-objective scores (e.g., 100, 93, 76), Suggested Talking Points, "View Guest Profile" / "+ Add to Wave" / "Decline" buttons. This is excellent — preserve this pattern. ✓
5. **Filters**: All Sources dropdown, Min Score slider, Search. Good filtering options on All Contacts. ✓
6. **Checkbox selection on All Contacts** with "1 contact selected" bar and "+ Add Selected to Wave" button. Basic bulk action exists. ✓
7. **"Objectives" and "Re-score All" buttons** in the header — useful shortcuts. ✓

---

## PART A: OBJECTIVES TAB ISSUES

### A1. CRITICAL CORRECTION: Save button required for manual edits — NO auto-save when typing (P0)

**⚠️ THIS CORRECTS FEEDBACK_Dashboard_Event86.2_Complete.md ISSUE #5 ⚠️**

**Previous guidance (86.2) said:** Auto-save is preferred, no save buttons needed.

**Founder correction (direct quote):** "I don't want the autosave when the user is typing something. I still want a button appearing for them to save. The autosave is only when they click on the suggestions that the AI is doing after the AI interpretation."

**Current state:** No visible save button anywhere. No auto-save indicator either.

**The fix — two distinct save behaviors:**

1. **When user manually types/edits objective text → Show a Save button.**
   - A "Save" button should appear (or become enabled) when the user modifies the objective text
   - The button should be visually clear — positioned near the objective input (e.g., right-aligned below the text input, or inline at the end)
   - Style: brand color, clearly clickable, labeled "Save" or with a save icon + "Save" text
   - On click: save the objective, trigger AI re-interpretation, update the qualify count
   - After save: show brief "✓ Saved" confirmation, then the button goes back to hidden/disabled until next edit
   - On blur without saving: optionally show a subtle warning "Unsaved changes" — but do NOT auto-save

2. **When user clicks an AI refinement suggestion → Auto-save immediately (no button needed).**
   - The click IS the confirmation — append suggestion text to objective, save, re-score
   - Show brief "✓ Saved · Re-scoring..." → updated qualify count
   - This is the ONLY scenario where auto-save is appropriate

**Why this matters:** The founder wants users to be intentional about manual edits (they might be mid-thought), but wants frictionless one-click refinement from AI suggestions.

---

### A2. BUG: "15 contacts currently qualify" link navigates but does NOT filter (P0)

**Current state (tested):** Clicking "15 contacts currently qualify based on this objective" navigates to:
`/dashboard/86/guest-intelligence?objective=be82febe-5994-4a69-8bfa-9a8768a2fad5`

But the Guest Intelligence page shows **"All Contacts (50)"** — the full unfiltered list. The 15 qualifying contacts are NOT filtered. The URL parameter is passed but ignored.

**Founder feedback (direct quote):** "When I click on 15 contacts currently qualified, it has to link to actually 15 people who are in the guest pool. So that's 15 people and those 15 people have to be filtered. Otherwise it doesn't make any sense. It has to be a real number linking to the actual people."

**The fix:**
1. The Guest Intelligence component must **read the `?objective=` URL parameter** on load
2. When present, it must **filter the contacts table** to show ONLY contacts that qualify for that specific objective
3. The table header should show **"15 contacts · Filtered by Objective 3"** (or similar) instead of "All Contacts (50)"
4. Provide a **"Clear filter"** or **"Show all contacts"** link to return to the unfiltered view
5. The filter should also be reflected in the sub-tab count — e.g., "Filtered (15)" instead of "All Contacts (50)"

**This is the critical "show me" moment** — the user defines an objective, sees "15 contacts qualify," clicks to verify, and sees EXACTLY those 15 people. Without the filter, the link is useless and erodes trust in the scoring system.

---

### A3. Refinement suggestions must be STATEMENTS, not questions (P0)

**Current state:** Suggestions are still phrased as questions:
- "+ Should I include LPs who are currently reducing PE exposure but might be re-entering, or only active allocators?"
- "+ Is there a minimum commitment size that matters — e.g., $25M+ allocations?"

**Founder feedback (direct quote):** "Regarding those AI suggestions, they can't be questions. They have to be suggestions of things that will help refine the scoring, but it can't be a question because if then we click on it and it adds the question to the prompt, adding a question in the prompt itself is not helpful."

**Why questions are wrong:** When the user clicks a suggestion, it auto-appends to the objective text. A question like "Should I include LPs who are reducing PE exposure?" added to the prompt is nonsensical — the scoring engine needs directives, not questions.

**The fix — rewrite ALL suggestions as directive statements:**

| Current (WRONG — question) | Target (CORRECT — statement) |
|---|---|
| "Should I include LPs who are currently reducing PE exposure but might be re-entering, or only active allocators?" | "Include only active allocators — exclude LPs currently reducing PE exposure" |
| "Is there a minimum commitment size that matters — e.g., $25M+ allocations?" | "Prioritize LPs with $25M+ commitment sizes" |
| "Should I weight co-investment track record more heavily than current AUM?" | "Weight co-investment track record more heavily than current AUM" |
| "Are there specific sectors (healthcare, tech, industrials) where PE focus matters more for this dinner?" | "Prioritize PE focus in healthcare, tech, and industrials sectors" |

**Rules for AI-generated suggestions:**
- Always phrased as imperative/directive statements
- Start with action verbs: "Include", "Exclude", "Prioritize", "Weight", "Focus on", "Filter for"
- No question marks
- Should make sense when appended to the objective text
- Short and specific — one refinement per suggestion

**Also replace the "+" icon prefix** with something that says "click to apply" — a small arrow icon (→) or a "✓ Apply" style. The "+" suggests "add" which is correct, but a more descriptive icon/label helps.

---

### A4. Font sizes still need attention on Objectives tab (P1)

**Current measured sizes:**
- AI Interpretation body text: appears to be ~14px (improved from 12px in 86.2)
- "15 contacts currently qualify" text: appears ~14px
- Refinement suggestion chip text: appears ~13-14px
- Helper text "Describe who you want...": appears ~13px

**Target sizes (from FEEDBACK_Dashboard_Event86.2):**

| Element | Target | Notes |
|---------|--------|-------|
| Objective input text | 16px | PRIMARY content the user writes |
| AI Interpretation body text | 16px | Must be easily readable |
| "X contacts currently qualify" | 14px min | Critical metric — now also a link |
| Refinement suggestion text | 14px | These are clickable — need to be readable |
| Helper text | 14px | Slightly darker color too (#666 not #999) |
| "AI INTERPRETATION" label | 13px | ALL CAPS label, can be slightly smaller |

**Rule:** No text below 13px. Body content and user-written text at 16px minimum.

---

### A5. Objective order numbering should reflect display order (P2)

**Current:** Objectives display as 3, 2, 1 (newest first — correct). The numbers 3, 2, 1 in the circles reflect creation order.

**The fix:** This is fine as-is. The creation-order numbering (3, 2, 1) makes sense because the objectives are referenced by number elsewhere (e.g., "Objective 1" in qualify counts). Renumbering would cause confusion. **No change needed — just documenting that this is intentional.**

---

## PART B: GUEST INTELLIGENCE TAB ISSUES

### B1. CRITICAL: No way to import contacts in bulk (P0 / FEATURE GAP)

**Current state (tested):** The "✦ Add Guest" button opens a modal with fields for a SINGLE contact: First Name, Last Name, Email, LinkedIn URL, Title, Company, Note. One guest at a time.

**Founder feedback (direct quote):** "How do we actually bring contacts here? Add guest is one at a time, but how do we import them? So there needs to be: import from CSV, import from the People tab, import from a previous event guest list."

**The fix — redesign "Add Guest" as an "Add Guests" menu with 4 options:**

1. **"Add Single Guest"** — the current form (keep it, it's useful for one-off additions)

2. **"Import from CSV"**
   - Opens a file upload dialog
   - Accepts .csv and .xlsx files
   - Shows a column mapping preview: "We found 150 rows. Map your columns: First Name → [dropdown], Last Name → [dropdown], Email → [dropdown], Company → [dropdown]..."
   - After mapping: "Import 150 contacts into Guest Pool?" → confirm
   - Imported contacts go to "In Pool" status, ready for AI scoring

3. **"Import from People"**
   - Opens a searchable/filterable view of the global People database (the People tab in the top nav)
   - User can search, filter by tags/company/title, and select contacts
   - Bulk select with checkboxes: "Select all" / individual selection
   - "Add 25 selected contacts to Guest Pool" → confirm

4. **"Import from Previous Event"**
   - Shows a dropdown of previous events (Event 83, Event 85, etc.)
   - After selecting an event, shows its guest list with filters (status, score, etc.)
   - User can select all confirmed guests from a previous event, or filter to specific statuses
   - "Import 18 guests from Q1 Executive Dinner?" → confirm

**Implementation:** Replace the current "+ Add Guest" button with a dropdown/popover menu showing these 4 options. The button label should become "✦ Add Guests" (plural) with a small dropdown arrow.

---

### B2. CRITICAL: No way to change event status manually (P0 / FEATURE GAP)

**Current state (tested):** The "Event Status" column shows badges like "Qualified", "Pending Review", etc. Clicking a status badge just expands/collapses the row — there is NO dropdown, NO status picker, NO way to change a guest's status.

The only status-changing actions available are in the expanded row: "+ Add to Wave" and "Decline" buttons. But these only cover two transitions. There is no way to:
- Move a guest from "Qualified" to "Selected" directly
- Move a guest from "Pending Review" to "Qualified"
- Move a guest back to "In Pool"
- Change any status to any other status

**Founder feedback (direct quote):** "How do we change the event status of a guest? I can see decline but that's it. If you wanna change the event status, like you don't want it to be qualified, you want to change, but you can't."

**The fix:**
1. **Make the Event Status badge a clickable dropdown.** Clicking "Qualified" should open a dropdown menu showing all available statuses: In Pool, Scored, Qualified, Selected, Invited, Confirmed, Declined, Checked In
2. Selecting a new status changes it immediately
3. **Visual cue:** The status badge should have a small dropdown chevron (▾) to indicate it's interactive
4. **Color-code statuses** consistently across the platform (same colors as pipeline cards)
5. Some transitions may need confirmation (e.g., "Move to Declined?" → confirm) to prevent accidents
6. Status changes should be logged in activity feeds

---

### B3. CRITICAL: AI-powered bulk actions needed (P0 / VISION)

**Current state (tested):** When selecting contacts with checkboxes (on All Contacts tab only), a bar appears with ONLY: "1 contact selected" + "+ Add Selected to Wave" + "Clear". No other bulk actions.

**Founder feedback (direct quote):** "Eventually AI bulk actions, like, 'decline all contacts under a score of 40,' 'send invite to all above 75 and that creates a campaign' — so, 'invite all above 75' would trigger a new invitation wave."

**The fix — expand the bulk action bar with these options:**

When 1+ contacts are selected, the action bar should show:

1. **"+ Add to Wave"** (existing — keep it)
2. **"Change Status ▾"** — dropdown to set status for all selected contacts (same options as B2)
3. **"Decline Selected"** — bulk decline with confirmation
4. **"Add Tags ▾"** — add tag(s) to all selected contacts

**Phase 2 — AI-powered bulk actions (the vision):**
- An **AI action input** or **smart filter button** that accepts natural language: "Decline all under 40", "Invite all above 75", "Tag all PE contacts as VIP"
- The AI interprets the command, shows a preview: "This will decline 12 contacts scoring below 40. Proceed?" → confirm
- "Invite all above 75" should create a new campaign/wave with those contacts auto-added
- This is the "agent as co-pilot" pattern from MOOTS_VISION.md — the user gives high-level intent, the agent executes

**For now (MVP):** At minimum, add "Change Status" and "Decline Selected" to the bulk action bar. The AI natural-language bulk actions can come in a later iteration but should be planned for.

---

### B4. Pending Review tab missing checkboxes and bulk actions (P0)

**Current state (tested):** The Pending Review sub-tab (31 contacts) has NO checkboxes on rows. Users cannot select multiple pending contacts for bulk actions. They must review each one individually — expanding the row, then clicking "+ Add to Wave" or "Decline" one at a time. For 31 pending contacts, this is extremely tedious.

**Founder feedback (direct quote):** "Pending review needs the same capabilities: status change, bulk actions, tags, add to wave."

**The fix:**
1. **Add checkboxes** to the Pending Review table (matching the All Contacts tab)
2. **Show the same bulk action bar** when contacts are selected: "+ Add to Wave", "Change Status", "Decline Selected", "Add Tags"
3. **Add a "Select All" checkbox** in the header row
4. **Consider adding quick-action buttons per row** (without expanding): small "✓ Approve" and "✗ Decline" icons visible on hover, so users can make fast decisions without expanding each row
5. The Pending Review tab should also have the **Min Score filter slider** (currently missing — only All Contacts has it)

---

### B5. Tags should show 2-3 visible before "+N" overflow (P1)

**Current state (tested):**
- In All Contacts: Tags column shows 1 tag + "+2" (e.g., "Credit +2")
- In Pending Review: Tags column shows just 1 tag (e.g., "Credit")
- In expanded row: Tags show as source badges (e.g., "LinkedIn", "AI Scored") — these are source tags, not guest-classification tags

**Founder feedback (direct quote):** "Tags should show two or three visible tags with a plus for more. The full list should appear in the modal — the expanded view — and in the guest profile."

**The fix:**
1. **Show 2-3 tags** in the table row before the "+N" overflow indicator
2. Tags should be styled as small pills/chips (similar to the source badges like "RSVP")
3. "+N" overflow badge should be clickable — either expands the row or shows a tooltip with all tags
4. **In the expanded row**: Show the FULL list of all tags (not just source tags)
5. **In the guest profile modal**: Show the FULL list of all tags with the ability to add/remove
6. **Distinguish between tag types**: Source tags (LinkedIn, RSVP, AI Scored) vs. classification tags (VIP, PE, LP, Credit, etc.) — they should be visually distinct (different colors or different sections)

---

### B6. No way to assign VIP label or custom tags (P1 / FEATURE GAP)

**Current state:** There is no visible mechanism to tag a guest as "VIP" or assign any custom tags/labels. The only tags visible are system-generated: Source tags (LinkedIn, RSVP, AI Scored) and what appears to be auto-generated classification tags (Credit, PE, etc.).

**Founder feedback (direct quote):** "There's no clear path for the user to say, 'this person is VIP, I want to assign the VIP label.'"

**The fix:**
1. **Add a "Manage Tags" action** in the expanded row — a button or link that opens a tag editor
2. The tag editor should show: existing tags (removable), a text input to add new tags, and **suggested tags** (VIP, Speaker, Host, Priority, etc.)
3. **VIP should be a special/prominent tag** — perhaps with a star icon (★) — that gives the contact visual prominence in the table (gold badge, highlighted row, or a star icon next to their name)
4. Tags should also be manageable from the **guest profile page** ("View Guest Profile" link)
5. Bulk tag assignment (via checkboxes → "Add Tags" bulk action) should also be available (covered in B3)

---

### B7. Event Status badges inconsistent between tabs (P2)

**Current state:**
- All Contacts tab: Shows varied statuses — "Qualified", "Selected", etc. with colored badges
- Pending Review tab: All show "Pending Review" (expected, since they're filtered)
- But the expanded row in Pending Review doesn't show a way to transition status — only "+ Add to Wave" and "Decline"

**The fix:**
- Ensure status badges have **consistent color coding** across all views
- The expanded row should show **all available status transitions** as buttons or a dropdown — not just "+ Add to Wave" and "Decline"
- Consider showing the **status pipeline** visually in the expanded row: a mini-funnel showing where this contact is in the pipeline, with clickable stages to move them

---

### B8. Objective filter link on Guest Intelligence should show filter state (P2)

**Current state:** When navigating from Objectives tab via "15 contacts qualify" link, the URL has `?objective=<uuid>` but there's no visual indication that a filter is active. The page looks identical to the unfiltered view.

**The fix (once the filter actually works — see A2):**
1. Show a **filter banner** at the top of the table: "Filtered by Objective 3: Institutional LPs... · 15 contacts · [Clear filter]"
2. The sub-tab should show "Filtered (15)" instead of "All Contacts (50)"
3. The pipeline cards at the top could optionally update to show counts relative to this objective only

---

## Summary — Execution Order for Claude Code

```
STEP 1: Fix save behavior on Objectives tab (issue A1)
  → Add visible Save button that appears when user manually edits objective text
  → Save button triggers: save → AI re-interpret → update qualify count
  → Suggestion clicks still auto-save (no button needed for this path)
  → Verify: edit objective text → Save button appears → click Save → "✓ Saved" → count updates

STEP 2: Fix "X contacts qualify" filter on Guest Intelligence (issue A2)
  → Guest Intelligence must read ?objective= URL parameter
  → Filter table to show ONLY qualifying contacts
  → Show filter state: "Filtered by Objective 3 · 15 contacts · [Clear]"
  → Verify: click "15 contacts qualify" on Objectives → Guest Intelligence shows exactly 15 contacts

STEP 3: Rewrite refinement suggestions as statements (issue A3)
  → ALL suggestions must be directive statements, not questions
  → Start with action verbs: Include, Exclude, Prioritize, Weight, Focus on, Filter for
  → No question marks
  → Verify: suggestions read as directives that make sense when appended to objective text

STEP 4: Add bulk import options to "Add Guests" (issue B1)
  → Redesign "Add Guest" as "Add Guests" dropdown with 4 options:
     Single Guest, Import from CSV, Import from People, Import from Previous Event
  → Implement at least the UI/modal for each option (backend can be stubbed if needed)
  → Verify: clicking "Add Guests" shows all 4 options

STEP 5: Make Event Status badge a clickable dropdown (issue B2)
  → Clicking status badge opens dropdown with all status options
  → Add dropdown chevron (▾) visual indicator
  → Verify: click "Qualified" badge → dropdown appears → select new status → status changes

STEP 6: Expand bulk action bar (issues B3 + B4)
  → Add to All Contacts bulk bar: "Change Status", "Decline Selected", "Add Tags"
  → Add checkboxes to Pending Review tab
  → Add same bulk action bar to Pending Review
  → Add Min Score filter to Pending Review
  → Verify: select 3 contacts → bulk action bar shows all options → change status for all 3

STEP 7: Fix tag display and add tag management (issues B5 + B6)
  → Show 2-3 tags in table rows before "+N"
  → Full tag list in expanded row and guest profile
  → Add "Manage Tags" in expanded row (add/remove tags including VIP)
  → Distinguish source tags vs classification tags visually
  → Verify: table shows 2-3 tags → expand row → full tag list → add VIP tag → tag appears

STEP 8: Font size adjustments on Objectives tab (issue A4)
  → Apply minimum size standards from the table in A4
  → No text below 13px, body content 16px minimum
  → Verify: all text comfortable to read at 100% zoom
```

**After completing all 8 steps, verify the full flow:**
1. Open Objectives tab — edit objective text → Save button appears → click Save → AI re-interprets → qualify count updates
2. Click a refinement suggestion (now a statement) → auto-appends to objective → auto-saves → count updates → suggestion removed
3. Click "15 contacts qualify" → navigates to Guest Intelligence → shows EXACTLY 15 contacts filtered by this objective
4. On Guest Intelligence, click a status badge → dropdown opens → change status
5. Select 3 contacts with checkboxes → bulk action bar shows: Add to Wave, Change Status, Decline, Add Tags
6. Click "Add Guests" → see 4 import options (Single, CSV, People, Previous Event)
7. Switch to Pending Review → has checkboxes, bulk actions, Min Score filter
8. Expand a contact → see full tag list → add VIP tag → tag appears in table row

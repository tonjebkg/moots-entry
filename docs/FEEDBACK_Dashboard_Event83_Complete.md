# Feedback: Dashboard Event 83 — Complete Platform Review

**INSTRUCTION FOR CLAUDE CODE:** This is a comprehensive, prioritized review of the entire Moots-Entry dashboard at Event 83. It merges the founder's direct voice-note feedback with an independent tab-by-tab review conducted against MOOTS_VISION.md and PRODUCT_PRINCIPLES.md. Work through items in priority order within each tab. After fixing each item, verify the fix is visible in the browser. Items marked P0 are bugs or critical UX failures. Items marked P1 are design consistency issues. Items marked P2 are enhancements. Items marked VISION are gaps relative to MOOTS_VISION.md that should inform architecture decisions.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 83)
**URL:** `localhost:3003/dashboard/83/overview`
**Date reviewed:** 2026-02-27

---

## Global Issues (Apply Platform-Wide)

### G1. "Ask Moots" button must become a persistent chat panel (P0 / VISION)

**Current:** A floating "Ask Moots" button sits in the bottom-right corner of every page. Clicking it opens a side panel with a chat interface, suggested questions, and an input field. When closed, only the button is visible.

**Problem (Founder feedback):** "The chat element should be visible at all times — not just the call to action. Like ChatGPT or Claude, having the input field always available is really important. This is not a support widget — it's a collaborator." The current pattern looks like an Intercom/support chat widget. Per MOOTS_VISION.md: "Every page in the Moots platform should have access to a conversational interface — a panel where the event director can talk to the agent about the current event. This is not a help desk. This is not a search bar. This is a collaborator."

**Fix:** Replace the floating button with a persistent, always-visible chat input bar at the bottom of the page (or a persistent right-side panel that stays open). The input field and at minimum the last 2-3 messages should always be visible. The user should never have to "open" a chat — it should feel like a persistent collaborator presence, not a hidden support channel. Think of it like Cursor's AI input bar — always there, always ready.

### G2. Agent personality in empty states (P1 / VISION)

**Current:** Empty states across the platform use generic text like "No campaigns yet. Create one to start managing invitations." and "Assign team members to guests and I'll track engagement and follow-through here."

**Problem:** Per MOOTS_VISION.md, the agent should have personality and be proactive. Generic empty states feel like a SaaS tool, not an intelligent agent. Per PRODUCT_PRINCIPLES.md Principle 5: "Place the prompt at the moment of highest motivation."

**Fix:** Replace all empty states with agent-voice messages that suggest next actions. Examples:
- Campaigns: "I'm ready to help you build your first invitation campaign. Based on your 72 scored contacts, I'd recommend starting with your top 20 matches. Want me to draft a campaign?"
- Team Performance: "Once you assign team members to guests, I'll track who's driving the most engagement and follow-through. Want to set up your team?"
- Any empty state should feel like the agent is eager and ready, not like a blank page waiting for input.

---

## Tab 1: Overview

### O1. Agent Activity and Recent Activity should be side-by-side, not stacked (P0)

**Current:** The Overview page shows "Agent Activity" feed (12+ entries) stacked vertically above "Recent Activity" feed. Both are full-width. This creates massive vertical scrolling — the page is extremely long.

**Problem (Founder feedback):** "The Agent Activity and Recent Activity being vertical creates a lot of scrolling and void space. These should be side by side." The current layout wastes horizontal space and forces the user to scroll extensively to see both feeds.

**Fix:** Place Agent Activity and Recent Activity in a **two-column layout, side by side**. Each column should have its own scroll container (max-height with overflow-y: auto), so the user can scan both feeds without scrolling the entire page. Keep the summary cards ("Needs Attention," event stats) above both columns.

### O2. Guest Pool card format is inconsistent with other stat cards (P1)

**Current:** The summary cards at the top show metrics like "17/20 Confirmed" and "16 Checked In" with percentage/fraction formatting. The "Guest Pool" card shows just "200" with no percentage or fraction below it.

**Problem:** Every other card has a secondary metric (fraction, percentage, or sub-label). Guest Pool stands alone as just a number, which breaks visual consistency.

**Fix:** Add context to the Guest Pool card. Options: "200 contacts" or "200 / 72 scored" or "200 in pool · 72 scored." Match the format of the other cards.

### O3. Recent Activity timestamps are all identical and vague (P1)

**Current:** Every entry in Recent Activity shows "6h ago" — all identical. Multiple guests show "confirmed attendance" all at the same relative time.

**Problem:** This looks like seed data that wasn't differentiated. In production, activities would be spread across time. For demo/seed data, vary the timestamps to make it feel realistic (e.g., "2h ago", "5h ago", "yesterday", "2 days ago"). Identical timestamps destroy the illusion of a living, working agent.

**Fix:** Vary seed data timestamps across a realistic range. Also consider showing absolute timestamps for anything older than 24h (e.g., "Feb 25, 3:15 PM" instead of "2 days ago").

---

## Tab 2: Objectives

### OB1. "Add Objective" button must be at the top, not the bottom (P0)

**Current:** The "+ Add Objective" button is at the very bottom of the page, below all existing objectives. On a page with 3 objectives, the user must scroll past all of them to find it.

**Problem (Founder feedback):** "The Add Objectives should be at the top, as a button at the top, not all the way at the bottom of the page." Per PRODUCT_PRINCIPLES.md Principle 6: "Reduce friction to near zero on the critical path." Making the user scroll to find a primary action is unnecessary friction.

**Fix:** Move "+ Add Objective" to the top of the page, next to the "Objectives" heading. Keep it visible without scrolling.

### OB2. Each objective needs its own Save button (P0)

**Current:** There is a single Save button (floppy disk icon with "S" shortcut) in the bottom-right corner of the page. It saves all objectives at once.

**Problem (Founder feedback):** "Each objective should have its own Save per objective. The user should be able to save one at a time." A global save button is confusing — if I edit Objective 2, I shouldn't have to worry about whether my edits to Objective 1 are also being saved. Individual save gives the user control and confidence.

**Fix:** Add a Save button on each individual objective card. When the user edits text in an objective, the Save button for that specific objective should become active/highlighted. Consider auto-save with a subtle "Saved" confirmation, but at minimum provide per-objective save.

### OB3. AI Interpretation should be richer — ask clarifying questions (P2 / VISION)

**Current:** Each objective has an "AI Interpretation" section that shows a brief text interpretation of the objective.

**Problem (Founder feedback):** "The AI should understand context enough to interpret and potentially ask clarifying questions to refine the objective." Per MOOTS_VISION.md, the agent should be conversational and contextually deep.

**Fix:** When the user writes an objective, the AI interpretation should:
1. Show its interpretation (existing behavior)
2. Optionally surface 1-2 clarifying questions: "When you say 'senior decision-makers,' do you mean C-suite only, or VP-level and above?" or "Should I prioritize guests from your existing network or also look for new contacts?"
3. Allow the user to answer inline, which refines the interpretation and improves downstream scoring.

---

## Tab 3: Guest Intelligence

### GI1. Auto-score contacts instead of manual "Score All Contacts" button (P0 / VISION)

**Current:** The Guest Intelligence tab has a prominent red "Score All Contacts" button. The user must manually click it to trigger AI scoring.

**Problem (Founder feedback):** "Why do I have to tell the AI to score all? It should happen automatically when objectives change or when a new contact is added." Per MOOTS_VISION.md: "The agent does the work — researches, analyzes, scores, recommends, generates." The user shouldn't have to trigger scoring — it should be autonomous.

**Fix:** Auto-score contacts when:
- A new contact is added to the event
- Objectives are created or updated
- New context is provided (sponsor goals, event details change)

Show a brief "Scoring 72 contacts against your objectives..." activity indicator instead of requiring a manual button press. If a manual re-score is needed as a fallback, make it a secondary/subtle action, not the primary CTA.

### GI2. Chat/AI input should replace or supplement filter buttons (P1 / VISION)

**Current:** Above the guest table, there are filter buttons and search. The conversational interface is only available via "Ask Moots."

**Problem (Founder feedback):** "The chat interface, an input to write to the AI, should exist above the Guest Intelligence table — not just the filter and search buttons. I should be able to type 'show me everyone from fintech who hasn't confirmed' right there." Per MOOTS_VISION.md's Conversational Interface section.

**Fix:** Add a natural-language input bar above the guest table (or integrate it with the existing search bar) that accepts both traditional search queries and natural language. "fintech CTOs" or "show me unconfirmed VIPs" should both work. This can coexist with the traditional filters.

### GI3. Tags overflow — use "+N" pattern with tooltip (P1)

**Current:** In the All Contacts table, tags sometimes overflow or take up too much horizontal space when a guest has many tags.

**Problem (Founder feedback):** "Tags need a plus N overflow with a tooltip. Show the first tag, then +3 or however many, and on hover show the rest."

**Fix:** Show the first 1-2 tags visible, then a "+N" badge. On hover over "+N", show a tooltip listing all remaining tags. This is already partially implemented in the Check-in tab — apply the same pattern consistently to all guest tables.

### GI4. Pending Review sub-tab uses card layout — must match All Contacts table format (P0)

**Current:** The "Pending Review" sub-tab displays guests as cards (different component), while "All Contacts" uses a proper table with columns (Score, Name, Company, Title, Tags, Source, Event Status).

**Problem (Founder feedback):** "The Pending Review table should look exactly like the All Contacts table. Same columns, same expandable rows, same interaction patterns. Just filtered to pending guests." Per PRODUCT_PRINCIPLES.md Principle 3: "Design is how it works." Consistency in interaction patterns reduces cognitive load.

**Fix:** Replace the card layout in Pending Review with the same table component used in All Contacts, filtered to show only guests with "Pending Review" status. Same columns, same row expansion, same click behavior.

---

## Tab 4: Campaigns

### C1. Empty state needs agent personality (P1 / VISION)

**Current:** "No campaigns yet. Create one to start managing invitations."

**Problem:** See G2. Generic, lifeless empty state.

**Fix:** "I'm ready to build your first invitation campaign. You have 72 scored contacts — want me to suggest a campaign starting with your top-rated matches?"

---

## Tab 5: Briefings

### B1. "View" button on briefings returns "Briefing not available" (P0 — BUG)

**Current:** The Briefings tab shows 3 briefings (End-of-Day, Pre-Event, Morning-of) all with "Ready" status. Clicking "View" on any of them opens a side panel that says "Briefing not available."

**Problem:** The briefing status says "Ready" but the content doesn't load. This is a data/API bug — either the briefing content isn't being generated, or the view component isn't fetching it correctly.

**Fix:** Debug the briefing view flow. When status is "Ready," the View panel must display the actual briefing content. Check: Is briefing content being stored? Is the API endpoint returning it? Is the component fetching the right briefing ID?

### B2. Briefings should show "agent thinking" state when generating (P2 / VISION)

**Current:** Briefings appear as static cards with a status badge. No indication of the agent working.

**Problem:** Per MOOTS_VISION.md: "When generating a briefing: 'Reviewing 12 guest profiles for tomorrow's dinner... Checking overnight news... Found 2 relevant updates about attendees... Identifying key talking points... Briefing ready.'"

**Fix:** When a briefing is being generated (or regenerated), show a progressive activity state: "Reviewing guest profiles... Cross-referencing with event objectives... Drafting key talking points... Briefing ready." This transforms a loading spinner into visible intelligence.

---

## Tab 6: Check-in & Seating

### Sub-tab: Check-in

#### CS1. "Not Yet Arrived" section must be ABOVE "Recent Check-ins" (P0)

**Current:** The "Not Yet Arrived (3)" section is at the BOTTOM of the check-in page, below all the checked-in guests.

**Problem (Founder feedback):** "The Not Yet Arrived should be above the Recent Check-ins. During an event, the most urgent question is 'who hasn't arrived yet?' — that's what I need to see first, not who's already here."

**Fix:** Move "Not Yet Arrived" section to the TOP of the page, directly below the summary stat cards. "Recent Check-ins" goes below it. Priority information first.

#### CS2. Score should be visible in the check-in table (P1)

**Current:** The check-in table shows Time, Name, Company, Title, Tags, Table, Status. Score is only visible when a row is expanded.

**Problem (Founder feedback):** "The score should be visible in the table. When someone checks in, I want to instantly see — is this a 92 or a 45? That tells me whether I need to personally greet them."

**Fix:** Add a Score column to the check-in table (after Name or before Status). Show the numeric score with the colored bar indicator, same as in Guest Intelligence.

#### CS3. Expanded row must show full Guest Intelligence insights, not just score + tags (P0)

**Current:** Expanding a row in the check-in table shows: Score (number with bar), Tags, and a "View Full Profile" link. That's it.

**Problem (Founder feedback):** "When I expand a row on check-in, I want to see the same full insights I get in Guest Intelligence — the AI-Generated Insights, the 'Why They Match' reasoning, talking points. Not just the score and tags." The event director at check-in time needs instant access to guest context for real-time conversations.

**Fix:** Match the expanded row content from Guest Intelligence: AI-Generated Insights, "Why They Match" reasoning, key talking points, and the "View Full Profile" link. The check-in expanded row is the most time-critical — the director needs this information in seconds as guests walk in.

#### CS4. VIP / CEO / Speaker indicators needed in check-in table (P1)

**Current:** No visual distinction between a VIP, a CEO, a speaker, or a regular guest in the check-in table.

**Problem (Founder feedback):** "I need to see at a glance if a VIP or CEO just checked in. A badge or icon — something that tells me 'drop everything and go greet this person.'"

**Fix:** Add role/status badges (VIP, Speaker, CEO, Sponsor) next to the guest name or as a column. Use the same badge style as implemented in the Seating sub-tab (where VIP badge already exists on some guests).

#### CS5. Column sorting needed on check-in table (P1)

**Current:** No column headers are clickable for sorting.

**Problem (Founder feedback):** "I should be able to sort by score, by time, by company. Basic table functionality."

**Fix:** Make all column headers clickable with sort indicators (ascending/descending arrows). Default sort: most recent check-in first.

### Sub-tab: Seating

#### CS6. Drag-and-drop for moving guests between tables (P0)

**Current:** No visible drag-and-drop capability. Guests are listed under tables but can't be moved by dragging.

**Problem (Founder feedback):** "The seating needs proper drag-and-drop like Notion or Trello. I should be able to grab a guest and drag them from Table 1 to Table 2, or from a table to the unassigned pool." Per MOOTS_VISION.md's seating example: "The director drags a guest from Table 3 to Table 1. The interface is immediate — drag and drop, the visual updates."

**Fix:** Implement drag-and-drop using a library like @dnd-kit or react-beautiful-dnd. Guests should be draggable between tables, from tables to the Unassigned pool, and from Unassigned to a table. Visual feedback during drag (ghost card, drop target highlighting).

#### CS7. Unassign guest from table must work (P0 — BUG)

**Current (Founder feedback):** "The unassign from table — taking someone off a table — doesn't work. Clicking the X to remove them from a table does nothing."

**Fix:** Debug the unassign/remove functionality. Clicking the "×" on a guest in a table should move them back to the Unassigned Guests pool. Verify the state update and re-render.

#### CS8. Clicking a guest name must open their profile (P0)

**Current:** Clicking a guest in the seating view shows only a small "×" to remove them. No profile panel, no guest details.

**Problem:** Same issue documented in Event 81 feedback. The event director arranging seating needs instant access to guest context.

**Fix:** Clicking a guest name in the seating view should open the same guest profile side panel used in Guest Intelligence.

#### CS9. VIP/Sponsor/Host visual indicators on seated guests (P1)

**Current:** Seating view now shows VIP badge on some guests (improvement from Event 81). But there's no distinction for sponsors, host team, or speakers.

**Fix:** Extend the badge system: VIP (already exists), Sponsor (with tier), Host Team (company color/icon), Speaker. These must be visible without clicking — the director needs at-a-glance table composition awareness.

### Sub-tab: Introductions

#### CS10. Introduction reasoning text references WRONG PEOPLE (P0 — BUG, PERSISTS FROM EVENT 81)

**Current:** The Introduction Pairings show two people (e.g., "Claudia Barretti ↔ Tyler Brooks") but the reasoning text below references completely different names (e.g., "Harrington's portfolio expertise complements Chen-Ramirez's fund mandate").

**Problem:** This is the same bug documented in FEEDBACK_Dashboard_Event81_CheckIn_Seating.md item #3. It remains unfixed. The names in the header and the names in the reasoning are completely disconnected. This makes the introductions useless and destroys trust.

**Fix:** The reasoning text MUST reference the actual people shown in the pairing card. This is likely a data mapping bug where AI-generated reasoning is being assigned to the wrong pairing, or the reasoning was generated for different people.

#### CS11. Introduction pairing names are too far apart (P1)

**Current (Founder feedback):** "The names in the introduction pairing — one is on the far left and one is on the far right. They should be closer together so you can read the pairing as a unit."

**Fix:** Place both names close together, centered or left-aligned as a pair: "Claudia Barretti ↔ Tyler Brooks" on one line or closely grouped. Not stretched across the full width of the card.

#### CS12. Introduction pairings must show job titles (P1)

**Current:** Pairings show only names. No job titles, no company.

**Problem (Founder feedback):** "I need to see the title and company right there. 'Claudia Barretti, Managing Director at Goldman Sachs ↔ Tyler Brooks, Partner at Sequoia' — that's what tells me whether this introduction matters."

**Fix:** Show Name, Title, and Company for each person in the pairing. Format: "Claudia Barretti · Managing Director, Goldman Sachs ↔ Tyler Brooks · Partner, Sequoia Capital"

#### CS13. "Facilitate" button meaning is unclear (P1)

**Current:** Each introduction pairing has a "Facilitate" button, but the icon and label don't clearly communicate what happens when you click it.

**Problem (Founder feedback):** "What does Facilitate do? The icon doesn't tell me. Does it send a message? Create a task? Log the introduction?"

**Fix:** Either: (a) add a tooltip explaining the action ("Mark this introduction as planned — you'll get a prompt when both guests check in"), or (b) rename to something clearer like "Plan Introduction" or "Remind Me." Show a brief confirmation of what happened after clicking.

#### CS14. Need ability to create manual introduction pairings (P2)

**Current (Founder feedback):** "I should be able to manually pair two people for an introduction — not just rely on AI suggestions. Sometimes I know connections the AI doesn't."

**Fix:** Add a "+ Create Pairing" button that lets the user select two guests from a dropdown/search and add a reason for the introduction. Manual pairings should appear alongside AI-suggested ones, visually distinguished (e.g., "Suggested by AI" vs. "Added by you").

#### CS15. Clicking names in introduction pairings must open guest profiles (P1)

**Current (Founder feedback):** "Clicking on a name in the introduction pairing should open their profile. Right now it does nothing."

**Fix:** Make guest names in introduction pairings clickable, opening the same guest profile side panel used throughout the platform.

---

## Tab 7: Follow-Up

### F1. Follow-Up tab is functional — minor polish needed (P2)

**Current:** The Follow-Up tab shows 14 total contacts with statuses (Pending, Sent, Opened, Replied, Meetings). AI-personalize checkbox, subject/content template fields, and "Generate Follow-ups for All Scored Contacts" button.

**Observations:**
- The funnel metrics at top (14 Total → 1 Pending → 4 Sent → 3 Opened → 3 Replied → 3 Meetings) are clear and useful.
- The contact list with individual statuses works well.
- The "AI-personalize" checkbox is a good touch.

**Minor improvements:**
- Show the guest's score and tags in the follow-up list (same consistency principle — the event director always needs context)
- The "Generate Follow-ups for All Scored Contacts" button should show agent activity: "Drafting personalized follow-ups for 14 contacts based on event interactions and conversation notes..."
- Consider sorting by priority: guests who opened but haven't replied should be at the top (highest ROI for follow-up effort)

---

## Tab 8: Analytics

### A1. Analytics is well-structured — needs agent interpretation layer (P2 / VISION)

**Current:** The Analytics tab shows:
- Summary cards: Guest Pool (200), AI Scored (72), Invited (20), Accepted (17), Checked In (16), Walk-ins (2), Follow-Ups (13), Meetings (3), Broadcasts (1)
- Event Funnel: Guest Pool 200 → Scored 72 (36%) → Invited 20 (28%) → Accepted 17 (85%) → Checked In 16 (94%) → Follow-Up 13 (81%) → Meetings 3 (23%)
- Score Distribution: 0-25 (2), 26-50 (22), 51-75 (26), 76-100 (22)
- Campaign Performance: Wave 1 — Top Partners & LPs (20 invited, 17 accepted, 2 declined, 85%)
- Team Performance: Empty ("Assign team members to guests and I'll track engagement and follow-through here.")

**What works:** The Event Funnel is clear and informative. Score Distribution gives a useful overview. Campaign Performance table is clean.

**What's missing (VISION):** Per MOOTS_VISION.md, the agent should interpret data, not just display it. The Analytics tab shows numbers but doesn't tell the event director what they mean or what to do about them.

**Fix — Add agent insights layer:**
- Below the funnel: "Your acceptance rate (85%) is strong. The 28% invite rate from scored contacts suggests you could expand invitations — 52 scored contacts weren't invited. Want me to recommend the next wave?"
- Below Score Distribution: "26 contacts scored 51-75 — these are borderline. If you have 3 remaining seats, I'd recommend Sarah K. (74), David L. (72), and Michael T. (71) based on sponsor alignment."
- Below Campaign Performance: "Wave 1 had an 85% acceptance rate — well above the 60% industry average. The 2 declines were both from hedge fund managers — consider a different approach for that segment next time."
- This transforms Analytics from "data display" to "agent-interpreted intelligence."

### A2. Export functionality — verify CSV export works (P2)

**Current:** There's a "CSV" dropdown and "Export" button in the top-right.

**Fix:** Verify the export actually produces a valid CSV with all visible data. If not, this is a bug.

---

## Vision Alignment Assessment

### What's Improved Since Event 81

1. **Check-in table** now has proper columns (Time in 12hr AM/PM, Name, Company, Title, Tags, Table, Status) — major improvement
2. **Tags overflow** uses "+1" pattern in check-in — good, needs to be applied everywhere
3. **"Not Yet Arrived"** section exists — good, but needs to be moved to the top
4. **Seating** now shows title + company under names — improvement
5. **"Manage Tables"** button exists in seating — new functionality
6. **VIP badge** appears on some seated guests — new
7. **Briefing sub-tabs** filter correctly (fixed from Event 80)
8. **Seating no longer crashes** (JS error from Event 80 is fixed)

### Biggest Gaps vs. MOOTS_VISION.md

1. **The Conversational Interface** — "Ask Moots" is a support-style floating button, not a persistent collaborator. This is the single biggest gap. The vision calls for a persistent panel that feels like a colleague, not a chatbot you have to summon.

2. **Agent Visibility** — The agent's work is largely invisible. No "thinking" animations, no progressive status updates, no "while you were away" summaries. The platform still feels like a static dashboard that shows results, not an agent you watch working.

3. **The Agent Loop** — The propose → decide → respond → learn cycle doesn't exist yet. The seating "AI Suggest" generates a layout but doesn't engage when the user makes changes. There's no "You moved James to Table 1 — here are the implications" response.

4. **Auto-scoring** — The user still has to press a button to trigger AI scoring. The agent should score autonomously when context changes.

5. **Introduction reasoning bug** — Persists from Event 81. Severely undermines trust in AI capabilities.

---

## Priority Order for Claude Code

### Do First (P0 Bugs)
1. CS10 — Fix introduction reasoning name mismatch (PERSISTS from Event 81)
2. B1 — Fix briefing "View" returning "Briefing not available"
3. CS7 — Fix unassign guest from table (X button not working)

### Do Next (P0 UX Critical)
4. G1 — Transform "Ask Moots" into persistent chat panel
5. CS1 — Move "Not Yet Arrived" above "Recent Check-ins"
6. O1 — Side-by-side layout for Agent Activity + Recent Activity
7. OB1 — Move "Add Objective" button to top
8. OB2 — Per-objective Save buttons
9. GI1 — Auto-score contacts (remove manual "Score All" button as primary CTA)
10. GI4 — Match Pending Review table format to All Contacts
11. CS3 — Full insights in check-in expanded rows
12. CS6 — Drag-and-drop in seating
13. CS8 — Clickable guest names in seating → profile panel

### Then (P1 Design & Consistency)
14. CS2 — Score visible in check-in table
15. CS4 — VIP/CEO/Speaker badges in check-in
16. CS5 — Column sorting in check-in
17. CS9 — Full badge system in seating (Sponsor, Host, Speaker)
18. CS11 — Introduction names closer together
19. CS12 — Job titles in introduction pairings
20. CS13 — Clarify "Facilitate" button
21. CS15 — Clickable names in introductions → profile
22. GI2 — Natural language input for Guest Intelligence
23. GI3 — Tags "+N" overflow pattern everywhere
24. O2 — Guest Pool card format consistency
25. O3 — Vary Recent Activity timestamps

### Finally (P2 Enhancements & Vision)
26. G2 — Agent personality in all empty states
27. OB3 — AI clarifying questions on objectives
28. B2 — Agent "thinking" state for briefing generation
29. CS14 — Manual introduction pairings
30. F1 — Follow-up polish (scores, priority sorting, agent activity)
31. A1 — Agent interpretation layer in Analytics
32. A2 — Verify CSV export

---

## Issue Index

| # | Tab | Priority | Issue | Type |
|---|-----|----------|-------|------|
| G1 | Global | P0/VISION | Ask Moots → persistent chat panel | Architecture |
| G2 | Global | P1/VISION | Agent personality in empty states | Design |
| O1 | Overview | P0 | Agent + Recent Activity side-by-side | Layout |
| O2 | Overview | P1 | Guest Pool card format inconsistency | Design |
| O3 | Overview | P1 | Recent Activity timestamps all identical | Data |
| OB1 | Objectives | P0 | Add Objective button at bottom → move to top | UX |
| OB2 | Objectives | P0 | No per-objective Save button | UX |
| OB3 | Objectives | P2/VISION | AI should ask clarifying questions | Enhancement |
| GI1 | Guest Intelligence | P0/VISION | Manual "Score All" → auto-score | Architecture |
| GI2 | Guest Intelligence | P1/VISION | Natural language input for filtering | Enhancement |
| GI3 | Guest Intelligence | P1 | Tags overflow → "+N" pattern | Design |
| GI4 | Guest Intelligence | P0 | Pending Review card layout → table | Consistency |
| C1 | Campaigns | P1/VISION | Empty state needs agent personality | Design |
| B1 | Briefings | P0 | "View" returns "Briefing not available" | Bug |
| B2 | Briefings | P2/VISION | Agent "thinking" state for generation | Enhancement |
| CS1 | Check-in | P0 | "Not Yet Arrived" must be above check-ins | Layout |
| CS2 | Check-in | P1 | Score not visible in table | Design |
| CS3 | Check-in | P0 | Expanded row missing full insights | Consistency |
| CS4 | Check-in | P1 | No VIP/CEO/Speaker badges | Design |
| CS5 | Check-in | P1 | No column sorting | Feature |
| CS6 | Seating | P0 | No drag-and-drop between tables | Feature |
| CS7 | Seating | P0 | Unassign guest (X) doesn't work | Bug |
| CS8 | Seating | P0 | Clicking guest doesn't open profile | Feature |
| CS9 | Seating | P1 | Missing Sponsor/Host/Speaker badges | Design |
| CS10 | Introductions | P0 | Reasoning references wrong people (PERSISTS) | Bug |
| CS11 | Introductions | P1 | Names too far apart in pairings | Layout |
| CS12 | Introductions | P1 | Missing job titles in pairings | Design |
| CS13 | Introductions | P1 | "Facilitate" button unclear | UX |
| CS14 | Introductions | P2 | No manual pairing creation | Feature |
| CS15 | Introductions | P1 | Names not clickable → profile | Feature |
| F1 | Follow-Up | P2 | Minor polish (scores, sorting, agent activity) | Enhancement |
| A1 | Analytics | P2/VISION | No agent interpretation of data | Enhancement |
| A2 | Analytics | P2 | Verify CSV export | QA |

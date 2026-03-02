# Platform Review — Round 2 Fixes

Comprehensive feedback from product review of the latest build. Covers team member UX, navigation fixes, table sorting, assignment dropdown bugs, invitation campaigns, briefings content, guest profile drawer layout, and guest role diversity for demo readiness.

---

## 1. TEAM MEMBERS: Move Out of Global Header, Into Event-Level UX

**Current state**: Team member avatars (TU, SC, MR, JP) appear in the top-right corner of the global header, next to the settings gear icon. This feels wrong — team members are event-scoped, not global/project-scoped.

**What to change**:

### A. Remove team member avatars from the global header
The global header (top nav) should only show: the Moots logo, Events link, People link, Settings gear, and the current user's avatar. Team members are attached to a specific event — they should not live in the global navigation.

### B. Create a Team Members panel/view within the event
When the user is inside an event dashboard, there should be a clear, convenient way to access the team members for that event. Options (pick the one that fits the current layout best):

**Recommended approach — a "Team" button in the event header area** (near "Edit Event") that opens a slide-out panel or modal:
- Click "Team" → panel slides in from the right (similar to the Guest Profile drawer)
- Shows each team member as a card:
  - Avatar, first name, last name
  - Role/position (Event Lead, Guest Relations, Operations)
  - Number of guests assigned to them
  - List of assigned guests (clickable names that open Guest Profile drawer)
- Should also allow adding/removing team members from the event
- The team member name (e.g., "Sarah Chen") should be clickable everywhere it appears — in this panel, in the Assigned To column, in the Guest Profile drawer — and should always navigate to/open this team view filtered to that person's assignments

### C. Team members count toward event capacity
Team members attend the event too. In the current data: 20 seat capacity, 17 confirmed guests + 3 team members (Sarah Chen, Marcus Rivera, Julia Park) = 20 total people at the event. The capacity calculation and check-in stats should account for this. For the demo, the team members should also appear in the check-in list with a special "Team" badge/role, so the presenter can show: "Here's our full room — 17 guests plus our 3-person team, all 20 seats filled."

### D. Add team members as checked-in guests
For the demo narrative, the 3 team members should appear in the check-in table with:
- Sarah Chen — Event Lead — Role: "Team" — Status: Checked In — Time: 6:30 PM (arrived early to set up)
- Marcus Rivera — Guest Relations — Role: "Team" — Status: Checked In — Time: 6:30 PM
- Julia Park — Operations — Role: "Team" — Status: Checked In — Time: 6:15 PM (earliest, coordinating with venue)

This makes the capacity math work: Expected 20 (17 guests + 3 team), Present 22 (17 guests + 2 walk-ins + 3 team). Update the stat cards accordingly.

---

## 2. OVERVIEW: Remove "130 Contacts Awaiting Scoring" from Needs Attention

**Current state**: The "Needs Attention" section shows "130 contacts are waiting to be scored. I'll match them against your targeting criteria — takes about 2 minutes. → Score them now →"

**Problem**: Scoring should be fully automatic. The AI should run scoring in the background whenever new contacts are added or targeting criteria change. The user should never be asked to manually trigger scoring — that's the whole point of an AI-first platform.

**Fix**: Remove this row from "Needs Attention" entirely. If there are unscored contacts, score them automatically in the background. The "Needs Attention" section should only surface things that genuinely require human judgment (e.g., "1 invited guest hasn't responded" or "2 over event capacity").

If you want to keep some indicator that scoring happened, put a subtle status message elsewhere (e.g., in the Guest Intelligence stat cards: "72 scored · 130 pending" with an auto-progress indicator), but do NOT put it in "Needs Attention" as an action item.

---

## 3. TARGETING: Fix URL Route

**Current state**: The Targeting tab label says "Targeting" but the URL is `/dashboard/86/objectives`.

**Fix**: Change the route from `/objectives` to `/targeting` to match the renamed tab. Keep a redirect from `/objectives` → `/targeting` for backward compatibility.

---

## 4. GUEST INTELLIGENCE: Rename "Objectives" Button to "Targeting"

**Current state**: On the Guest Intelligence page, the action buttons in the top right show: `Add Guests ▾` | `Objectives` | `Re-score All`

**Fix**: Rename the `Objectives` button to `Targeting`. This button should link to the Targeting tab where users define their criteria — the label should match the tab name.

---

## 5. GUEST INTELLIGENCE TABLE: Add Team Member Rows & Guest Role Diversity

### A. Team members should appear in Guest Intelligence
The 3 team members (Sarah Chen, Marcus Rivera, Julia Park) are part of the event. They should have contact profiles in the People Database and appear in Guest Intelligence with:
- A "Team" role tag to distinguish them from guests
- No AI score (or a special designation) — they're not being evaluated as guests
- They should count toward the event capacity

### B. Add role diversity for the demo
Among the 20 people who would be seated (the confirmed guests), the demo story needs variety in roles. Currently most guests are PE/VC professionals. For a compelling demo, ensure the guest list includes:
- **1 guest tagged as "Speaker"** — someone who is presenting or giving remarks at the dinner (e.g., James Harrington from Blackstone could be the keynote speaker for the evening, sharing market outlook)
- **1 guest tagged as "Partner"** — a strategic partner of Meridian Capital (e.g., this could be a co-host or sponsor representative — Martin Cross from Deloitte could be the event sponsor partner)

These should appear as Role values in the Guest Intelligence and Check-in tables, alongside the existing LP, GP, Advisor, etc. roles.

---

## 6. INVITATIONS: Build the Page with Seed Campaign Data

**Current state**: The Invitations tab (`/dashboard/86/campaigns`) exists but shows an empty state: "I'm ready to build your first invitation campaign." No campaigns were created despite the seed data prompt requesting 2 campaigns.

**Fix**: The invitation campaigns MUST be created with real data. This is critical for the demo — the presenter needs to show how guests were invited and what their response rates look like.

### Campaign 1: "Q2 Executive Dinner — Founding Table"
- **Status**: Completed
- **Sent date**: March 20, 2026
- **Channel**: Email
- **Recipients**: 12 contacts (the highest-priority guests)
  - 10 Accepted, 1 Declined (David Nakamura), 1 No Response (Robert Kensington)
- **Response rate**: 83%
- Each invitation should show: recipient name, company, send date, open date, response status, response date
- The campaign detail view should show aggregate stats (sent, opened, responded, accepted, declined)

### Campaign 2: "Q2 Executive Dinner — Extended Circle"
- **Status**: Completed
- **Sent date**: March 28, 2026
- **Channel**: Email
- **Recipients**: 10 contacts (second wave to fill remaining seats)
  - 7 Accepted, 2 Declined (Victoria Langley, Sarah Worthington), 1 Pending (Dahlia Rosenberg)
- **Response rate**: 70%

If the invitation campaign feature is not fully built (i.e., the UI only shows an empty state and a "New Invitation Campaign" button with no way to create/display campaign data), then **build the campaign list view and detail view** with at minimum:
- A list of campaigns with name, status, date, recipient count, response rate
- A detail view per campaign showing the recipient table with statuses
- This is a core feature of the platform and cannot be empty for the demo

Also: the URL should be `/dashboard/86/invitations` not `/dashboard/86/campaigns` — update the route to match the renamed tab, with a redirect from `/campaigns` for backward compatibility.

---

## 7. BRIEFINGS: Fix Content and Team Member Association

**Current state**: The Briefings tab now exists with 3 briefings (End-of-Day, Pre-Event, Morning-of), which is great. But:
1. All 3 say "For: Test User" — should be for specific team members
2. Clicking "View" shows "Briefing not available" — no actual content

**Fix**:

### A. Associate briefings with team members
Each briefing should be generated for a specific team member based on their assigned guests:

- **Pre-Event Briefing — For: Sarah Chen** (8 guests) — Covers her VIP LP guests: Patricia Donovan, Philip Wainwright, Walter Edmonds, Andrew Sterling, Yuki Tanaka. Includes AI talking points, relationship context, and strategic objectives per guest.
- **Morning-of Briefing — For: Marcus Rivera** (5 guests) — Covers his door/check-in responsibilities: James Harrington, Gregory Mansfield, Lisa Chang, Diana Okonkwo, Eleanor Blackwood. Includes arrival logistics, walk-in protocol, seating notes.
- **End-of-Day Briefing — For: Julia Park** (5 guests) — Covers operations wrap-up: Louise Hensley, Oliver Pennington, Martin Cross, Fiona O'Malley, Brian Callahan. Includes follow-up action items, notable conversations, key takeaways.

### B. Populate actual briefing content
Each briefing should have real, viewable content when clicking "View". The content should be structured as:
- **Header**: Briefing title, date, team member name
- **Guest-by-guest sections**: For each assigned guest, show:
  - Name, company, title
  - AI-generated talking points (same as in Guest Profile drawer)
  - Key relationship context (why they matter to Meridian)
  - Conversation starters / topics to cover
  - Any warnings or notes (e.g., "Declined Fund III — sensitive topic")
- **Summary section**: Overall event objectives, key outcomes to aim for

This is essential demo content — the briefings are one of the most impressive AI features of the platform and they need to actually work.

---

## 8. CHECK-IN TABLE: Fix Sorting on All Columns

**Current state**: On the Check-in sub-tab, only Name, Company, and Time columns are sortable. Clicking Title, Role, Priority, Assigned To, or Status column headers does nothing.

**Fix**: Enable sorting on ALL columns in the Check-in table:
- **Title** — alphabetical sort
- **Role** — alphabetical sort (LP, GP, Advisor, Team, etc.)
- **Priority** — sort by priority level (VIP → High → Standard)
- **Tags** — alphabetical sort by first tag
- **Assigned To** — alphabetical sort by team member name, with unassigned ("—") at the bottom
- **Status** — sort by status (Checked In, Walk-in, Not Arrived)
- **Time** — chronological sort (already works)

This sorting must work on ALL sub-tabs (All, Not Arrived, Checked In, Walk-ins), not just the main "All" tab.

---

## 9. CHECK-IN TABLE: Fix "Assigned To" Inline Dropdown

**Current state**: Clicking the "—" in the Assigned To column for unassigned guests shows a tooltip: "No team members added yet". This is wrong — team members DO exist (Sarah Chen, Marcus Rivera, Julia Park are already assigned to other guests and appear in the header).

**Fix**: Clicking any Assigned To cell (whether "—" or a team member name) should open an inline dropdown showing:
- All team members attached to this event (Sarah Chen, Marcus Rivera, Julia Park)
- A "None" option to unassign
- The currently assigned team member should be highlighted/checked

This must work across ALL sub-tabs (All, Not Arrived, Checked In, Walk-ins). The same fix should apply to:
- The three-dot menu → "Assign to Team Member" action
- The bulk action "Assign to Team Member" dropdown when multiple guests are selected

The root cause is likely that the inline dropdown is looking for team members in the wrong data source, or the team members are stored at a project/account level but the dropdown is querying event-level team members.

---

## 10. GUEST PROFILE DRAWER: Reorder Sections — Team Assignment Higher

**Current state**: The Guest Profile drawer (slide-in from right when clicking a guest name) shows sections in this order:
1. Header (name, company, score)
2. Event Journey (source, enrichment, score, invitation)
3. Tags
4. AI Summary
5. Why They Match
6. Talking Points
7. Criteria Match
8. (Team Assignment appears to be missing or at the very bottom, not reachable by scrolling)

**Problem**: Team Assignment is either missing from the drawer entirely, or buried so far down that you can't scroll to it. The user wants to see who's handling this guest immediately — not after scrolling through AI content.

**Fix**: Restructure the drawer section order to:
1. **Header** (name, company, title, score, avatar)
2. **Event Journey** (source, enrichment, score, invitation status)
3. **Team Assignment** ← MOVE UP to position 3
   - Show: assigned team member name (clickable → opens team panel), role
   - The team member name should NOT have the job title label pushed to the far right — keep name and role together, left-aligned, easy to read
   - If unassigned, show "Assign →" button inline
4. **Tags**
5. **AI Summary**
6. **Why They Match**
7. **Talking Points**
8. **Criteria Match**

### Team member name should be clickable
Wherever a team member name appears (in the drawer, in the table, in briefings), clicking it should navigate to or open a view showing:
- The team member's profile (name, role, position)
- All guests assigned to them
- This could be the same Team panel from Fix #1, filtered to that specific team member

---

## PRIORITY ORDER

1. **Fix Assigned To dropdown** (#9) — this is a functional bug that blocks testing
2. **Fix table sorting** (#8) — broken sorting feels unpolished
3. **Move team members out of global header** (#1A, #1B) — wrong placement
4. **Reorder Guest Profile drawer** (#10) — team assignment should be visible immediately
5. **Build invitation campaigns** (#6) — critical empty page for demo
6. **Fix briefings content** (#7) — "Briefing not available" blocks demo
7. **Add team members to check-in + capacity** (#1C, #1D) — demo narrative completeness
8. **Add role diversity** (#5B) — Speaker and Partner roles for demo
9. **Remove scoring from Needs Attention** (#2) — wrong UX pattern
10. **Fix Targeting URL** (#3) — `/objectives` → `/targeting`
11. **Rename Objectives button** (#4) — terminology consistency

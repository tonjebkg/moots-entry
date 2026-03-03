# Feature Spec: Activity Log Tab

## Purpose

When multiple team members work on an event — adding guests, moving people between stages, editing profiles, checking people in at the door — the team needs a single place to answer: "What happened, when, and who did it?" This is critical for accountability, debugging issues, and keeping everyone on the same page.

---

## Tab Placement

Add "Activity Log" as a new tab in the event dashboard navigation, placed after Analytics. It sits outside the PRE-EVENT / EVENT DAY / POST-EVENT groupings because it spans the entire event lifecycle — from earliest planning through post-event follow-up.

Tab order: Overview | Context | Targeting | Guest Intelligence | Invitations | Briefings | Check-in & Seating | Follow-Up | Analytics | Activity Log

---

## Data Model — What Gets Logged

Every mutation (create, update, delete) to event data generates a log entry with these fields:

| Field | Description |
|-------|-------------|
| **Timestamp** | Exact date/time of the action (e.g., "Mar 3, 2026 2:47 PM") |
| **Actor** | Who performed the action — team member name, or staff member name (for door staff) |
| **Action Type** | Category of action (see Action Types below) |
| **Description** | Human-readable description of what changed |
| **Target** | The entity affected (guest name, campaign name, etc.) — clickable to navigate to that entity |
| **Tab/Area** | Which part of the platform the action was performed in |

---

## Action Types (for filtering)

| Action Type | Examples |
|-------------|----------|
| **Guest Added** | "Added Patricia Donovan to guest pool", "Walk-in: Yuki Tanaka registered at door" |
| **Guest Updated** | "Updated role for James Harrington to Speaker", "Changed priority for Eleanor Blackwood to High" |
| **Guest Moved** | "Moved Charles Montgomery from Qualified → Selected", "Moved 5 guests to Selected" |
| **Check-in** | "Checked in Walter Edmonds", "Bulk check-in: 3 guests checked in", "Marked David Nakamura as No-Show" |
| **Invitation** | "Sent Founding Table campaign to 12 recipients", "Elizabeth Waverly accepted invitation" |
| **Scoring** | "Re-scored all guests", "Score updated for Oliver Pennington: 72 → 78" |
| **Targeting** | "Added targeting criterion: C-suite tech leaders (weight 2)", "Updated criterion weight" |
| **Team** | "Assigned Marcus Rivera to Eleanor Blackwood", "Added Julia Park as team member" |
| **Note** | "Added note on Sofia Chen-Ramirez", "Updated event notes for Walter Edmonds" |
| **Briefing** | "Generated Pre-Event Briefing for Sarah Chen", "Viewed Morning Briefing" |
| **Follow-Up** | "Sent follow-up email to Patricia Donovan", "Marked follow-up as Complete for Philip Wainwright" |
| **Profile** | "Updated contact info for Brian Callahan", "Edited company for Lisa Chang" |
| **Settings** | "Updated event capacity to 20 seats", "Changed event time to 7:00 PM" |
| **AI Action** | "Moots Intelligence auto-scored 45 contacts", "AI generated briefing for Marcus Rivera" |

---

## UI Layout

### Filter Bar (top of page)

- **Team Member filter**: Dropdown to filter by actor — "All Team Members", individual team member names, or staff names from door check-in. Show avatar next to name.
- **Action Type filter**: Multi-select dropdown with the action types listed above. Can select one or multiple.
- **Date range filter**: Date picker for from/to range, plus quick presets: "Today", "Last 7 days", "Last 30 days", "All time"
- **Search**: Free text search across descriptions (e.g., search "Eleanor" to find all actions involving Eleanor Blackwood)

### Log Feed (main content)

Reverse-chronological list of log entries. Each entry is a single row:

```
[Avatar] [Actor Name]  [Action description with clickable target]  [Timestamp]
                        [Action Type badge]  [Tab/Area badge]
```

**Visual design**:
- Each entry is a single line or two-line card with subtle separator
- Actor avatar (small circle with initials, same as used elsewhere) on the left
- Action Type shown as a small colored badge/pill:
  - Guest Added: green
  - Check-in: terracotta (#B05C3B)
  - Invitation: blue
  - Scoring: amber
  - AI Action: purple (with the Moots AI sparkle icon)
- Timestamps shown as relative time ("2 hours ago", "Yesterday at 3:15 PM") with full timestamp on hover
- Target names (guest names, campaign names) are **clickable** — clicking a guest name opens their Guest Profile drawer, clicking a campaign navigates to Invitations

**Grouping**: Entries are grouped by day with a date header: "Today", "Yesterday", "March 1, 2026", etc.

**Bulk actions in the log**: When someone performs a bulk action (e.g., "Check in 5 guests"), show it as ONE log entry with an expandable detail: "Marcus Rivera checked in 5 guests" → expand to see the 5 names.

---

## Staff at the Door — Identity Without Login

When a staff member accesses the **Staff Check-in Link** (the separate check-in interface for door staff), they need to identify themselves before they can see the guest list or perform any check-ins. This is not a full login — it's a lightweight identity step.

### Staff Identification Flow

1. Staff member opens the Staff Check-in Link URL (shared by the Event Lead)
2. **Before seeing anything**, they see a simple screen:

```
┌─────────────────────────────────────┐
│                                     │
│   Meridian Capital Partners         │
│   Q2 Executive Dinner              │
│                                     │
│   Welcome, team. Please identify    │
│   yourself to begin check-in.       │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Your Name                   │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌──────────────────────────┐      │
│   │   Continue →             │      │
│   └──────────────────────────┘      │
│                                     │
│   Your actions will be logged       │
│   to the Activity Log.             │
│                                     │
└─────────────────────────────────────┘
```

3. Staff enters their name and taps "Continue"
4. Their name is stored in the browser session for the duration of their check-in shift
5. Every action they take (checking in a guest, adding a walk-in, marking no-show) is logged with their name as the actor
6. A small indicator at the top of the check-in screen shows: "Logged in as: [Name]" with a "Switch" link to change identity

**Why no phone verification for now**: Adding SMS verification adds complexity (Twilio integration, SMS costs, phone number collection) for minimal benefit at this stage. The door staff are trusted team members — entering a name is sufficient accountability. If needed later, phone verification can be added as an upgrade: enter name → enter phone → receive 4-digit code → verify. But start simple.

**Matching to team members**: If the name entered matches an existing team member (fuzzy match), link to that team member's profile. If not (e.g., a temp staff member), create a "staff" actor entry for logging purposes only.

---

## Connection to Moots Intelligence

The Activity Log and the AI are deeply connected:

1. **Every AI action is logged**: When the AI checks someone in, adds a note, or generates a briefing, it appears in the Activity Log as an "AI Action" with the requesting team member attributed
2. **The AI can query the Activity Log**: "What did Marcus do during check-in?" → AI reads the log and summarizes
3. **Messaging actions are logged**: When Marcus checks someone in via Telegram, it appears as "Marcus Rivera (via Telegram) checked in Walter Edmonds"
4. **Staff door actions are logged**: When door staff "Alex" checks someone in via the Staff Check-in Link, it appears as "Alex (Door Staff) checked in Eleanor Blackwood"
5. **The AI learns from the log**: Over time, the Activity Log feeds into the AI's organizational memory — understanding team patterns, event rhythms, and operational efficiency

---

## Design System Notes

- Follow the same layout pattern as other tabs — title + subtitle at top, content below
- Use the cream background (#FAF8F5)
- Log entries should feel clean and scannable, similar to a Slack activity feed or GitHub commit history
- Action Type badges use the brand palette: terracotta for check-in, forest green for team, etc.
- The filter bar should be sticky (same z-index pattern as table headers: z-20)

---

## Seed Data for Activity Log

For the demo, pre-populate the Activity Log with realistic entries that tell the event's story chronologically:

### 2 weeks before event (early March)
- Sarah Chen created the event "Meridian Capital Partners — Q2 Executive Dinner"
- Sarah Chen set event capacity to 20 seats
- Sarah Chen added 3 targeting criteria
- Sarah Chen imported 200+ contacts to guest pool
- (AI Action) Moots Intelligence scored 72 contacts
- Sarah Chen moved 44 qualified contacts to review
- Sarah Chen selected 22 contacts for invitation

### 10 days before event
- Sarah Chen created Founding Table invitation campaign
- Sarah Chen sent Founding Table campaign to 12 recipients
- Charles Montgomery accepted invitation
- Elizabeth Waverly accepted invitation
- (more acceptances trickle in)
- David Nakamura declined invitation
- Sarah Chen created Extended Circle invitation campaign
- Sarah Chen sent Extended Circle campaign to 10 recipients
- (more acceptances and declines)

### 1 week before event
- Sarah Chen assigned 8 guests to herself
- Sarah Chen assigned 6 guests to Marcus Rivera
- Sarah Chen assigned 5 guests to Julia Park
- (AI Action) Moots Intelligence generated Pre-Event Briefing for Sarah Chen
- (AI Action) Moots Intelligence generated Morning-of Briefing for Marcus Rivera
- (AI Action) Moots Intelligence generated End-of-Day Briefing for Julia Park
- Julia Park viewed Pre-Event Briefing
- Marcus Rivera added a note on Eleanor Blackwood: "Prefers to be seated away from competing fund managers"

### Event day (April 17)
- Marcus Rivera checked in Walter Edmonds (8:10 PM)
- Julia Park checked in Fiona O'Malley (8:12 PM)
- Julia Park checked in Oliver Pennington (8:13 PM)
- Marcus Rivera checked in Eleanor Blackwood (8:15 PM)
- ... (all check-ins in chronological order per seed data)
- Marcus Rivera registered walk-in Yuki Tanaka
- Julia Park registered walk-in Gregory Mansfield
- Marcus Rivera added a note on Yuki Tanaka: "Came with Charles Montgomery, interested in Fund IV co-investment"

### Post-event
- Sarah Chen sent follow-up email to 14 attendees
- (AI Action) Moots Intelligence generated post-event summary
- Sarah Chen marked follow-up as "Meeting Booked" for Charles Montgomery

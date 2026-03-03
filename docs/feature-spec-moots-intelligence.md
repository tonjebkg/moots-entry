# Feature Spec: Moots Intelligence — The AI-Native Event Platform

## The Core Idea

Moots Intelligence is not a chatbot bolted onto a dashboard. It is the **central nervous system** of the entire platform. It lives everywhere — inside every event tab, on the Events list, on the People database, and on team members' phones via WhatsApp and Telegram. Behind the scenes, the infrastructure is built from the ground up for AI agent collaboration: structured data, clear context boundaries, and a unified knowledge layer that lets AI agents see patterns, spot opportunities, and make suggestions that only an intelligence system with access to ALL the data — across all events, all contacts, all history — can make.

The proof that AI can really help users is when it helps them **before they even think they need help**.

---

## The Vision: What OpenClaw Got Right

OpenClaw (https://openclaw.ai/) became the fastest-growing open-source project in GitHub history (247K stars in weeks) by making AI feel like texting a hyper-capable colleague. You message it from WhatsApp or Telegram and it just does it.

Key UX insights from OpenClaw that apply to Moots:

1. **Messaging-first interface**: Interaction in channels people already use. No new app to learn.
2. **Context persistence**: Remembers everything. You don't re-explain context.
3. **Proactive behavior**: A heartbeat scheduler surfaces things you should know — without being asked.
4. **Natural language actions**: "Move Charles to Selected" works as well as clicking through menus.
5. **Skills architecture**: Modular capabilities the AI matches to requests.

---

## What Moots Intelligence Should Become

Moots Intelligence is NOT a general-purpose assistant. It is a **domain-expert AI co-pilot** with deep, structured knowledge about everything in the platform: every event, every guest, every score, every invitation, every check-in, every follow-up, every contact in the People database, every historical interaction across all events.

This is MORE powerful than OpenClaw for events because:
- OpenClaw has broad but shallow knowledge (can do anything but knows nothing deeply)
- Moots Intelligence has narrow but infinitely deep knowledge (knows EVERYTHING about your events, your people, your relationships, and your history)

---

## WHERE MOOTS INTELLIGENCE LIVES — Everywhere

Moots Intelligence is NOT limited to event tabs. It is a platform-wide AI that appears in every context, with its knowledge and suggestions adapting to where the user is.

### 1. Inside Every Event Tab (existing — upgrade)

The chat bar at the bottom of each event tab (Overview, Context, Targeting, Guest Intelligence, Invitations, Briefings, Check-in, Follow-Up, Analytics, Activity Log). Suggested prompts are hyper-contextual to the specific tab AND the specific event's data state.

### 2. On the Events List Page (new)

When the user is on the main Events page (viewing all their events), Moots Intelligence has access to ALL events and can reason across them:

**Events page prompts**:
- "Which of my upcoming events needs the most attention right now?"
- "Compare acceptance rates across my last 3 dinners — what's working?"
- "I have 2 events next month — are there guest overlaps I should coordinate?"
- "Show me contacts who declined the Q1 dinner but might be good for Q2"

**Cross-event intelligence examples**:
- "Charles Montgomery has attended 3 of your last 4 events. His engagement is increasing — consider elevating him to Founding Table for next quarter."
- "Your Tuesday events average 15% lower attendance than Thursday events. Consider shifting the May dinner."
- "6 contacts from the Q1 Extended Circle have since been promoted to C-suite. They may now qualify for Founding Table criteria."

### 3. On the People Database (new)

When the user is on the People tab (the global contact database across all events), Moots Intelligence can reason about the entire relationship graph:

**People page prompts**:
- "Who are my most engaged contacts across all events?"
- "Which contacts haven't been invited to anything in 6 months?"
- "Find contacts who match the Meridian Q2 targeting criteria but aren't in the guest pool yet"
- "Show me relationship clusters — who knows who?"

**People intelligence examples**:
- "Eleanor Blackwood and Charles Montgomery were seated at the same table at 2 events and both had positive follow-ups. Consider pairing them again."
- "You have 47 contacts tagged 'LP' who've never been invited to anything. Want me to score them against your most common targeting criteria?"
- "Oliver Pennington's company Evercore just acquired a $2B advisory practice. His profile may need updating — and his relevance to Fund IV advisory relationships just increased."

### 4. On Individual Contact Profiles (new)

When viewing a specific contact's profile in the People database, Moots Intelligence knows everything about that person across all events:

**Contact profile prompts**:
- "Summarize my entire relationship with Eleanor Blackwood"
- "What events has she attended, and what were the outcomes?"
- "Draft a personalized re-engagement email based on our history"
- "Who in my network knows Eleanor? Find connections."

### 5. Via Messaging Platforms (WhatsApp, Telegram — new)

Team members can chat with Moots Intelligence from their phone, accessing the FULL platform context — not just one event but all events, all people, all history. This is the always-available co-pilot.

### 6. Global Search / Command Bar (future)

A Spotlight/Command-K style interface accessible from anywhere in the platform: type a question or command and Moots Intelligence responds. This becomes the power-user's fastest path to any information or action.

---

## THE AI-NATIVE INFRASTRUCTURE — Built for Agent Collaboration

This is the most important section. The user-facing chat interface is just the tip of the iceberg. What makes Moots truly AI-native is the infrastructure behind the scenes — a data and context layer specifically designed for AI agents to collaborate, reason, and act.

### Design Principle: Structure Everything for AI Comprehension

Every piece of data in Moots should be stored and organized so that an AI agent can:
1. **Understand it** — clear schemas, typed fields, explicit relationships
2. **Query it** — structured access patterns, not just free text search
3. **Reason about it** — enough context to make inferences and connections
4. **Act on it** — clear mutation paths with validation and logging

### The Unified Knowledge Graph

Behind every AI interaction, Moots Intelligence accesses a unified knowledge graph that connects:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CONTACTS   │────▶│   EVENTS    │────▶│  CAMPAIGNS   │
│  (People DB)│     │  (all events)│     │ (invitations)│
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ INTERACTIONS│     │  CHECK-INS  │     │  FOLLOW-UPS  │
│ (history)   │     │  (presence) │     │  (outcomes)  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                    │
       └───────────────────┼────────────────────┘
                           ▼
                   ┌──────────────┐
                   │    NOTES     │
                   │ (event-scoped│
                   │  + global)   │
                   └──────┬───────┘
                          ▼
                   ┌──────────────┐
                   │  AI MEMORY   │
                   │ (learnings,  │
                   │  patterns,   │
                   │  preferences)│
                   └──────────────┘
```

**What the AI agent can traverse**:
- Given a contact → all events they attended, all scores, all notes, all follow-ups, all team interactions, all invitation responses across all time
- Given an event → all contacts involved, their roles, their journey through the funnel, their check-in data, their follow-up status
- Given a targeting criterion → all contacts who match across all events, how those matches performed historically, which criteria predict the best outcomes
- Given a team member → all their assignments, their performance patterns, which guest types they work best with

### Agent Context Layers

When Moots Intelligence receives any query (from dashboard, messaging, or proactive heartbeat), it assembles context from multiple layers:

**Layer 1 — Immediate Context** (what's on screen):
- Current tab/page
- Current event (if viewing an event)
- Current contact (if viewing a profile)
- Recent user actions

**Layer 2 — Event Context** (the specific event):
- Full guest list with scores, statuses, roles
- Campaign data with response rates
- Check-in state
- Team assignments and notes
- Follow-up pipeline
- Targeting criteria and weights

**Layer 3 — Organizational Context** (cross-event):
- All events (past, current, upcoming)
- Full People database with relationship history
- Cross-event attendance patterns
- Historical campaign performance
- Team performance across events
- Aggregate metrics and benchmarks

**Layer 4 — Learned Context** (AI memory):
- User preferences (briefing format, communication style)
- Event type patterns (dinner vs. conference vs. workshop)
- Industry-specific knowledge accumulated over time
- Relationship insights (who connects well with whom)
- Outcome patterns (what predicts successful follow-ups)

### Proactive Intelligence — AI That Helps Before You Ask

The most powerful capability isn't answering questions — it's surfacing insights users haven't thought to ask about. This is where AI agents with access to the full data graph can do things humans simply cannot:

**Cross-event pattern detection**:
- "3 contacts who declined your Q1 dinner just changed jobs to companies that match your Fund IV criteria. Worth re-inviting?"
- "Your acceptance rate drops 40% when you send campaigns on Fridays vs. Tuesdays. Consider scheduling the Extended Circle campaign for Tuesday."
- "Events at The NoMad have 22% higher check-in rates than events at other venues for your guest profile. Venue is working well."

**Relationship opportunity spotting**:
- "Patricia Donovan and Brian Callahan both invested in HealthTech startups this quarter. They've never been seated together — this could be a high-value introduction."
- "You have 12 contacts who work at companies that just announced quarterly earnings above estimates. Their disposition to attend events may be higher right now."

**Risk alerts**:
- "Elizabeth Waverly hasn't responded to the last 2 follow-up emails. Engagement may be declining — consider a different approach."
- "2 of your confirmed guests (Andrew Sterling and Diana Okonkwo) work at firms currently in a competitive dispute. Seating them at the same table could be uncomfortable."

**Operational efficiency**:
- "Marcus has 8 assigned guests for the Q2 dinner but only 5 for Q3. Julia has the opposite. Consider rebalancing."
- "Your average follow-up time has improved from 3.2 days to 1.8 days over the last 4 events. Keep it up — your meeting booking rate improved 45%."

### How AI Agents Collaborate Behind the Scenes

The infrastructure should support multiple specialized AI agents working together:

**Scoring Agent**: Continuously evaluates contacts against targeting criteria. When new data arrives (job change, company news, new event), it can re-score and flag changes.

**Enrichment Agent**: Monitors contacts for profile updates — new roles, company changes, news mentions, social signals. Keeps the People database fresh without manual effort.

**Briefing Agent**: Generates contextual briefings by pulling from the full knowledge graph — not just the current event's data, but cross-event history, relationship patterns, and recent news.

**Follow-Up Agent**: Tracks follow-up effectiveness, suggests timing and messaging based on what's worked before, and flags when follow-ups are overdue.

**Coordination Agent**: Watches for cross-team coordination opportunities — "Marcus just added a note about Eleanor that's relevant to Sarah's briefing. Updating automatically."

**The agents don't operate in isolation** — they share the same knowledge graph and can trigger each other. When the Enrichment Agent detects that a contact changed jobs, it triggers the Scoring Agent to re-evaluate, which may trigger the Briefing Agent to update any upcoming event briefings, which may trigger a proactive notification to the Event Lead via the Messaging Bridge.

---

## LAYER 1: Hyper-Contextual Dashboard Chat (Ship Now)

The existing Moots Intelligence chat bar at the bottom of every page becomes genuinely intelligent — not just a generic chatbot, but an AI that knows exactly what you're looking at and what you might need.

### Tab-Aware Suggested Prompts (Event Tabs)

The "TRY ASKING" prompts must change based on which tab the user is on AND what the data looks like. This is the single biggest change.

**Overview tab prompts** (when there are unresponded invitations):
- "2 guests haven't responded — should I follow up?"
- "We're at 85% capacity — who should fill the last 3 seats?"
- "Summarize what needs my attention before the event"

**Overview tab prompts** (when everything is on track):
- "What's the strategic profile of confirmed guests?"
- "Any risks I should know about for Thursday?"
- "Compare this event's pipeline to industry benchmarks"

**Targeting tab prompts**:
- "Which criterion is producing the highest-quality matches?"
- "Are there qualified contacts we're missing with current criteria?"
- "What would happen if we raised the LP threshold to weight 4?"

**Guest Intelligence tab prompts**:
- "Who are the 3 guests most likely to convert for Fund IV?"
- "Flag any guests with potential conflicts of interest"
- "Which unscored contacts should I prioritize?"

**Invitations tab prompts** (when campaigns are active):
- "Who hasn't responded to the Founding Table campaign?"
- "Draft a personal follow-up for Robert Kensington"
- "What's the acceptance rate compared to similar events?"

**Briefings tab prompts**:
- "What are the key talking points for tonight?"
- "Which guest relationships need the most prep?"
- "Generate a 2-minute elevator brief for the event"

**Check-in tab prompts** (pre-event):
- "What's the arrival plan for tonight?"
- "Which VIP guests should we watch for first?"
- "Generate a door briefing for staff"

**Check-in tab prompts** (during event):
- "Who's still expected but hasn't arrived?"
- "The walk-in says they know Charles — verify the connection"
- "We're over capacity — which tables can absorb walk-ins?"

**Follow-Up tab prompts**:
- "Draft follow-up emails for guests who attended"
- "Who should get a meeting invite vs. a thank-you?"
- "Prioritize follow-ups by Fund IV conversion likelihood"

**Analytics tab prompts**:
- "What worked well at this event?"
- "How does attendance compare to our last dinner?"
- "Generate a post-event report for the partners"

**Activity Log tab prompts**:
- "Summarize what happened in the last 24 hours"
- "Were there any unusual actions today?"
- "What did Marcus Rivera do during check-in?"

### Global Page Prompts (Events List + People Database)

**Events list page prompts**:
- "Which event needs my attention most right now?"
- "Compare guest quality across my last 3 events"
- "Any scheduling conflicts between my upcoming events?"
- "Show me a cross-event dashboard of key metrics"

**People database prompts**:
- "Who are my most engaged contacts overall?"
- "Find contacts I haven't reached out to in 6+ months"
- "Which contacts match multiple event targeting criteria?"
- "Show me my network by industry sector"

**Individual contact profile prompts**:
- "Summarize my full relationship history with this person"
- "What events have they attended and what happened?"
- "Who else in my network is connected to them?"
- "Draft a re-engagement message based on our history"

### How the AI Generates Contextual Prompts

The prompts should NOT be hardcoded strings. They should be **dynamically generated** based on:

1. **Current page/tab**: Event tab? Events list? People database? Contact profile?
2. **Data state**: What does the data look like? (unresponded invitations? overdue follow-ups? upcoming event in 48 hours?)
3. **Time context**: Pre-event vs. day-of vs. post-event — or no event context at all (People page)
4. **User role**: Event Lead (strategic) or Operations (logistical)?
5. **Recent activity**: What just happened? (new check-in, invitation response, contact update)
6. **Cross-event signals**: Patterns the AI has detected across multiple events

**Implementation approach**:
- On each page/tab load, pass the current context (page, tab, event ID if any, key metrics, timestamps), event date proximity, and user role to the AI
- The AI returns 3 contextually relevant suggested prompts
- Cache prompts for 5 minutes to avoid regenerating on every navigation
- When data changes significantly, invalidate cache and regenerate
- For global pages (Events, People), include aggregate metrics from all events in the context

### Prompt Visibility Fix

The current suggested prompts are too subtle. Make them:
- **Larger font**: 14px minimum (currently ~12px)
- **Bordered pills**: Light cream background (#FAF8F5) with subtle terracotta border, not plain gray
- **Label above**: "ASK MOOTS" or "TRY ASKING" in small caps, forest green (#2D6A4F)
- **Hover effect**: Background shifts to slightly darker cream, subtle shadow lift
- **Subtle animation on load**: Prompts fade in with a slight slide-up, drawing the eye

### AI Response Capabilities

When the user asks a question or gives a command, the AI should be able to:

**Answer questions** (read-only):
- "Who are my highest-priority guests?" → Returns a ranked list with scores and reasons
- "What's the status of the Extended Circle campaign?" → Returns campaign metrics
- "Tell me about Eleanor Blackwood" → Returns a comprehensive guest brief including cross-event history
- "How does this event compare to my last 3?" → Cross-event comparison

**Take actions** (with confirmation):
- "Move Charles Montgomery to Selected" → Shows what will change, asks for confirmation, then does it
- "Send a follow-up to everyone who attended" → Drafts the email, shows preview, waits for approval
- "Check in Walter Edmonds" → Performs the check-in, logs it
- "Add Eleanor Blackwood to the Q3 dinner guest pool" → Cross-event action

**Analyze and recommend** (AI reasoning):
- "Who should fill our last 3 seats?" → Analyzes unselected qualified guests, considers targeting criteria, event goals, and existing guest mix, recommends 3 with reasoning
- "Is there a conflict risk at Table 2?" → Cross-references guest relationships, company affiliations, competitive dynamics
- "Which contacts from Q1 should I re-invite for Q2?" → Cross-event analysis with reasoning

**Generate content**:
- "Draft a briefing for Marcus" → Generates a full briefing document
- "Write a post-event summary" → Creates a report with attendance, highlights, follow-up priorities
- "Create a re-engagement email for dormant contacts" → Cross-platform content generation

---

## LAYER 2: Messaging Platform Integration (Ship Fast — OpenClaw Proves It Can Be Done in Days)

Peter Steinberger built OpenClaw's initial WhatsApp relay — connecting a messaging platform to an AI agent — in about an hour. The full multi-platform messaging bridge with Telegram, Discord, and more was built in days using Claude Code. The entire project is open source (MIT license) at https://github.com/openclaw/openclaw with 247K GitHub stars, meaning we can study and adapt its adapter architecture directly.

This is NOT a "next quarter" feature. The OpenClaw codebase proves the messaging bridge pattern is straightforward: each platform gets a thin adapter (src/telegram/, src/whatsapp/, etc.) that normalizes messages in and out. The hard part isn't the messaging plumbing — it's the AI context engine behind it. And we're already building that for the dashboard chat in Layer 1.

### Why This Is the Killer Feature — And Not Just for Event Day

The biggest insight: **the killer UX isn't just during the event itself — it's during the weeks of event preparation.** Event teams are always on the go: visiting venues, meeting vendors, coordinating with clients, managing multiple events simultaneously. They're rarely sitting at a laptop with the dashboard open.

Scenarios where messaging-based Moots Intelligence is mind-blowing **before the event**:

- **Venue visit**: Sarah is at The NoMad doing a walkthrough. She texts Moots: "We might need to cap at 18 instead of 20 — the private room is smaller than expected. What's the impact?" → AI instantly analyzes which 2 guests could be moved to the Extended Circle waitlist
- **Client call**: Sarah is on the phone with the Meridian partners. They ask "What's our acceptance rate so far?" She glances at her phone and asks Moots. Answer in 3 seconds without opening a laptop
- **Commuting**: Marcus is on the subway. He texts: "Add a note on Eleanor Blackwood — I heard from a contact that she just closed a $200M deal. Update her profile." → Done
- **Multi-event juggling**: Julia is managing 3 events this month. She texts: "Which of my events has the most outstanding RSVPs?" → AI compares across all her events
- **Vendor coordination**: Sarah texts: "What's our final headcount including team? I need to confirm with the caterer by 3 PM" → "22 total: 17 confirmed guests + 2 expected walk-ins + 3 team members"
- **Last-minute changes**: "David Nakamura's assistant just called — he changed his mind and wants to come. Can we still fit him?" → AI checks capacity, suggests options

And then during and after the event:
- At the door: "Check in Yuki Tanaka as a walk-in from SoftBank"
- At the table: "What should I know about the person sitting across from me — Evercore guy"
- After: "Note: Charles mentioned he's very interested in co-investing in the HealthTech deal"
- Next morning: "Draft follow-up emails prioritized by conversion likelihood"

### Building It Fast: The OpenClaw Blueprint

OpenClaw's architecture is clean and modular. Here's what we adapt:

**What we take from OpenClaw** (open source, MIT licensed):
- The adapter pattern — each messaging platform gets its own adapter in a dedicated directory, all implementing the same interface
- The Gateway pattern — a single daemon that holds messaging connections open and routes messages to the AI engine
- The WhatsApp integration via Baileys library (QR code pairing, credentials stored locally)
- The Telegram integration via Bot API (simplest: just a bot token in an env variable)

**What we build ourselves** (Moots-specific):
- The Moots context engine (all events, all people, full knowledge graph)
- The action confirmation flow (destructive actions need user approval)
- Team member authentication (linking messaging accounts to Moots accounts)
- Activity Log integration (every messaging action gets logged)

### Architecture

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  WhatsApp         │     │                      │     │                  │
│  Telegram         │────▶│  Moots Message        │────▶│  Moots           │
│  iMessage         │     │  Bridge               │     │  Intelligence    │
│  SMS              │◀────│  (adapter layer)      │◀────│  AI Engine       │
│  Slack            │     │                      │     │                  │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
                                    │                          │
                                    │                   ┌──────┴──────┐
                                    │                   │  Unified    │
                                    │                   │  Knowledge  │
                                    │                   │  Graph      │
                                    └───────────────────│  (all data) │
                                                        └─────────────┘
```

**Message Bridge**: A thin adapter layer (like OpenClaw's per-platform adapters) that normalizes messages from different platforms. Each platform has its own integration:
- **WhatsApp**: Via Baileys library or Twilio WhatsApp
- **Telegram**: Via Telegram Bot API (easiest to implement first)
- **iMessage**: Complex — requires Apple ecosystem (defer to later)
- **SMS**: Via Twilio SMS API (simplest fallback)
- **Slack**: Via Slack Bot API (for teams already on Slack)

**Authentication**: Team members link their phone number or messaging handle to their Moots account. When a message comes in, the bridge identifies the team member and loads their FULL context — all events, all people, all history.

**Context engine**: Every message from a team member arrives with:
- Their identity (who they are, their role)
- ALL their events (not just one)
- The full knowledge graph relevant to their query
- Their conversation history with the AI

### Interaction Examples

**Pre-event, from WhatsApp**:
```
Marcus: Hey Moots, quick question — is Eleanor Blackwood confirmed for Thursday?
Moots: Yes, Eleanor confirmed on March 22. She's in the Founding Table campaign.
       She's assigned to you. Want me to pull up her briefing?
Marcus: Yes please
Moots: Eleanor Blackwood — Founder, Blackwood Partners
       - Family office managing $800M, evaluating Fund IV
       - Key topic: operational value creation in portfolio companies
       - Note from Sarah: "Prefers to be seated away from competing fund managers"
       - Talking points: Ask about the recent Blackwood-TechCo acquisition
       - History: Attended Q4 dinner (Dec 2025), had productive follow-up with Sarah
```

**Cross-event query, from Telegram**:
```
Sarah: Which contacts from the Q1 dinner should I re-invite for Q2?
Moots: Based on engagement and Fund IV alignment, I'd prioritize:
       1. Charles Montgomery (CalPERS) — attended Q1, 2 follow-up meetings, expressed co-invest interest
       2. Patricia Donovan (Yale Endowment) — attended Q1, follow-up email opened 4x, no meeting yet
       3. Elizabeth Waverly (ADIA) — attended Q1, high score (94), but follow-up went cold

       3 contacts from Q1 declined but may have changed circumstances:
       - David Nakamura — just got promoted to CIO, might reconsider
       - Victoria Langley — her fund just closed a new vintage, may have fresh allocation appetite

       Want me to add any of these to the Q2 guest pool?
```

**Day-of, from Telegram**:
```
Julia: 3 people just walked in who weren't on the list
Moots: I can register walk-ins for you. Give me their names one at a time.
Julia: Yuki Tanaka from SoftBank
Moots: ✓ Yuki Tanaka registered as walk-in. I found a SoftBank Vision Fund contact
       in your People database — same person? (Managing Director, $2.1B AUM)
Julia: Yes
Moots: ✓ Linked. She scores 88 on your targeting criteria. Assigned to you.
       Shall I notify Sarah?
Julia: Yes
Moots: ✓ Sarah notified. Who's next?
```

**During event, from SMS**:
```
Sarah: What should I know about the person sitting across from me —
       tall guy, Evercore
Moots: That's likely Oliver Pennington, Senior MD at Evercore.
       Score: 82. Advisory background.
       Key intel: Recently led Evercore's PE advisory practice expansion.
       He's here because of potential advisory relationship with Fund IV portfolio companies.
       Conversation starter: Ask about the Evercore-TechVenture deal that closed last month.
```

**Post-event, from WhatsApp**:
```
Sarah: Add a note to Charles Montgomery — he's very interested in co-investing
       in the Meridian HealthTech deal specifically
Moots: ✓ Note added to Charles Montgomery:
       "Very interested in co-investing in Meridian HealthTech deal specifically"
       Logged under Q2 Executive Dinner.
       Shall I flag this to the deal team?
```

**People-level query, from WhatsApp**:
```
Sarah: I'm meeting a potential new LP contact tomorrow — James Wu from
       Tiger Global. Do we have anything on him?
Moots: James Wu isn't in your People database yet. Here's what I found:
       - Managing Director, Tiger Global Management
       - Focus: late-stage growth equity and public markets
       - Tiger Global AUM: ~$60B
       - Relevance to Fund IV: Strong. Tiger has co-invested with similar PE firms.

       Want me to add him to the People database and score him against
       your Meridian targeting criteria?
Sarah: Yes, and add him to the Q3 dinner consideration list
Moots: ✓ Done. James Wu added to People DB. Score: 86 (high).
       Added to Q3 Executive Dinner guest pool. Tagged: "Met via direct outreach."
```

### Platform Priority: Start with WhatsApp + Telegram in Parallel

Since OpenClaw already solved both, and the adapter pattern means they're independent:

**WhatsApp** (via Baileys — same library OpenClaw uses):
- QR code pairing (no Meta Business approval needed for personal use)
- Most event professionals already use WhatsApp daily
- Rich formatting: bold, links, lists
- Image/document sharing (send a guest briefing PDF via WhatsApp)
- Limitation: 24-hour messaging window for business accounts (not an issue for team members chatting with their own bot)

**Telegram** (via Bot API):
- Free, no approval process, instant setup
- Inline keyboards for quick action buttons (✓ Check In / ✗ Cancel)
- No message window restrictions
- Rich message formatting
- Bot can send proactive notifications

Build both in the first sprint. OpenClaw's codebase proves each adapter is ~200-400 lines of code. The heavy lifting is the Moots context engine, not the messaging plumbing.

**Later phases**:
- Slack integration (for corporate teams)
- SMS fallback (via Twilio, for simplicity)
- iMessage (complex, requires Apple ecosystem — defer unless there's demand)

---

## LAYER 3: Learning & Adaptation (Ship Over Time)

The AI should get smarter over time — learning from the specific user, their events, their industry, and their preferences.

### What the AI Learns

1. **User preferences**: Sarah always asks for guest briefs in a specific format. After 3 events, the AI defaults to that format without being asked.
2. **Event patterns**: After running 5 Executive Dinners, the AI notices that acceptance rates drop for events scheduled on Mondays. It proactively suggests: "Based on your past events, Thursday dinners have 23% higher acceptance rates than Mondays."
3. **Guest intelligence over time**: "Charles Montgomery has attended 3 of your last 4 events. His engagement score has increased each time. He's now in your top 5 most engaged contacts."
4. **Follow-up effectiveness**: "Follow-up emails sent within 24 hours have a 3x higher response rate than those sent after 48 hours for your events."
5. **Team patterns**: "Marcus is most effective when assigned to LP-category guests. Julia has the highest walk-in registration speed."
6. **Relationship dynamics**: "Contacts who are seated together at one event and have a follow-up interaction are 3x more likely to attend the next event."

### Memory Architecture

Inspired by OpenClaw's 2-tier filing system, expanded for organizational intelligence:

**Tier 1 — Event Memory** (short-term, per-event):
- Everything about the current event: guests, scores, invitations, check-ins, notes, conversations
- Cleared or archived after the event lifecycle completes
- This is what powers the event-specific dashboard chat

**Tier 2 — Organizational Memory** (long-term, cross-event):
- Guest relationship history across all events
- User preferences and patterns
- Industry benchmarks and comparisons
- Team performance patterns
- Follow-up effectiveness data
- Relationship graph (who knows who, who connects well)
- This is what powers cross-event intelligence, People page AI, and proactive suggestions

**Tier 3 — Industry Knowledge** (base knowledge):
- Event management best practices
- PE/VC industry knowledge (for firms like Meridian)
- Hospitality and guest experience patterns
- General intelligence about companies, people, markets
- This is the foundation AI agents use to contextualize everything

---

## Implementation Roadmap — Aggressive Timeline

OpenClaw proves this can be built fast. Peter Steinberger went from zero to WhatsApp AI relay in an hour, and to a full multi-platform agent in days — using Claude Code. The codebase is MIT-licensed and we can reference it directly.

**Sprint 1 (Week 1-2) — Dashboard Intelligence + Foundation**:
- Moots Intelligence chat on ALL pages (event tabs + Events list + People database + Contact profiles)
- Dynamic context-aware suggested prompts (not hardcoded) — different prompts per page/tab
- Improved prompt visibility (larger, bordered, animated)
- AI can answer questions about event data AND cross-event/people data
- AI can take actions with confirmation (check-in, move guests, add notes, add to guest pool)
- Unified Knowledge Graph schema — structure all data for agent comprehension
- Activity Log integration (every AI action logged)

**Sprint 2 (Week 3-4) — Messaging Integration (WhatsApp + Telegram)**:
- Adapt OpenClaw's adapter pattern for Moots Message Bridge
- WhatsApp integration via Baileys (QR code pairing, same as OpenClaw)
- Telegram bot via Bot API (bot token setup)
- Team member authentication (link phone/Telegram handle to Moots account)
- Full context access from messaging (all events, all people — not just one event)
- Read queries: event status, guest info, briefs, cross-event comparisons, contact lookups
- Write actions with confirmation: check-in, add notes, register walk-ins, add to guest pools
- All messaging actions logged to Activity Log with channel indicator

**Sprint 3 (Week 5-6) — Proactive Agent + Cross-Event Intelligence**:
- Proactive notifications pushed to WhatsApp/Telegram: new RSVP, guest declined, capacity change, action needed
- Heartbeat-style check: AI reviews ALL event states and proactively messages team members
- Cross-event intelligence: "3 contacts from Q1 just changed jobs — re-invite?"
- People database intelligence: dormant contacts, relationship clusters, scoring gaps
- Voice message transcription (WhatsApp/Telegram voice notes → text → AI processes)

**Sprint 4 (Week 7-8) — Agent Collaboration + Learning**:
- Specialized agent infrastructure: Scoring Agent, Enrichment Agent, Briefing Agent, Follow-Up Agent, Coordination Agent
- Agent-to-agent triggers (enrichment triggers re-scoring triggers briefing update)
- Cross-event memory: guest relationship history, attendance patterns
- Personalized prompt suggestions based on user behavior
- Post-event intelligence reports with learnings
- Team-wide coordination notifications

**Future**:
- Slack integration (corporate teams)
- SMS fallback (Twilio)
- iMessage (if demand warrants)
- Global Command-K search bar with AI
- Agent marketplace (custom agents for specific industries/use cases)

---

## Seed Data for Demo

For the demo, the AI chat should have pre-populated conversation history showing how it was used across the platform:

**Event-level conversation snippets**:
- Sarah: "Who should fill our last 3 seats?" → AI recommended 3 guests with reasoning
- Sarah: "Draft follow-up for Robert Kensington who hasn't responded" → AI drafted personalized email
- Marcus: "What should I know about my assigned guests?" → AI generated a quick brief

**Cross-event conversation snippets**:
- Sarah: "Compare our Q1 and Q2 dinner acceptance rates" → AI showed comparison with insights
- Sarah: "Which Q1 attendees should I re-invite?" → AI analyzed and recommended with reasoning

**People database conversation snippets**:
- Sarah: "Who are my most engaged contacts this year?" → AI ranked by cross-event engagement
- Sarah: "Find LP contacts I haven't invited in 6+ months" → AI surfaced dormant relationships

**Day-of conversation snippets**:
- Julia: "Walk-in: Yuki Tanaka from SoftBank" → AI registered and scored automatically
- Marcus: "Who's still not here?" → AI listed 2 remaining expected guests
- Sarah: "Quick brief on Gregory Mansfield — just walked in" → AI provided instant context

This conversation history demonstrates the AI's value across the entire platform — not just within one event.

---

## Design System Notes

- **Moots Intelligence chat**: Present on every page of the platform. The bottom-bar chat should remain as-is for positioning, but the suggested prompts need the visibility upgrade described above. When the AI responds with structured data (guest lists, metrics, briefings), format it as rich cards within the chat — not plain text.
- **Cross-event context indicator**: When the AI draws on cross-event data, show a subtle indicator: "Based on 4 events" or "Drawing from People database" — so users understand the AI is reasoning across their full data.
- **Messaging integrations**: When showing AI conversation history in the dashboard, indicate the channel with a small icon (Telegram icon, WhatsApp icon, or web icon) next to the message.
- **Agent activity indicators**: When background agents are working (re-scoring, enrichment, etc.), show a subtle pulse or activity indicator in the Moots Intelligence icon — so users know the AI is working even when they haven't asked it anything.
- **Brand tokens**: terracotta (#B05C3B) for primary actions, cream (#FAF8F5) for backgrounds, forest green (#2D6A4F) for headings and labels.

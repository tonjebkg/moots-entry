# Vision Implementation Plan
## Transforming Moots-Entry from Dashboard to Autonomous Event Intelligence Agent

---

## Part A: Current State Summary

### Where We Are (Brutally Honest)

Moots-Entry today is a **well-built event operations dashboard with AI features bolted on**. It is not yet the autonomous event intelligence agent described in the vision.

**What exists is impressive:** 80+ API routes, 50+ components, 20+ database tables, a complete event lifecycle (objectives → scoring → invitations → check-in → seating → briefings → follow-up → analytics), and real AI integration using Claude for scoring, seating suggestions, briefing generation, introduction pairings, and follow-up personalization.

**What's missing is the soul.** The AI does work, but it's invisible. The user clicks a "Score All" button, waits, and sees numbers appear. They click "Generate Briefing" and a document materializes. They click "AI Suggest" and seating assignments populate. At no point does the user feel like they're **working with someone**. They feel like they're operating a tool.

**Vision realization: ~30%**

| Layer | Status | Notes |
|-------|--------|-------|
| Operational infrastructure | 90% | Check-in, campaigns, RSVP, broadcast, analytics — all solid |
| AI capabilities | 70% | Scoring, seating, briefings, follow-up — working but button-triggered |
| Agent visibility | 10% | Seating has a reasoning log; everything else is a black box |
| Conversational interface | 0% | No chat panel, no text input, no collaborative dialogue |
| Agent personality | 0% | Empty states say "No data" not "I haven't found matches yet" |
| Context depth | 30% | Guest intel exists; company profile and sponsor intelligence don't |
| Agent loop (propose → respond → learn) | 15% | Proposes and accepts overrides; never responds or learns |
| Accumulated intelligence / moat | 0% | No learning, no memory, no cross-event pattern recognition |
| Multi-channel (Slack/WhatsApp) | 0% | Not started |

### The Single Biggest Gap

**The agent has no voice.** It does excellent work behind the scenes — scoring is sophisticated, seating optimization is smart, briefings are useful — but it never speaks. It never explains itself in the moment. It never says "I noticed something." It never asks a follow-up question. It never shows its work as it happens.

The vision says: *"The event director doesn't 'use' Moots-Entry the way they use a spreadsheet. They collaborate with it."* Today, the event director uses Moots-Entry exactly the way they use a spreadsheet — they look at data, click buttons, and get results. The collaboration is missing.

---

## Part B: Architecture Recommendations

### 1. Data Model Additions Required

The current schema supports operations. The vision requires intelligence infrastructure:

**Missing tables:**

| Table | Purpose | Why |
|-------|---------|-----|
| `agent_activity_log` | Log every agent action with narrative text | Powers the activity feed, "while you were away", and agent visibility |
| `agent_conversations` | Store chat messages between user and agent | Powers the conversational interface |
| `company_profiles` | Workspace-level company intelligence | Context Layer 1 — feeds all scoring and recommendations |
| `event_sponsors` | Per-event sponsor entities with tiers and goals | Context Layer 4 — feeds seating and ROI |
| `sponsor_goals` | Specific objectives per sponsor | Makes seating and briefing sponsor-aware |
| `agent_preferences` | Learned workspace-level preferences | The "no going back" moat — accumulated intelligence |
| `override_log` | Track every user override of agent suggestions | Feeds learning; enables "respond to override" |

**Missing fields on existing tables:**

| Table | Missing Fields | Why |
|-------|---------------|-----|
| `workspaces` | `company_description`, `industry`, `market_position`, `key_leadership` (JSONB), `strategic_priorities` (TEXT[]), `competitors` (TEXT[]), `brand_voice` (TEXT) | Company Profile context |
| `events` | `success_criteria` (TEXT), `key_stakeholders` (JSONB), `budget_range` (TEXT), `theme` (TEXT) | Richer event context |
| `scoring_jobs` | `narrative_log` (JSONB) | "Analyzed 200 contacts... Found 47 matches..." step-by-step log |
| `seating_suggestions` | `override_reason` (TEXT), `original_table` (INT) | Track overrides for learning |

### 2. State Management

The current approach (per-component `useState` + `useEffect` + `fetch`) works for a dashboard but breaks down for an agent interface that needs:

- **Streaming responses** (chat panel, "thinking" states)
- **Cross-component communication** (chat panel affects seating chart, activity feed updates when scoring completes)
- **Persistent state** (conversation history, panel open/closed state)

**Recommendation:** Add a minimal React Context for agent state — not a full state library, but a shared context that wraps the event layout:

```typescript
// lib/agent/AgentContext.tsx
interface AgentState {
  chatOpen: boolean;
  activeOperation: string | null; // "scoring" | "briefing" | "seating" | null
  operationNarrative: string[];   // streaming steps
  lastActivity: AgentActivity[];
  conversationHistory: Message[];
}
```

This context lives in `app/dashboard/[eventId]/layout.tsx` and is accessible from any child page/component.

### 3. Streaming / Progressive UI

The vision requires "the agent visibly working." This needs **Server-Sent Events (SSE)** for long-running operations, not polling.

**Current:** Frontend polls `/api/scoring-jobs/[id]` every 2 seconds → gets a count.
**Vision:** Frontend opens SSE connection → receives narrative steps in real-time:
```
"Scanning 200 contacts in your network..."
"Found 47 strong matches for your PE dinner objectives..."
"Scoring against 3 criteria: investor relevance, seniority fit, network overlap..."
"78 contacts scored. 23 qualify (60+). 5 are must-invites."
```

**Implementation approach:** Use Next.js Route Handlers with `ReadableStream` for SSE. No WebSocket server needed. The streaming endpoint wraps the existing batch job processor and emits narrative events.

### 4. Conversational Interface Backend

The chat panel needs a dedicated API route that:
1. Receives user message + current page context (event ID, active tab, selected guest)
2. Builds a system prompt with full event context (objectives, guest list summary, sponsor goals, recent activity)
3. Streams a Claude response back to the frontend
4. Can execute actions (move guest, generate briefing, add to wave) based on user instructions
5. Stores conversation history per event per user

**Pattern:** `POST /api/events/[eventId]/agent/chat` with SSE streaming response. The system prompt is dynamically assembled from database queries — not a static prompt. Every message includes: company profile, event context, guest summary stats, sponsor goals, recent overrides, and the current page the user is viewing.

---

## Part C: Implementation Phases

### Phase 1: Make the Agent Visible (Weeks 1-3)

This is the highest-impact phase. It transforms the platform from "dashboard I look at" to "agent I work with" — without changing any backend AI logic. The agent already does smart work; we're giving it a voice.

#### 1.1 Agent Activity Log (Backend + Data)

**New migration: `migrations/009_agent_infrastructure.sql`**

```sql
-- Agent activity log: every meaningful agent action with narrative
CREATE TABLE agent_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'scoring', 'enrichment', 'briefing', 'seating', 'introduction', 'follow_up', 'observation'
  headline      TEXT NOT NULL, -- "Scored 47 contacts against 3 objectives"
  detail        TEXT,          -- Longer narrative with specifics
  metadata      JSONB DEFAULT '{}', -- Structured data (counts, contact_ids, scores)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_activity_event ON agent_activity_log(event_id, created_at DESC);
CREATE INDEX idx_agent_activity_workspace ON agent_activity_log(workspace_id, created_at DESC);

-- Agent conversations: chat history
CREATE TABLE agent_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}', -- page context, action taken, etc.
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_agent_conversations_event ON agent_conversations(event_id, user_id, created_at);

-- Override log: track user overrides of agent suggestions
CREATE TABLE override_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  override_type     TEXT NOT NULL, -- 'seating_move', 'score_override', 'suggestion_reject'
  entity_type       TEXT NOT NULL, -- 'contact', 'table', 'pairing'
  entity_id         TEXT NOT NULL,
  original_value    JSONB,
  new_value         JSONB,
  user_reason       TEXT,          -- Optional: why they overrode
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_override_log_event ON override_log(event_id, created_at DESC);
```

**New file: `lib/agent/activity.ts`** — Functions to log agent activity with rich narratives. Called from scoring engine, seating optimizer, briefing generator, enrichment pipeline, and follow-up generator. Every AI operation writes a human-readable narrative to `agent_activity_log`.

**Modify existing AI operations:** After each scoring batch, seating generation, briefing creation, etc., call `logAgentActivity()` with a narrative summary. Example:

```typescript
await logAgentActivity({
  eventId, workspaceId,
  type: 'scoring',
  headline: `Scored ${completed} contacts against ${objectives.length} objectives`,
  detail: `${qualified} qualify (60+). Top match: ${topName} at ${topScore}. ${lowData} contacts scored conservatively due to limited data.`,
  metadata: { completed, qualified, topScore, avgScore }
});
```

#### 1.2 Agent Activity Feed (Frontend — Overview Tab)

**Modify: `app/api/events/[eventId]/overview-stats/route.ts`**
- Add query to `agent_activity_log` for recent agent actions
- Return `agent_activity` array alongside existing `activity` (user actions)

**New component: `app/components/overview/AgentActivityFeed.tsx`**
- Replaces or augments the current `ActivityFeed`
- Agent actions show with a distinct Moots agent avatar (sparkles icon or branded "M")
- Each item shows: headline, relative time, expandable detail
- Examples:
  - "Scored 47 contacts against your 3 objectives. 23 qualify — 5 are must-invites." (2h ago)
  - "Generated morning briefing for your team. 3 key talking points prepared." (6h ago)
  - "Processed 8 new RSVP submissions. 2 are high-priority matches." (1d ago)

**Modify: `app/dashboard/[eventId]/overview/page.tsx`**
- Add "Agent Activity" section above or replacing current Activity Feed
- Add "While You Were Away" banner at top when there are agent actions since last visit

#### 1.3 "While You Were Away" Summary

**New component: `app/components/WhileYouWereAway.tsx`**
- Shown at top of Overview when agent has logged actions since user's last visit
- Collapsible banner with warm brand styling
- Lists agent actions with counts: "Since yesterday at 5 PM: 3 RSVPs processed, 12 scores updated, 1 briefing generated"
- "Catch Up" button that expands to full detail
- Tracks last visit via `localStorage` timestamp

#### 1.4 Streaming "Thinking" States

**New component: `app/components/ui/AgentThinking.tsx`**
- A reusable component that displays step-by-step narrative during AI operations
- Replaces generic "Loading..." / "Generating..." text with progressive messages
- Uses a simple interval-based simulation for v1 (real SSE in v2):

```tsx
// Steps rotate through during operation:
const scoringSteps = [
  "Reviewing your event objectives...",
  `Scanning ${contactCount} contacts in your network...`,
  "Matching profiles against criteria...",
  "Cross-referencing industries and seniority...",
  "Calculating relevance scores...",
];
```

**Modify: `app/components/ScoringJobProgress.tsx`** — Replace plain progress bar with `AgentThinking` + progress bar combo.

**Modify: `app/dashboard/[eventId]/briefings/page.tsx`** — Replace "Generating..." button with thinking narrative: "Reviewing 12 guest profiles... Identifying key talking points... Checking recent news..."

**Modify: `app/dashboard/[eventId]/day-of/page.tsx`** — Replace seating "Generating..." with: "Analyzing table balance... Checking for competitor conflicts... Optimizing for conversation dynamics..."

#### 1.5 Agent Personality in Empty States

**Sweep all empty states across the codebase** (~15 components) and replace generic messages with agent-voice messages:

| Component | Current | Agent Voice |
|-----------|---------|-------------|
| `ActivityFeed` | "No recent activity yet" | "I'm ready to start working on your event. Set objectives and I'll begin analyzing your guest pool." |
| `BriefingsPage` | "No Briefings Yet" | "I'll generate a personalized briefing once you have confirmed guests. Score and select your attendees first." |
| `IntroductionPairings` | "No pairings yet. Click Generate..." | "Once guests are confirmed, I'll identify who should meet based on shared interests and your objectives." |
| `SeatingChart` | "No tables configured..." | "Set up your seating format and I'll propose table arrangements optimized for your event objectives." |
| `AnalyticsPage` | "No Analytics Data Yet" | "After your event, I'll analyze attendance patterns, score accuracy, and campaign effectiveness here." |
| `FollowUpPage` | (no empty state) | "After the event, I'll draft personalized follow-up emails for each attendee based on their profile and interactions." |
| `CheckinDashboard` | (no check-ins) | "Check-in is ready. I'll track arrivals in real-time and alert you when VIPs and key guests arrive." |

#### 1.6 Persistent Chat Panel (The Big One)

This is the paradigm shift. Even a simple v1 transforms the relationship between user and platform.

**New component: `app/components/agent/ChatPanel.tsx`**
- Fixed-position panel on the right side of the screen (slide-in/out)
- Accessible from every event page via a persistent floating button
- Contains: conversation history, text input, send button
- Shows typing indicator when agent is responding
- v1 scope: answer questions about the event using full context (no action execution yet)

**New component: `app/components/agent/ChatToggle.tsx`**
- Floating button (bottom-right) with Moots agent icon
- Notification badge when agent has something to say
- Click toggles the ChatPanel open/closed

**New API route: `app/api/events/[eventId]/agent/chat/route.ts`**
- POST handler that streams Claude response
- Builds system prompt dynamically from:
  - Event details (title, date, objectives, capacity)
  - Guest summary (total contacts, scored, qualified, confirmed)
  - Recent agent activity (from `agent_activity_log`)
  - Current conversation history (from `agent_conversations`)
  - Active page context (passed in request body)
- Returns streaming text response using `ReadableStream`
- Stores both user message and agent response in `agent_conversations`

**New file: `lib/agent/context-builder.ts`**
- Assembles the system prompt for the chat agent
- Queries database for event context, guest stats, recent activity
- Keeps prompt under token limits by summarizing large datasets

**Modify: `app/dashboard/[eventId]/layout.tsx`**
- Wrap children in `AgentContextProvider`
- Render `ChatToggle` and `ChatPanel` at layout level (persists across tab changes)

**v1 capabilities (answer questions):**
- "Who are my top 5 guests and why?"
- "How many people haven't responded yet?"
- "What's the average score for guests from the fintech sector?"
- "Summarize the current seating arrangement"
- "Who should I follow up with first?"

**v2 capabilities (execute actions — Phase 3):**
- "Move James to Table 1"
- "Generate a morning briefing"
- "Send a follow-up to all guests who checked in"
- "Add Sarah Chen to the VIP wave"

#### 1.7 Agent Context Provider

**New file: `app/components/agent/AgentContextProvider.tsx`**
- React Context that wraps the event layout
- Provides: `chatOpen`, `setChatOpen`, `activeOperation`, `operationSteps`
- Any component can report its active operation ("scoring in progress") which the chat panel and thinking states consume
- Lightweight — no heavy state library needed

### Phase 2: Deepen the Context (Weeks 4-6)

#### 2.1 Company Profile

**Extend `workspaces` table** (migration 010):
- `company_website TEXT`
- `company_description TEXT`
- `industry TEXT`
- `market_position TEXT`
- `key_leadership JSONB DEFAULT '[]'`
- `strategic_priorities TEXT[] DEFAULT '{}'`
- `competitors TEXT[] DEFAULT '{}'`
- `brand_voice TEXT`
- `company_enriched_at TIMESTAMPTZ`

**New page: `app/dashboard/settings/company-profile/page.tsx`**
- Shows AI-researched company profile (or blank for manual entry)
- "Research My Company" button → AI researches based on workspace name + website
- Editable fields for user correction
- Visual confirmation: "Here's what I know about your company. Is this accurate?"

**New API: `app/api/workspaces/[id]/company-profile/route.ts`**
- GET: return company profile fields
- PATCH: update profile
- POST with `action: 'research'`: trigger AI research via Claude (web search + synthesis)

**Inject company context into scoring prompt** (`lib/scoring/engine.ts`):
- Add company profile to the scoring prompt so relevance is evaluated against the host company's industry, priorities, and competitors
- This makes every score smarter without changing the scoring UI

#### 2.2 Event Context Enrichment

**Extend `events` table** (same migration 010):
- `success_criteria TEXT`
- `key_stakeholders JSONB DEFAULT '[]'`
- `event_theme TEXT`
- `budget_range TEXT`
- `additional_context TEXT` — free-form field for pasting event briefs

**Modify event creation wizard** (`app/components/CreateEventWizard.tsx`):
- Add optional "Event Brief" textarea: "Paste your event brief or describe what you're planning, and I'll extract the key details"
- When pasted, call Claude to extract: objectives, stakeholders, theme, success criteria
- Pre-fill the objectives step with AI-extracted objectives

#### 2.3 Sponsor Intelligence

**New migration fields** (migration 010):

```sql
CREATE TABLE event_sponsors (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  company_name    TEXT NOT NULL,
  tier            TEXT NOT NULL, -- 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'
  contact_name    TEXT,
  contact_email   TEXT,
  budget_amount   INTEGER, -- in cents
  goals           TEXT[], -- Array of sponsor-specific goals
  table_count     INTEGER DEFAULT 0, -- Promised table count
  key_contacts    JSONB DEFAULT '[]', -- Sponsor's attendees [{name, title, contact_id}]
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_event_sponsors_event ON event_sponsors(event_id);
```

**New page section in Day-of/Seating:** Show sponsor table requirements alongside seating chart.

**Modify seating prompt** (`lib/seating/optimizer.ts`):
- Include sponsor goals and key contacts in the prompt
- Add constraint: "Sponsor X wants access to these contact types"
- AI now optimizes seating for sponsor satisfaction, not just general relevance

#### 2.4 Context Injection into All AI Operations

**New file: `lib/agent/event-context.ts`**
- Single function: `getFullEventContext(eventId, workspaceId)` → returns assembled context object
- Used by: scoring engine, seating optimizer, briefing generator, follow-up generator, chat agent
- Contains: company profile, event details, objectives, sponsor goals, guest summary stats, recent overrides
- This ensures every AI operation has the same rich context

### Phase 3: Close the Agent Loop (Weeks 7-9)

#### 3.1 Seating Override Response

When a user moves a guest between tables:

**Modify: `app/dashboard/[eventId]/day-of/page.tsx`**
- After `handleMoveGuest()`, call new API endpoint
- Display agent response in a toast/popover near the moved guest

**New API: `app/api/events/[eventId]/seating/analyze-move/route.ts`**
- Receives: `contactId`, `fromTable`, `toTable`
- Claude analyzes the move considering: sponsor goals, competitor conflicts, conversation dynamics, seniority balance
- Returns: brief analysis + optional suggestions
- Logs to `override_log` table

**Example response shown to user:**
> "Good call. Table 1 now has your CEO and James — strong for relationship building. Note: James wanted to meet Sarah (Table 3). Want me to arrange a cocktail-hour introduction instead?"

#### 3.2 Proactive Suggestions Engine

**New cron job: `app/api/cron/agent-suggestions/route.ts`**
- Runs daily (or on schedule)
- Checks each active event for actionable insights:
  - "4 guests scoring 80+ haven't been invited"
  - "3 confirmed guests are from competing companies — check table assignments"
  - "Follow-up window closing: 5 attendees haven't been contacted in 7 days"
  - "New RSVP from VIP contact — auto-scored at 91"
- Writes suggestions to `agent_activity_log` with type `'observation'`
- These appear in the Overview activity feed and trigger the chat panel notification badge

#### 3.3 "While You Were Away" (Enhanced)

**Modify: `app/components/WhileYouWereAway.tsx`**
- Now pulls from both `agent_activity_log` AND the proactive suggestions
- Groups by category: "Scoring Updates", "New RSVPs", "Suggestions"
- Each suggestion has an action button: "Review", "Approve", "Dismiss"

#### 3.4 Agent Learning (v1 — Simple)

**New file: `lib/agent/learning.ts`**
- After each override: extract a preference pattern
  - "User moved sponsor CEO to CEO table" → pattern: "executive_relationship_priority"
  - "User declined a high-score guest" → pattern: "manual_filter_override"
- Store patterns in `agent_preferences` table (workspace-scoped)
- Include relevant preferences in future AI prompts:
  - "Note: This team typically prioritizes executive relationships over sponsor ROI when making seating decisions."

**New migration table:**
```sql
CREATE TABLE agent_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  category        TEXT NOT NULL, -- 'seating', 'scoring', 'follow_up', 'general'
  preference_key  TEXT NOT NULL, -- 'executive_relationship_priority', 'prefer_industry_clusters'
  preference_text TEXT NOT NULL, -- Human-readable: "Team prioritizes executive relationships"
  confidence      REAL DEFAULT 0.5, -- Strengthens with repeated observations
  observation_count INTEGER DEFAULT 1,
  last_observed   TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, preference_key)
);
```

### Phase 4: Expand the Channels (Weeks 10-12)

#### 4.1 Slack Integration

**Architecture:**
- New package: `@slack/bolt` for Slack bot framework
- New API routes: `app/api/integrations/slack/`
  - `events/route.ts` — Slack event handler (mentions, DMs)
  - `commands/route.ts` — Slash command handler (`/moots status`, `/moots briefing`)
  - `oauth/route.ts` — OAuth flow for workspace connection
- New lib: `lib/integrations/slack.ts` — Message formatting, context injection
- Same `lib/agent/context-builder.ts` used for both web chat and Slack

**Slash commands:**
- `/moots status` → "17 confirmed, 3 pending RSVP. 2 VIPs arriving tonight."
- `/moots briefing` → Posts condensed briefing to channel
- `/moots who [name]` → Quick guest lookup

#### 4.2 Email Digests

**New cron job: `app/api/cron/daily-digest/route.ts`**
- Runs daily at configured time (e.g., 7 AM)
- For each active event with upcoming dates:
  - Generates a digest email using `lib/agent/context-builder.ts`
  - Sends via Resend to all team members
- Content: overnight agent activity, pending actions, countdown to event, key stats

#### 4.3 Abstraction Layer

**New file: `lib/agent/channel.ts`**
- Defines `AgentChannel` interface:
  ```typescript
  interface AgentChannel {
    sendMessage(userId: string, content: string): Promise<void>;
    receiveMessage(message: IncomingMessage): Promise<string>;
    formatResponse(response: AgentResponse): string;
  }
  ```
- Implementations: `WebChatChannel`, `SlackChannel`, `EmailChannel`
- The agent logic is channel-agnostic; formatting adapts per channel

---

## Part D: Quick Wins (Can Be Done This Week)

These changes immediately make the platform feel more agent-like without major architecture work:

### 1. Agent-Voice Empty States (2 hours)
Sweep all ~15 empty state messages and rewrite with agent personality. No backend changes needed — pure copy updates.

**Before:** "No Briefings Yet. Make sure you have scored contacts..."
**After:** "I'll generate personalized briefings once you have confirmed guests. Each briefing includes talking points, shared interests, and strategic notes tailored to your objectives."

### 2. Activity Feed Attribution (2 hours)
In the Overview activity feed, prefix system-generated actions with "Moots" instead of "System":

**Before:** "System scored John Smith"
**After:** "Moots scored John Smith — 82/100, strong match on PE co-investment objectives"

Modify `app/api/events/[eventId]/overview-stats/route.ts` to include score data in activity items.

### 3. Scoring Summary Toast (1 hour)
After scoring completes, show a summary banner instead of just closing the progress bar:

"Scored 47 contacts. 23 qualify (60+). Top match: James Harrington (92). 5 contacts scored conservatively due to limited profile data — consider enriching them."

Modify `app/components/ScoringJobProgress.tsx` and the scoring API response.

### 4. "Objectives Power Your Scores" Callout (30 min)
After saving objectives, show: "Objectives saved. These will power AI scoring for all contacts in your pool. Run scoring from the Guest Intelligence tab to apply."

Modify `app/dashboard/[eventId]/objectives/page.tsx`.

### 5. Briefing Generation Narrative (1 hour)
Replace the "Generating..." button state with rotating narrative text:
- "Reviewing your confirmed guest list..."
- "Analyzing shared interests and backgrounds..."
- "Identifying strategic talking points..."
- "Preparing your briefing..."

Modify `app/dashboard/[eventId]/briefings/page.tsx`.

### 6. Seating Reasoning Language Softening (30 min)
Change seating rationale from declarative to advisory:

**Before:** "Smith is placed at Table 3 for networking with tech leads"
**After:** "Suggested for Table 3 — Smith's AI infrastructure background complements the tech leaders here. 87% confidence."

Modify `app/components/SeatingChart.tsx` tooltip/info display.

### 7. "Scored X days ago" → More Context (1 hour)
In Guest Intelligence expanded rows, enhance the scored timestamp:

**Before:** "Scored 2 days ago"
**After:** "Scored 2 days ago · Matches 2 of 3 objectives · Top match: PE co-investment (85/100)"

Modify `app/dashboard/[eventId]/guest-intelligence/page.tsx` expanded row section.

### 8. Enrichment Detail Expansion (1 hour)
When clicking the "Enriched" badge on a contact, show what was enriched:

"Enriched: Title (verified), Company (verified), Industry (inferred from company), AI Summary (generated). Last updated 3 hours ago."

Modify `app/dashboard/[eventId]/guest-intelligence/page.tsx` enrichment badge.

### 9. Needs Attention — Agent Voice (30 min)
Rewrite "Needs Attention" items with agent personality:

**Before:** "30 inbound RSVPs need your review — the AI has scored them for you"
**After:** "I've scored 30 new RSVP submissions. 12 are strong matches (70+). 3 need your attention — they're connected to competitors."

Modify `app/api/events/[eventId]/overview-stats/route.ts` needs_attention text.

### 10. Chat Panel Teaser (1 hour)
Add a non-functional but visible chat button (bottom-right corner) that shows a tooltip: "Moots Agent — Coming Soon. Ask questions, get recommendations, and manage your event through conversation."

This plants the seed of the conversational interface and signals the product direction.

New component: `app/components/agent/ChatTeaser.tsx` — renders in layout.

---

## Part E: File-by-File Change List (Phase 1 + Quick Wins)

### New Files to Create

| File | Purpose |
|------|---------|
| `migrations/009_agent_infrastructure.sql` | Schema for agent_activity_log, agent_conversations, override_log |
| `lib/agent/activity.ts` | `logAgentActivity()` function for recording agent actions with narratives |
| `lib/agent/context-builder.ts` | Assembles full event context for AI prompts (chat, scoring, seating) |
| `lib/agent/event-context.ts` | `getFullEventContext()` — shared context query used by all AI operations |
| `app/components/agent/ChatPanel.tsx` | Persistent conversation panel (slide-in from right) |
| `app/components/agent/ChatToggle.tsx` | Floating button to open/close chat panel |
| `app/components/agent/ChatTeaser.tsx` | Pre-launch teaser button (Quick Win #10) |
| `app/components/agent/AgentContextProvider.tsx` | React Context for agent state across event pages |
| `app/components/overview/AgentActivityFeed.tsx` | Agent-specific activity feed with rich narratives |
| `app/components/WhileYouWereAway.tsx` | Banner showing agent actions since last visit |
| `app/components/ui/AgentThinking.tsx` | Reusable progressive "thinking" state component |
| `app/components/ui/AgentAvatar.tsx` | Moots agent avatar (sparkles + brand styling) |
| `app/api/events/[eventId]/agent/chat/route.ts` | Streaming chat endpoint (Claude with event context) |
| `app/api/events/[eventId]/agent/activity/route.ts` | GET agent activity log for an event |

### Files to Modify

| File | Changes | Why |
|------|---------|-----|
| **`app/dashboard/[eventId]/layout.tsx`** | Wrap children in `AgentContextProvider`, render `ChatToggle` + `ChatPanel` | Agent panel persists across all tabs |
| **`lib/scoring/engine.ts`** | After scoring, call `logAgentActivity()` with narrative summary | Agent visibility for scoring |
| **`lib/seating/optimizer.ts`** | After seating generation, call `logAgentActivity()` | Agent visibility for seating |
| **`lib/briefing/generator.ts`** | After briefing generation, call `logAgentActivity()` | Agent visibility for briefings |
| **`lib/enrichment/pipeline.ts`** | After enrichment batch, call `logAgentActivity()` | Agent visibility for enrichment |
| **`lib/follow-up/generator.ts`** | After follow-up generation, call `logAgentActivity()` | Agent visibility for follow-up |
| **`app/api/events/[eventId]/overview-stats/route.ts`** | Add agent_activity_log query; enhance needs_attention text with agent voice | Overview shows agent work |
| **`app/dashboard/[eventId]/overview/page.tsx`** | Replace ActivityFeed with AgentActivityFeed; add WhileYouWereAway banner | Overview transformation |
| **`app/components/ScoringJobProgress.tsx`** | Replace plain progress bar with AgentThinking narrative + progress | Visible thinking during scoring |
| **`app/dashboard/[eventId]/briefings/page.tsx`** | Replace "Generating..." with narrative thinking steps | Visible thinking during briefing gen |
| **`app/dashboard/[eventId]/day-of/page.tsx`** | Replace seating "Generating..." with narrative thinking steps | Visible thinking during seating suggest |
| **`app/components/overview/ActivityFeed.tsx`** | Update to handle agent avatar for system/agent entries | Agent identity in feed |
| **`app/components/SeatingChart.tsx`** | Soften rationale language (advisory tone) | Agent voice in seating |
| **`app/dashboard/[eventId]/guest-intelligence/page.tsx`** | Enhance scored timestamp, enrichment badge detail, post-scoring summary | Agent transparency in scoring |
| **`app/dashboard/[eventId]/objectives/page.tsx`** | Add "objectives power your scores" callout after save | Connect objectives to scoring |
| **Empty state components (~10 files)** | Rewrite messages with agent personality | Agent voice everywhere |

### Database Schema Additions (Migration 009)

```sql
-- agent_activity_log: Rich narrative log of every agent action
CREATE TABLE agent_activity_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  headline      TEXT NOT NULL,
  detail        TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- agent_conversations: Chat message history
CREATE TABLE agent_conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      INTEGER REFERENCES events(id) ON DELETE CASCADE,
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content       TEXT NOT NULL,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- override_log: Track user overrides of AI suggestions
CREATE TABLE override_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id),
  override_type   TEXT NOT NULL,
  entity_type     TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  original_value  JSONB,
  new_value       JSONB,
  user_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Seed Data Additions

**Modify: `scripts/seed-pe-dinner.ts`**
- Add 15-20 agent_activity_log entries simulating agent work over the past week:
  - "Scored 72 contacts against 3 event objectives. 38 qualify (60+)." (3 days ago)
  - "Processed 30 inbound RSVP submissions. 18 are strong matches." (2 days ago)
  - "Generated pre-event briefing with talking points for 17 confirmed guests." (1 day ago)
  - "Proposed seating for 17 guests across 2 tables. Mixed interests strategy." (1 day ago)
  - "Identified 5 high-priority introduction pairings based on shared PE focus." (1 day ago)
  - "Observation: 4 unresponsive invitees have connections to your platinum sponsor. Consider a personal follow-up." (today)

This makes the demo immediately feel like an active agent has been working.

---

## Summary

### The Single Biggest Gap
The agent does excellent work but has no voice. Every AI operation is invisible — the user sees results, never the intelligence producing them. The platform feels like a sophisticated spreadsheet, not a collaborator.

### The 3 Highest-Impact Changes for Phase 1
1. **Agent Activity Feed + "While You Were Away"** — The user opens the dashboard and sees what the agent has been doing. Immediate shift from "static dashboard" to "active collaborator."
2. **Persistent Chat Panel** — The user can talk to the agent about their event. Even basic Q&A changes the relationship from "I use this tool" to "I work with this agent."
3. **Streaming Thinking States** — When scoring, generating briefings, or suggesting seating, the user sees the agent's thought process. Builds trust and creates the "intelligent teammate" feeling.

### Effort Estimate for Phase 1
**5-7 days of focused Claude Code work.** Breakdown:
- Migration + activity logging backend: 0.5 days
- Agent Activity Feed + While You Were Away: 1 day
- Thinking states (scoring, briefing, seating): 1 day
- Empty state personality sweep: 0.5 days
- Chat Panel (UI + streaming API + context builder): 2-3 days
- Agent Context Provider + layout integration: 0.5 days
- Seed data updates: 0.5 days
- Testing + polish: 0.5 days

### What Surprised Me in the Codebase

**Good surprises:**
- The AI integration depth is impressive. Claude is used for 6 distinct operations (scoring, seating, introductions, briefings, follow-up, enrichment) with well-structured prompts and response parsing.
- The seating optimizer's reasoning log is the closest thing to "agent visibility" in the codebase — it's the template for what every feature should feel like.
- The database schema is clean and well-indexed. Adding agent tables is straightforward.
- The cron-based job processor for async scoring/enrichment is a solid pattern that can be extended for proactive suggestions.

**Bad surprises:**
- No real-time infrastructure at all. Not even a single WebSocket or SSE endpoint. Every interaction is request-response with polling. This will need SSE for the chat panel.
- The activity feed only shows user actions (invitation status changes, RSVP submissions) — never agent actions. The agent is literally invisible on the overview page.
- Company profile is completely absent. The workspace table has only name and slug. There's no company context feeding into any AI operation.
- No state management beyond `useState`. This works for isolated pages but will be strained when the chat panel needs to communicate with the active page (e.g., user says "move James to Table 1" and the seating chart updates).
- Empty states are functional but soulless. "No data yet" repeated 15 different ways, never once with personality.

---

*This plan should be executed in order. Phase 1 is the priority — it creates the paradigm shift. Phases 2-4 build on it. The Quick Wins can be done immediately, even before Phase 1 infrastructure, as they require no new tables or APIs.*

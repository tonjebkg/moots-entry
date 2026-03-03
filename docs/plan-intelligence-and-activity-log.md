# Implementation Plan: Moots Intelligence + Activity Log + Messaging Bridge

## Overview

Three features built in parallel:
- **Track A**: Moots Intelligence — platform-wide AI with dynamic prompts, cross-event context, AI actions with confirmation, and improved UX
- **Track B**: Activity Log — new event tab showing all mutations with filters, staff identification, and seed data
- **Track C**: Messaging Bridge — Telegram + WhatsApp integration using OpenClaw's adapter patterns (grammY + Baileys), team member auth, full platform context from messaging

---

## Track A: Moots Intelligence Upgrade (Layer 1 — Dashboard Chat)

### What Already Exists
- `ChatPanel` component floating at bottom of every event page
- SSE streaming chat via `/api/events/[eventId]/agent/chat` using Claude Sonnet 4
- Hardcoded tab-specific suggested prompts in `ChatPanel.tsx`
- `AgentContextProvider` with state management
- `lib/agent/context-builder.ts` builds system prompt with event context
- `agent_activity_log` and `agent_conversations` tables

### What We Build

#### A1. Global Context Builder

**New file**: `lib/agent/global-context-builder.ts`

Builds a cross-event system prompt for non-event pages. Queries:
- Event summary: all events with title, date, status, invited/confirmed/pending counts
- People summary: total contacts, top engaged (by attendance count), recently added, dormant (no invite in 6+ months)
- Contact detail (if contactId provided): all invitations across events, all scores, check-in history, notes, team assignments
- Workspace summary: team members, recent activity

Returns a structured system prompt string that tells Claude it is "Moots Intelligence" with access to the full organizational knowledge graph.

#### A2. Global Chat API Endpoint

**New file**: `app/api/agent/chat/route.ts`

Streaming chat endpoint that works **without** an event ID. Same SSE pattern as the existing event chat.

- Accepts: `{ message, history[], context: { page: string, contactId?: string } }`
- Calls `buildGlobalSystemPrompt()` from A1
- Streams response via SSE using Claude Sonnet 4
- Saves conversation to `agent_conversations` with `event_id = null`
- Includes `context_source` metadata in stream (e.g. "Based on 4 events", "From People database")
- Auth: requires OWNER, ADMIN, or TEAM_MEMBER

#### A3. Dynamic AI-Generated Suggested Prompts

**New file**: `app/api/agent/prompts/route.ts`

API endpoint that generates 3 contextual prompts based on where the user is and what the data looks like. NOT hardcoded — calls Claude (haiku for speed) with a compact context payload.

- Accepts: `{ page: string, eventId?: string, tab?: string }`
- Assembles a minimal context snapshot:
  - Events list: upcoming count, events needing attention (low RSVPs, upcoming deadlines)
  - People page: total contacts, dormant count, unscored count
  - Event tab: event status, tab name, key metrics for that tab (e.g. pending invitations on Invitations tab, unchecked guests on Check-in tab)
- Returns: `{ prompts: string[] }` — 3 suggested questions
- Cache: 5-minute TTL per page+context combination (in-memory Map)

**New file**: `app/components/agent/SuggestedPrompts.tsx`

Shared component that fetches from `/api/agent/prompts` on mount and renders 3 prompt pills. Falls back to smart static defaults if the API call fails or takes too long (1.5s timeout).

Fallback defaults per page:
- **Events list**: "Which event needs the most attention?", "Compare acceptance rates across my events", "Any guest overlaps between upcoming events?"
- **People page**: "Who are my most engaged contacts?", "Find contacts not invited in 6+ months", "Which contacts match multiple targeting criteria?"
- **Event Overview**: "Summarize what needs my attention", "What's the strategic profile of confirmed guests?", "Any risks I should know about?"
- Other event tabs: existing hardcoded prompts extracted from ChatPanel

#### A4. AI Actions with Confirmation

**Modify**: `app/api/events/[eventId]/agent/chat/route.ts` and new `app/api/agent/chat/route.ts`

Extend the system prompt to tell Claude it can suggest actions. When Claude wants to perform an action, it outputs a structured block:

```
[ACTION_PROPOSAL]
type: check_in | move_guest | add_note | add_to_pool
params: { ... }
description: "Check in Walter Edmonds"
[/ACTION_PROPOSAL]
```

The frontend parses this from the stream and renders a confirmation card:
```
┌─────────────────────────────────────────┐
│ Moots Intelligence wants to:            │
│ Check in Walter Edmonds                 │
│                                         │
│   [Confirm]    [Cancel]                 │
└─────────────────────────────────────────┘
```

On confirm, the frontend calls the existing API route (e.g. `POST /api/events/[eventId]/checkin`) and logs the action with `metadata: { source: 'moots_intelligence', confirmed_by: userId }`.

**New file**: `app/components/agent/ActionConfirmation.tsx`

Renders the confirmation card inside the chat panel. Handles confirm/cancel, shows loading state, and displays success/error result.

#### A5. GlobalChatPanel Component

**New file**: `app/components/agent/GlobalChatPanel.tsx`

Variant of ChatPanel for non-event pages:
- Calls `/api/agent/chat` instead of event-scoped endpoint
- Passes `context.page` to indicate location
- Uses `SuggestedPrompts` component from A3
- Same floating bottom-bar UI, same streaming behavior
- Includes cross-event context indicator on responses

#### A6. Prompt Visibility Upgrade

**Modify**: `ChatPanel.tsx` prompt pills + new `SuggestedPrompts.tsx`

- Font: 14px minimum (up from ~12px)
- Background: `bg-[#FAF8F5]` cream with `border-[#B05C3B]/30` terracotta border
- Label above: "ASK MOOTS" in small caps, forest green `text-[#2D6A4F]`
- Hover: `bg-[#F5F0EB]` darker cream, `shadow-sm`
- Animation: `@keyframes slideUp` — fade-in + 8px slide-up, 300ms ease-out, staggered by 50ms per pill
- Prompt pills wrap to new line on small screens

#### A7. Add GlobalChatPanel to Non-Event Pages

**Modify**: `app/dashboard/page.tsx` (Events list) — add `<GlobalChatPanel page="events-list" />`
**Modify**: `app/dashboard/people/page.tsx` (People database) — add `<GlobalChatPanel page="people" />`
**Modify**: Contact profile page/drawer (if it exists) — add `<GlobalChatPanel page="contact-profile" contactId={id} />`

#### A8. Cross-Event Context Indicator

When the AI response draws from cross-event data, show a subtle tag at the top of the response bubble:

```
┌──────────────────────────────────────────┐
│ ⓘ Based on 4 events · People database   │  ← subtle, gray-500, 12px
├──────────────────────────────────────────┤
│ Eleanor Blackwood has attended 3 of your │
│ last 4 events. Her engagement is...      │
└──────────────────────────────────────────┘
```

Implemented by including `[CONTEXT_SOURCE: ...]` markers in the system prompt instructions. Claude outputs these, the frontend parses and renders them as the subtle header.

---

## Track B: Activity Log Tab

### What Already Exists
- `audit_logs` table with workspace_id, actor_id, actor_email, action, entity_type, entity_id, previous_value, new_value, metadata, ip_address, created_at
- `logAction()` utility in `lib/audit-log.ts` (fire-and-forget)
- `/api/audit-logs` endpoint (workspace-level, used by settings page)
- `agent_activity_log` table for AI-specific activities

### What We Build

#### B1. Event-Scoped Activity Log API

**New file**: `app/api/events/[eventId]/activity-log/route.ts`

GET endpoint that queries `audit_logs` + `agent_activity_log` filtered by event:

```sql
-- Audit logs for this event
SELECT al.id, al.actor_id, al.actor_email, al.action, al.entity_type,
       al.entity_id, al.new_value, al.metadata, al.created_at,
       u.full_name as actor_name, u.avatar_url as actor_avatar
FROM audit_logs al
LEFT JOIN users u ON u.id = al.actor_id
WHERE al.metadata->>'event_id' = $eventId::text
   OR (al.entity_id = $eventId::text AND al.entity_type = 'event')

UNION ALL

-- Agent activity for this event (mapped to AI Action type)
SELECT aal.id, NULL as actor_id, 'system' as actor_email,
       'ai.' || aal.activity_type as action, 'agent_activity' as entity_type,
       aal.event_id::text as entity_id, NULL as new_value,
       aal.metadata, aal.created_at,
       'Moots Intelligence' as actor_name, NULL as actor_avatar
FROM agent_activity_log aal
WHERE aal.event_id = $eventId

ORDER BY created_at DESC
LIMIT $limit OFFSET $offset
```

Query params: `actor_id`, `action_type`, `from`, `to`, `search`, `page`, `limit`

Response:
```ts
{
  entries: ActivityLogEntry[]
  pagination: { page, limit, total, total_pages }
  actors: { id, name, avatar_url }[] // for filter dropdown
}
```

#### B2. Comprehensive Action Logging

Add `logAction()` calls to mutation routes, all with `metadata: { event_id: eventId }`:

| Route | Action | Entity Type |
|-------|--------|-------------|
| `POST /api/events/[eventId]/checkin` | `checkin.guest` | `event_checkin` |
| `POST /api/events/[eventId]/checkin/walk-in` | `checkin.walkin` | `event_checkin` |
| `POST /api/events/[eventId]/campaigns` | `campaign.created` | `invitation_campaign` |
| `POST /api/events/[eventId]/add-to-campaign` | `invitation.sent` | `campaign_invitation` |
| `POST /api/events/[eventId]/team-assignments` | `team.assigned` | `guest_team_assignment` |
| `POST /api/events/[eventId]/scoring` | `scoring.completed` | `guest_score` |
| `PATCH /api/events/[eventId]/details` | `event.updated` | `event` |
| `POST /api/events/[eventId]/contacts/[contactId]/notes` | `note.added` | `contact_note` |
| `POST /api/events/[eventId]/briefings` | `briefing.generated` | `briefing_packet` |
| `POST /api/events/[eventId]/follow-up` | `followup.created` | `follow_up_sequence` |
| `PATCH /api/events/[eventId]/follow-up/[id]` | `followup.updated` | `follow_up_sequence` |
| `POST /api/events/[eventId]/objectives` | `targeting.created` | `event_objective` |
| `PATCH /api/events/[eventId]/capacity` | `event.capacity_updated` | `event` |

Each log includes: `newValue` with relevant data, `actorId`/`actorEmail` from session, `metadata.event_id`.

#### B3. Activity Log Tab Page

**New file**: `app/dashboard/[eventId]/activity-log/page.tsx`

Full-featured activity log UI:

**Filter bar** (sticky, z-20):
- Team member dropdown (populated from API response `actors[]`)
- Action type multi-select pills (Guest Added, Check-in, Invitation, Scoring, AI Action, Team, Note, Settings, Targeting, Follow-Up, Briefing, Profile)
- Date range quick presets: Today, Last 7 days, Last 30 days, All time
- Free text search input

**Log feed**:
- Reverse-chronological, grouped by day headers ("Today", "Yesterday", "March 1, 2026")
- Each entry: avatar circle (initials) → actor name → action description with **clickable target** → relative timestamp (full on hover)
- Below: action type badge (colored pill) + tab/area badge
- Bulk actions: expandable — "Marcus Rivera checked in 5 guests" → click to expand names
- Load more button for pagination

**Action type badge colors**:
- Guest Added: `bg-emerald-50 text-emerald-700 border-emerald-200`
- Check-in: `bg-orange-50 text-[#B05C3B] border-orange-200` (terracotta)
- Invitation: `bg-blue-50 text-blue-700 border-blue-200`
- Scoring: `bg-amber-50 text-amber-700 border-amber-200`
- AI Action: `bg-purple-50 text-purple-700 border-purple-200` (sparkle icon)
- Team: `bg-teal-50 text-teal-700 border-teal-200`
- Note: `bg-gray-50 text-gray-600 border-gray-200`
- Settings: `bg-gray-50 text-gray-600 border-gray-200`
- Targeting: `bg-amber-50 text-amber-700 border-amber-200`
- Follow-Up: `bg-indigo-50 text-indigo-700 border-indigo-200`
- Briefing: `bg-cyan-50 text-cyan-700 border-cyan-200`
- Messaging: `bg-green-50 text-green-700 border-green-200` (with channel icon: Telegram/WhatsApp/Web)

#### B4. Add Activity Log Tab to Navigation

**Modify**: `app/components/EventTabNavigation.tsx`

Add after Analytics, outside phase groupings:
```ts
{ key: 'activity-log', label: 'Activity Log', phase: null, href: `/dashboard/${eventId}/activity-log` }
```

#### B5. Staff Identification for Check-in

**Modify**: Staff check-in page/components

1. Name entry screen shown before guest list is visible
2. Staff name stored in `sessionStorage`
3. Passed to check-in API as `staffName` parameter
4. Logged with `actor_email = "staff:{name}"` when no authenticated session
5. "Logged in as: {Name}" indicator + "Switch" link at top of check-in screen

#### B6. Seed Activity Log Data

**New file**: `scripts/seed-activity-log.ts`

Pre-populate `audit_logs` with ~50 realistic chronological entries for the demo event, using real actor names (Sarah Chen, Marcus Rivera, Julia Park) and guest names from seed data. Follows the timeline from the spec:
- 2 weeks before: event creation, targeting criteria, contact import, AI scoring
- 10 days before: campaign creation, campaign sent, acceptances/declines
- 1 week before: team assignments, briefings generated, notes added
- Event day: check-ins with timestamps, walk-in registrations
- Post-event: follow-up emails sent, AI summary generated

---

## Track C: Messaging Bridge (WhatsApp + Telegram)

### Architecture Decision

OpenClaw uses a persistent Gateway process that holds long-lived connections to WhatsApp (Baileys WebSocket) and Telegram (grammY long polling). We need the same pattern because:
- **WhatsApp via Baileys** requires a persistent WebSocket connection + 250-400MB RAM. Cannot run in serverless.
- **Telegram via grammY** can use either long polling (needs persistent process) or webhooks (works with serverless).

**Our approach**: A standalone Node.js service (`services/message-bridge/`) that runs alongside the Next.js app. It communicates with Moots backend via internal API calls to the same endpoints the dashboard uses.

```
┌──────────────┐     ┌────────────────────────┐     ┌──────────────┐
│  WhatsApp    │     │  Moots Message Bridge   │     │  Moots API   │
│  (Baileys)   │────▶│  (standalone Node.js)   │────▶│  (Next.js)   │
│              │◀────│                          │◀────│              │
├──────────────┤     │  - Adapter layer         │     │  /api/agent/ │
│  Telegram    │────▶│  - Auth lookup           │     │  /api/events/│
│  (grammY)    │◀────│  - Context routing       │     │  /api/...    │
└──────────────┘     │  - Response formatting   │     └──────────────┘
                     └────────────────────────┘
                                │
                                ▼
                     ┌────────────────────────┐
                     │  Shared Neon Database   │
                     │  (team_member_channels, │
                     │   audit_logs, etc.)     │
                     └────────────────────────┘
```

### What We Build

#### C1. Database: Team Member Channel Linking

**New migration**: `migrations/019_messaging_channels.sql`

```sql
CREATE TABLE IF NOT EXISTS team_member_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL,         -- 'telegram', 'whatsapp'
  channel_user_id TEXT NOT NULL,      -- Telegram user ID or WhatsApp phone number
  display_name TEXT,                  -- Name shown in messaging app
  is_verified BOOLEAN DEFAULT FALSE,
  paired_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(channel_type, channel_user_id)
);

CREATE INDEX idx_team_member_channels_lookup ON team_member_channels(channel_type, channel_user_id);
CREATE INDEX idx_team_member_channels_user ON team_member_channels(user_id);

-- Store message bridge conversation history (separate from dashboard conversations)
CREATE TABLE IF NOT EXISTS messaging_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  channel_type TEXT NOT NULL,
  channel_user_id TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### C2. Message Bridge Core

**New directory**: `services/message-bridge/`

```
services/message-bridge/
├── package.json          # Dependencies: grammy, @whiskeysockets/baileys, dotenv
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point — starts adapters
│   ├── config.ts         # Environment config (bot tokens, DB URL, API base URL)
│   ├── types.ts          # Shared types (NormalizedMessage, BridgeResponse)
│   ├── adapters/
│   │   ├── telegram.ts   # Telegram adapter (grammY)
│   │   └── whatsapp.ts   # WhatsApp adapter (Baileys)
│   ├── auth.ts           # Look up team member by channel_type + channel_user_id
│   ├── router.ts         # Route normalized messages to Moots AI engine
│   ├── context.ts        # Build AI context from team member's workspace data
│   └── logger.ts         # Log all messaging actions to audit_logs
```

**Normalized message type** (adapted from OpenClaw's pattern):
```ts
interface NormalizedMessage {
  channelType: 'telegram' | 'whatsapp'
  channelUserId: string        // Telegram numeric ID or WhatsApp phone
  displayName: string
  text: string
  replyToMessageId?: string
  media?: { type: 'image' | 'voice' | 'document'; url: string }
  timestamp: Date
}

interface BridgeResponse {
  text: string
  actions?: ActionProposal[]   // Same as dashboard AI actions
}
```

#### C3. Telegram Adapter (grammY)

**File**: `services/message-bridge/src/adapters/telegram.ts`

Following OpenClaw's pattern with grammY:

```ts
import { Bot, Context } from 'grammy'

export function createTelegramAdapter(config: TelegramConfig, onMessage: MessageHandler) {
  const bot = new Bot(config.botToken)

  // DM handler
  bot.on('message:text', async (ctx: Context) => {
    const normalized: NormalizedMessage = {
      channelType: 'telegram',
      channelUserId: String(ctx.from.id),
      displayName: ctx.from.first_name + (ctx.from.last_name ? ' ' + ctx.from.last_name : ''),
      text: ctx.message.text,
      timestamp: new Date(ctx.message.date * 1000),
    }
    const response = await onMessage(normalized)
    await ctx.reply(response.text, { parse_mode: 'HTML' })
  })

  // Pairing command
  bot.command('pair', async (ctx) => {
    // Generate a 6-digit pairing code, store in DB
    // User enters this code in the Moots dashboard to link accounts
  })

  bot.start()
  return bot
}
```

**Pairing flow**:
1. Team member messages the bot: `/pair`
2. Bot generates a 6-digit code, stores it in `team_member_channels` with `is_verified = false`
3. Bot replies: "Your pairing code is 482901. Enter this in Moots Dashboard → Settings → Messaging to link your account."
4. Team member enters code in dashboard → verifies → sets `is_verified = true`, links `user_id`
5. Subsequent messages are authenticated and get full platform context

**Unauthenticated handling**: If a message comes from an unknown Telegram user, reply: "I don't recognize this account. Use /pair to link your Telegram to your Moots account."

#### C4. WhatsApp Adapter (Baileys)

**File**: `services/message-bridge/src/adapters/whatsapp.ts`

Following OpenClaw's Baileys pattern:

```ts
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys'

export async function createWhatsAppAdapter(config: WhatsAppConfig, onMessage: MessageHandler) {
  const { state, saveCreds } = await useMultiFileAuthState(config.credentialsPath)

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,   // QR code shown in terminal for pairing
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text
      if (!text) continue

      const normalized: NormalizedMessage = {
        channelType: 'whatsapp',
        channelUserId: msg.key.remoteJid!.replace('@s.whatsapp.net', ''),
        displayName: msg.pushName || 'Unknown',
        text,
        timestamp: new Date(msg.messageTimestamp as number * 1000),
      }
      const response = await onMessage(normalized)
      await sock.sendMessage(msg.key.remoteJid!, { text: response.text })
    }
  })

  return sock
}
```

**Pairing**: QR code printed to terminal on first run. Scan with WhatsApp linked devices. Credentials saved to `~/.moots/credentials/whatsapp/`.

**Phone number matching**: WhatsApp messages include the sender's phone number. Match against `team_member_channels` where `channel_type = 'whatsapp'` and `channel_user_id` = phone number (normalized).

#### C5. Message Router & AI Context

**File**: `services/message-bridge/src/router.ts`

The router is the brain — it receives normalized messages and:

1. **Authenticates**: Looks up `team_member_channels` by channel_type + channel_user_id → gets `user_id` + `workspace_id`
2. **Loads context**: Fetches the team member's workspace data:
   - All events they have access to (upcoming, recent)
   - If the message references an event or guest, focus context on that
3. **Calls Moots Intelligence**: Makes an internal HTTP call to the Moots API (same Claude Sonnet 4 engine):
   - For event-specific queries: `POST /api/events/[eventId]/agent/chat`
   - For cross-event queries: `POST /api/agent/chat`
   - Passes conversation history from `messaging_conversations`
4. **Formats response**: Converts AI response to channel-appropriate format (HTML for Telegram, plain text for WhatsApp)
5. **Logs action**: Writes to `audit_logs` with `metadata: { channel: 'telegram', channel_user_id: '...' }` and the team member as actor

**Intent detection** (simple keyword matching, not AI):
- Message contains an event name → route to event-scoped chat
- Message starts with "check in" → route to check-in action
- Message starts with "note:" → route to add-note action
- Default → route to global cross-event chat

#### C6. Dashboard Pairing UI

**New file**: `app/dashboard/settings/messaging/page.tsx`

Settings page where team members link their messaging accounts:

```
┌─────────────────────────────────────────────────────────┐
│ Messaging Integrations                                   │
│ Connect your messaging accounts to chat with Moots      │
│ Intelligence from your phone.                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Telegram                          [Connected ✓]          │
│ @marcus_rivera                    [Disconnect]           │
│ Paired Mar 1, 2026                                       │
│                                                          │
│ WhatsApp                          [Not Connected]        │
│ Enter pairing code: [______] [Verify]                    │
│                                                          │
│ ─────────────────────────────────────────────────────── │
│ How it works:                                            │
│ 1. Message our Telegram bot @MootsIntelBot              │
│ 2. Send /pair to get a pairing code                     │
│ 3. Enter the code above                                  │
│ 4. Start chatting with full platform access              │
└─────────────────────────────────────────────────────────┘
```

**API routes**:
- `POST /api/settings/messaging/pair` — verify pairing code, link channel to user
- `DELETE /api/settings/messaging/[channelId]` — disconnect a channel
- `GET /api/settings/messaging` — list connected channels for current user

#### C7. Activity Log Integration

All messaging interactions are logged to `audit_logs` with:
- `action`: the operation (e.g. `messaging.query`, `messaging.checkin`, `messaging.note`)
- `actor_id`: the authenticated team member's user_id
- `metadata.channel`: `'telegram'` or `'whatsapp'`
- `metadata.channel_user_id`: the sender's platform ID
- `metadata.event_id`: if the action was event-scoped

In the Activity Log tab (Track B), messaging actions show with a channel icon:
- "Marcus Rivera (via Telegram) checked in Walter Edmonds"
- "Sarah Chen (via WhatsApp) added a note on Eleanor Blackwood"

---

## Execution Order (Three Parallel Tracks)

### Track A: Moots Intelligence (Agent 1)

| Step | Task | Files |
|------|------|-------|
| A1 | Global context builder | `lib/agent/global-context-builder.ts` |
| A2 | Global chat API endpoint | `app/api/agent/chat/route.ts` |
| A3 | Dynamic suggested prompts API + component | `app/api/agent/prompts/route.ts`, `app/components/agent/SuggestedPrompts.tsx` |
| A4 | AI actions with confirmation | Modify `agent/chat` routes, new `app/components/agent/ActionConfirmation.tsx` |
| A5 | GlobalChatPanel component | `app/components/agent/GlobalChatPanel.tsx` |
| A6 | Prompt visibility upgrade | Modify `ChatPanel.tsx`, `SuggestedPrompts.tsx` |
| A7 | Add GlobalChatPanel to pages | Modify `dashboard/page.tsx`, `dashboard/people/page.tsx` |
| A8 | Cross-event context indicator | Modify chat components |

### Track B: Activity Log (Agent 2)

| Step | Task | Files |
|------|------|-------|
| B1 | Activity Log API endpoint | `app/api/events/[eventId]/activity-log/route.ts` |
| B2 | Add logAction to ~13 mutation routes | Modify API route files |
| B3 | Activity Log tab page | `app/dashboard/[eventId]/activity-log/page.tsx` |
| B4 | Add tab to navigation | Modify `EventTabNavigation.tsx` |
| B5 | Staff identification flow | Modify check-in components |
| B6 | Seed activity log data | `scripts/seed-activity-log.ts` |

### Track C: Messaging Bridge (Agent 3)

| Step | Task | Files |
|------|------|-------|
| C1 | Migration: team_member_channels + messaging_conversations | `migrations/019_messaging_channels.sql` |
| C2 | Message bridge scaffold | `services/message-bridge/` package setup |
| C3 | Telegram adapter (grammY) | `services/message-bridge/src/adapters/telegram.ts` |
| C4 | WhatsApp adapter (Baileys) | `services/message-bridge/src/adapters/whatsapp.ts` |
| C5 | Message router + AI context | `services/message-bridge/src/router.ts`, `context.ts`, `auth.ts` |
| C6 | Dashboard pairing UI + API | `app/dashboard/settings/messaging/page.tsx`, API routes |
| C7 | Activity log integration for messaging | Modify `lib/audit-log.ts`, bridge logger |

### Track D: Verify (After A + B + C)
- `npx tsc --noEmit` — clean compile for Next.js app
- `cd services/message-bridge && npx tsc --noEmit` — clean compile for bridge
- Visual check: GlobalChatPanel on `/dashboard` and `/dashboard/people`
- Visual check: Activity Log tab on `/dashboard/{eventId}/activity-log`
- Run seed script for activity log demo data
- Test Telegram bot pairing flow (requires `TELEGRAM_BOT_TOKEN` env var)

---

## Dependencies & Environment Variables

**New npm dependencies** (Next.js app): none — all changes use existing deps.

**New npm dependencies** (Message Bridge service):
- `grammy` — Telegram Bot API framework
- `@whiskeysockets/baileys` — WhatsApp Web API
- `dotenv` — environment config
- `@neondatabase/serverless` — same DB driver as main app

**New environment variables**:
- `TELEGRAM_BOT_TOKEN` — from BotFather
- `WHATSAPP_CREDENTIALS_PATH` — path to Baileys credential store (default: `~/.moots/credentials/whatsapp`)
- `MESSAGE_BRIDGE_API_BASE` — internal URL for the Next.js API (default: `http://localhost:3000`)
- `MESSAGE_BRIDGE_API_KEY` — internal API key for bridge → app communication (bypasses session auth)

---

## Out of Scope (Future Sprints)

- Proactive AI heartbeat/notifications pushed to messaging (requires cron/scheduler infrastructure)
- Voice message transcription (WhatsApp/Telegram voice notes → text)
- Agent collaboration (Scoring Agent triggering Enrichment Agent, etc.)
- Learning & Adaptation (Tier 2/3 memory, pattern detection)
- Global Command-K search bar
- Slack, iMessage, SMS adapters
- Rich media in messaging responses (PDFs, images, inline keyboards)
- Staff SMS verification for check-in (using name-only for now)

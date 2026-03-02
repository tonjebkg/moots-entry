# Context Tab — Feature Spec

> New tab for the event detail page. Add this alongside existing tabs (Overview, Objectives, Guest Intelligence, etc.)

---

## What This Tab Does

The Context tab is where event hosts feed the AI everything about their event — documents, links, strategic notes. It's the foundation that powers all downstream intelligence (guest scoring, invitations, briefings, seating, follow-up).

**Key design principle**: The AI visibly shows its work through a live activity feed streamed via SSE (same pattern as Claude's streaming API). Not a passive form. Not a simple chat. The AI reads documents, researches market context, surfaces insights — and the user watches it happen in real-time.

---

## Layout

Full-height split-screen within the event detail page. Two equal columns (`grid grid-cols-2`), each scrollable independently.

```
┌─────────────────────────────────────────────────────────┐
│  [Existing event header + tab nav — Context is active]  │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│   LEFT PANEL             │   RIGHT PANEL                │
│   Event Context          │   AI Activity Feed           │
│                          │                              │
│   ┌─ Generated Context ─┐│   ┌─ Moots Intelligence ────┐│
│   │  Sponsors            ││   │  [timeline of AI work]  ││
│   │  Strategic Signif.   ││   │  reading...             ││
│   │  Market Context      ││   │  extracted...           ││
│   │  Completeness %      ││   │  insight...             ││
│   └──────────────────────┘│   │  [user message bubble]  ││
│                          │   │  [speaker cards]         ││
│   ▸ Event Details (edit) │   │                          ││
│   ▸ Documents (upload)   │   └──────────────────────────┘│
│   ▸ Links & References   │                              │
│                          │   ┌─ Input Bar ──────────────┐│
│   [Generate Context btn] │   │  Ask Moots to research...││
│                          │   └──────────────────────────┘│
└──────────────────────────┴──────────────────────────────┘
```

---

## Left Panel — Event Context

Single scrollable area with a fixed header and a fixed bottom button. Content hierarchy matters — **Generated Context is the most important output and must be at the top, never hidden behind tabs or collapsed**.

### Content (top to bottom):

**1. Header** (fixed)
- "Event Context" title + subtitle: "Add documents, links, and information. The more context, the smarter the AI."

**2. Generated Context** (TOP of scrollable area — most important)

Before generation: placeholder card with sparkle icon + "Generated context will appear here".

After generation — four stacked cards:

- **Sponsors Card**: White card. Lists each sponsor with building icon, name, role, tier badge ("Primary" = brand colour, "Gold" = warn colour).
- **Strategic Significance Card**: Brand-light background, subtle brand border. Sparkle icon + label. AI-generated paragraph on strategic purpose.
- **Market Context Card**: Warn-light background, gold border. Zap icon + "AI Researched" badge. Paragraph on competing events, timing.
- **Completeness Card**: White card, progress bar (accent fill), chip tags per item (green+check=done, grey=missing). Items: Event basics, Date & venue, Strategic purpose, Sponsors identified, Documents analysed, Market context, Dress code, Evening agenda/flow, Dietary requirements.

**3. Event Details** (CollapsibleSection — editable)
- Starts open when no context generated, auto-collapses after generation
- "Editable" badge on header
- 88×88 square event image upload (gradient placeholder → initials when uploaded, "Change" overlay on hover)
- Event name + type: inline editable
- 2-column grid of icon+label+editable fields: Date, Time, Location, Capacity, Host, Dress Code
- Multiline description
- All fields pre-populated from the event creation form
- **Inline editing**: click to edit, brand-coloured border on input, Enter saves, Escape cancels, onBlur saves. Dashed underline hover hint in display mode.
- On save: optimistic UI + `PATCH /api/events/[eventId]/details` → revert on failure + toast

**4. Documents** (CollapsibleSection)
- Badge shows count. Open by default when empty, collapses after generation.
- Drag & drop upload zone (`<input type="file" multiple accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt">`)
- File list: colour-coded type icon (red=PDF, green=XLSX, blue=DOCX), name, size, status badge, delete button
- Status progression: `uploading` → `queued` → `analyzing` (spinner) → `analyzed` (checkmark) → `error` (retry)
- Upload: multipart POST to `/api/events/[eventId]/documents/upload` → Azure Blob at `events/{eventId}/documents/{uuid}-{filename}`. Max 50MB. Optimistic UI.

**5. Links & References** (CollapsibleSection)
- "Add" button → inline URL input. Hostname extracted for label.
- List: globe icon + hostname + URL + delete

**6. Generate Context Button** (fixed bottom)
- Only visible when documents.length > 0
- States: "✦ Generate Context" → "⟳ Analysing documents..." (disabled) → "✦ Re-generate Context"

---

## Right Panel — AI Activity Feed

### Header (fixed)
- Sparkle avatar (30px circle) + "Moots Intelligence" title
- Status line: "Active · Watching for context" (accent green) | "Processing..." (brand, animated) | "Ready" (grey)

### Activity Feed (scrollable timeline)

Each item: 28px circle icon dot → 2px vertical connector line → content area.

#### Activity Types:

| Type | Icon | Dot BG | Label Colour | Purpose |
|------|------|--------|--------------|---------|
| `waiting` | Sparkle | — | Grey | Initial prompt, waiting for input |
| `reading` | Eye | `#F5F3F0` | Brand | Currently reading a document |
| `extracted` | Check | `#F5F3F0` | Accent | Extracted info from document |
| `researching` | Search | `#F5F3F0` | `#6B5CE7` (purple) | Searching external sources |
| `found` | Zap | `#F5F3F0` | Warn gold | Found external intelligence |
| `insight` | Lightbulb | `#F5F3F0` | Brand | AI insight/recommendation |
| `suggestion` | Sparkle | Brand Light | Brand | Suggested next actions |
| `user` | Users | Border | Text dark | User's own message |
| `speaker_card` | Users | `#EDE8FF` | Purple | Speaker candidate cards |
| `complete` | Check | Accent Light | Accent | Task completed |

**Active items** (`reading`, `researching`): animated spinner icon + CSS pulse when they're the latest item.

#### Rich content on activity items:
- `details[]` → bulleted list in a subtle cream card with border
- `actions[]` → primary (brand filled) + secondary (brand outline) buttons that trigger real platform actions
- `speakers[]` → expandable SpeakerCard components (see below)
- `timestamp` → small grey text

#### User Messages
Dark bubble: `bg-[text colour] text-white`, rounded with bottom-left square corner. Visually distinct from AI items.

#### Speaker Profile Cards (expandable)

**Collapsed**: avatar circle (colour-coded by rank: 1=brand, 2=accent, 3=purple, 4=grey), name, title, "Top Pick" badge (#1), relevance score (large number, colour-coded: ≥95 accent, ≥90 dark green, ≥85 warn), quick info tags, "Click to see full profile" hint.

**Expanded** (click toggle): + past events, speaking experience, fit analysis, relationship status, action buttons ("Draft outreach" primary, "Add to guest list" secondary, "View full profile" tertiary).

#### Scroll Behaviour
- Auto-scroll to bottom ONLY when new activity streams from user interaction (send message, generate context). Never on initial page load.
- Track scroll position: if user scrolls up → stop auto-scrolling.
- "↓ Latest activity" floating pill button when scrolled up. Brand colour, centered, with shadow.

### Input Bar (fixed bottom)
- Placeholder: "Ask Moots to research, look up sponsors, find competing events..."
- Send button: brand when text present, muted when empty
- Enter to send
- On send: immediately add `user` activity item (optimistic), then open SSE stream for AI response

---

## API Routes

### POST `/api/events/[eventId]/context/generate`

Returns an **SSE stream**. This is the core intelligence endpoint.

**Server-side flow:**
1. Fetch event details + all documents from DB
2. Download document content from Azure Blob
3. Extract text (PDF → `pdf-parse`, DOCX → `mammoth`, XLSX → `xlsx` lib)
4. For each document, stream progress:
   - `activity` event: `{ type: "reading", text: "Reading {filename}..." }`
   - `doc_status` event: `{ docId, status: "analyzing" }`
   - `activity` event: `{ type: "extracted", text: "...", details: [...] }`
   - `doc_status` event: `{ docId, status: "analyzed" }`
5. Call Claude API with all extracted text + event details:
   - Use structured output / tool_use for JSON: sponsors, strategic significance, market context, completeness
   - Stream Claude's work as `researching` → `found` → `insight` activities
6. Stream `context_generated` event with full GeneratedContext
7. Save to database
8. Stream `done`

**Claude System Prompt:**
```
You are Moots Intelligence, an AI assistant for professional event hosts.

You have been given documents and event details for an upcoming event. Your job is to:

1. EXTRACT key information from each document (attendee lists, strategic details, sponsor info, venue details)
2. RESEARCH market context — identify competing events, industry timing, strategic considerations
3. SYNTHESISE a rich event context:
   - Sponsors (name, role, tier)
   - Strategic significance (why this event matters, what the host wants to achieve)
   - Market context (what else is happening, competing events, timing)
   - Completeness assessment (what context is still missing)
4. Surface INSIGHTS — non-obvious connections, risks, opportunities

Output structured JSON matching the GeneratedContext interface.
Also output activity items as you work — these stream to the user in real-time.

Be specific, opinionated, and actionable. The host is a professional who wants intelligence, not summaries.
```

**SSE wire format:**
```
data: {"type":"activity","data":{"type":"reading","text":"Reading Q2_Brief.pdf..."}}

data: {"type":"doc_status","data":{"docId":"abc123","status":"analyzing"}}

data: {"type":"activity","data":{"type":"extracted","text":"Extracted event details","details":["..."]}}

data: {"type":"doc_status","data":{"docId":"abc123","status":"analyzed"}}

data: {"type":"context_generated","data":{"sponsors":[...],"strategicSignificance":"...","marketContext":"...","completeness":[...]}}

data: {"type":"done"}
```

### POST `/api/events/[eventId]/context/chat`

SSE stream. Sends a user message, streams AI response as activity items.

**Request:** `{ "message": "Find keynote speakers from past events" }`

**Server-side:**
1. Save user message as activity
2. Load full event context + conversation history
3. Call Claude with tools:
   - `search_past_events` — search across host's past events for attendees/speakers
   - `search_people_database` — search contact database
   - `research_company` — research companies for sponsor/attendee intel
   - `suggest_speaker_candidates` — return structured SpeakerCandidate[] with relevance scores
   - `update_event_context` — update event details (dress code, agenda, etc.)
4. Stream activity items as Claude works
5. Save all activities to DB

### Other Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/events/[eventId]/documents/upload` | POST | Upload to Azure Blob. Validate type + 50MB max. Return doc metadata. |
| `/api/events/[eventId]/documents/[docId]` | DELETE | Remove document + Azure blob |
| `/api/events/[eventId]/links` | POST/DELETE | Add/remove reference links |
| `/api/events/[eventId]/details` | PATCH | Update single event field from inline edit. Body: `{ field, value }` |
| `/api/events/[eventId]/generated-context` | GET | Fetch saved generated context |

---

## TypeScript Types

```typescript
// New types for Context tab feature

export type ActivityType =
  | "waiting" | "reading" | "extracted" | "researching" | "found"
  | "insight" | "suggestion" | "user" | "speaker_card" | "complete";

export interface ActivityItem {
  id: string;
  eventId: string;
  type: ActivityType;
  text: string;
  timestamp: string;
  details?: string[];
  actions?: ActivityAction[];
  speakers?: SpeakerCandidate[];
  metadata?: Record<string, unknown>;
}

export interface ActivityAction {
  id: string;
  label: string;
  primary: boolean;
  actionType: "navigate_tab" | "update_context" | "trigger_workflow" | "draft_outreach" | "add_to_guest_list";
  payload?: Record<string, unknown>;
}

export interface SpeakerCandidate {
  id: string;
  name: string;
  title: string;
  relevance: number;           // 0–100
  avatarUrl?: string;
  pastEvents: string;
  speakingExperience: string;
  fitAnalysis: string;
  relationshipStatus: string;
}

export interface GeneratedContext {
  id: string;
  eventId: string;
  sponsors: Sponsor[];
  strategicSignificance: string;
  marketContext: string;
  completeness: CompletenessItem[];
  generatedAt: string;
  modelVersion: string;
}

export interface Sponsor {
  name: string;
  role: string;
  tier: "Primary" | "Gold" | "Silver";
}

export interface CompletenessItem {
  label: string;
  done: boolean;
  source?: string;
}

export interface EventDocument {
  id: string;
  eventId: string;
  name: string;
  size: number;
  sizeFormatted: string;
  type: "pdf" | "docx" | "xlsx" | "pptx" | "csv" | "txt";
  blobUrl: string;
  status: "uploading" | "queued" | "analyzing" | "analyzed" | "error";
  errorMessage?: string;
  createdAt: string;
  analyzedAt?: string;
}

export interface EventLink {
  id: string;
  eventId: string;
  url: string;
  label: string;
  createdAt: string;
}

// SSE event types streamed from server
export type SSEEvent =
  | { type: "activity"; data: ActivityItem }
  | { type: "doc_status"; data: { docId: string; status: EventDocument["status"] } }
  | { type: "context_generated"; data: GeneratedContext }
  | { type: "error"; data: { message: string; code: string } }
  | { type: "done" };
```

---

## Key Hooks

### `useContextGeneration(eventId)`
SSE streaming hook. Opens fetch connection to `/context/generate`, parses `data:` lines, dispatches callbacks: `onActivity`, `onDocStatus`, `onContextGenerated`, `onError`, `onDone`. Supports abort/cancel. Returns `{ generate, cancel, isGenerating }`.

### `useActivityFeed(initialActivities)`
Manages activity state + smart auto-scroll. Only scrolls to bottom on new activity when user hasn't scrolled up. Exposes `feedRef`, `bottomRef`, scroll detection, "scroll to bottom" button logic. Returns `{ activities, addActivity, clearActivities, feedRef, bottomRef, handleScroll, scrollToBottom, userScrolled, enableAutoScroll }`.

### `useDocumentUpload(eventId)`
Handles multi-file upload to Azure via API. Optimistic UI (show immediately with "uploading" status). Parallel uploads. Error handling per file. Returns `{ documents, uploadFiles, updateDocStatus, removeDocument, isUploading }`.

### `useEventDetails(eventId)`
Inline edit + optimistic save. Debounced PATCH calls (300ms). Revert on failure + toast. Returns `{ eventData, updateField }`.

---

## User Flows

### Flow 1: First Visit → Upload → Generate

1. Page loads → fetch event details. Left: placeholder + open sections. Right: single `waiting` activity.
2. User uploads files → optimistic UI, Azure upload, status badges.
3. User clicks "Generate Context" → SSE stream begins. Activity feed shows AI reading docs, extracting data, researching market, surfacing insights. Document badges update in real-time. Generated Context cards appear on left panel when `context_generated` event arrives. Collapsible sections auto-collapse.

### Flow 2: Chat Brainstorming

User types in input bar → `user` bubble appears → SSE stream from `/context/chat` → AI researches, returns speaker cards / sponsor intel / agenda suggestions / insights with action buttons.

### Flow 3: Returning User

Page loads with all existing data. Generated Context visible at top. Collapsible sections collapsed. Full activity history in feed. User can re-generate, upload more docs, continue chatting, edit details.

---

## Action Button Behaviour

| actionType | What happens |
|---|---|
| `navigate_tab` | Router push to target tab. `payload.tab` = "objectives", "campaigns", etc. |
| `update_context` | PATCH event detail. `payload.field` + `payload.value`. Re-render left panel. |
| `trigger_workflow` | Start background workflow. `payload.workflow` = "import_contacts", "score_guests", etc. |
| `draft_outreach` | Navigate to Campaigns with pre-filled draft. `payload.contactId` + `payload.template`. |
| `add_to_guest_list` | POST to Guest Intelligence API. `payload.contactId`. Success toast. |

---

## Database Tables

```sql
CREATE TABLE event_activities (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  type VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  details JSONB,
  actions JSONB,
  speakers JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_documents (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  name VARCHAR(500) NOT NULL,
  size_bytes BIGINT,
  file_type VARCHAR(20),
  blob_url TEXT,
  status VARCHAR(20) DEFAULT 'queued',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_at TIMESTAMPTZ
);

CREATE TABLE event_links (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  url TEXT NOT NULL,
  label VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE event_generated_context (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  sponsors JSONB,
  strategic_significance TEXT,
  market_context TEXT,
  completeness JSONB,
  model_version VARCHAR(100),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Error Handling

- **Upload failures**: Error badge + retry button per file. Don't block others.
- **Generation timeout**: 30s silence → "Taking longer than expected" + cancel/retry.
- **Partial generation**: Preserve all streamed activities. Show error item with "Resume" action.
- **Network disconnect**: Detect SSE loss, reconnecting state, auto-retry.
- **Large files**: Client-side 50MB validation. Error toast.
- **Bad file types**: Client-side whitelist. Reject others with toast.
- **Concurrent edits**: Last write wins for event details. Activity feed consistent via DB.
- **Rate limiting**: Debounce inline edits (300ms). Throttle chat (1 per 2s).

---

## Reference Prototype

The interactive prototype `context-tab-v3.jsx` (attached in repo) has all UI components, spacing, visual patterns, and interaction flows implemented as a single React file. Use it as the **visual source of truth** for how components should look and feel. Implement with proper component architecture, real API calls, Azure uploads, and SSE streaming.

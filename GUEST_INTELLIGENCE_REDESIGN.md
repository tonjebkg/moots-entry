# Guest Intelligence Redesign Plan

## Core Concept

Moots serves **banks, PE firms, consulting firms, law firms, and large corporations** who host curated events.

**The most important thing: bringing the right people into the room.**

Hosts need **rich intelligence about every guest** to make curation decisions.

---

## Enrichment Strategy: Multiple Sources

Guest intelligence can come from **any source** - not just LinkedIn or Salesforce.

### Supported Enrichment Sources

**External APIs:**
- LinkedIn / Coresignal (professional profile)
- Salesforce (CRM data sync)
- Clearbit (company intelligence)
- Hunter.io (email verification)

**Integrations:**
- Airtable (custom databases)
- Notion (team knowledge bases)
- Google Sheets (manual data)
- Custom CSV imports

**AI Agents:**
- Claude / GPT agents (research, summarization)
- MCP servers (Model Context Protocol)
- Custom AI workflows

**Manual:**
- Host notes (human curation)
- Team member annotations

### Flexible Tracking

Each enrichment is tracked with:
- **Source**: Where the data came from
- **Timestamp**: When enriched
- **Fields**: Which fields were updated
- **Confidence**: For AI-sourced data (0-1 score)
- **Metadata**: Source-specific context

This means:
- ✅ **No schema changes** when adding new integrations
- ✅ **Full audit trail** of where data came from
- ✅ **Source priority** - e.g., trust Salesforce > AI agent for company name
- ✅ **Re-enrichment** - refresh from any source
- ✅ **Conflict resolution** - show which source provided which field

---

## Data Model: Guest Profile

### Required Fields

```typescript
interface GuestProfile {
  // Identity
  id: string
  event_id: number

  // Structured Name (NOT "full_name")
  first_name: string
  last_name: string

  // Professional Identity
  company: string
  title?: string
  linkedin_url?: string

  // Profile
  profile_picture_url?: string
  email: string
  phone?: string

  // Event Context
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'WAITLIST'
  priority: 'VIP' | 'HIGH' | 'NORMAL' | 'LOW'
  status: 'CONSIDERING' | 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'

  // Curation Intelligence
  introduction_source?: string // Who introduced them
  host_notes?: string // Why they matter for this event
  tags?: string[] // e.g., ["Portfolio CEO", "Key Account", "Board Member"]

  // Enrichment Tracking (flexible for multiple sources)
  enrichment_sources?: EnrichmentSource[]
  last_enriched_at?: string
}

interface EnrichmentSource {
  source: string // 'linkedin', 'salesforce', 'airtable', 'notion', 'ai-agent', 'coresignal', 'mcp-server', etc.
  enriched_at: string // ISO timestamp
  enriched_fields?: string[] // Which fields were enriched (e.g., ['title', 'company', 'profile_picture_url'])
  confidence?: number // 0-1 score for AI-sourced data
  metadata?: Record<string, any> // Source-specific data (API response, agent reasoning, etc.)
}

  // Event Participation
  expected_plus_ones: number
  actual_plus_ones?: number
  checked_in?: boolean
  checked_in_at?: string

  // History (for future)
  past_events?: number[] // Event IDs they attended
  introduction_count?: number // How many people they introduced

  // Timestamps
  invited_at?: string
  rsvp_responded_at?: string
  created_at: string
  updated_at: string
}
```

### Migration Strategy

**NOW:** Update UI and forms to use structured fields
**LATER:** Migrate Neon database once UI is finalized

---

## UI Components

### 1. Guest Detail Panel (NEW)

**Interaction:**
- Click guest name/row → Panel slides in from right (Luma-style)
- 400px wide, full height
- Overlays content with backdrop
- Close via X button or clicking backdrop

**Content Sections:**

```
┌─────────────────────────────────┐
│ [X]                             │
│                                 │
│   [Profile Picture]             │
│   First Name Last Name          │
│   Title @ Company               │
│   [LinkedIn Icon] View Profile  │
│                                 │
├─────────────────────────────────┤
│ Contact                         │
│   📧 email@company.com          │
│   📱 +1 (555) 123-4567         │
│                                 │
├─────────────────────────────────┤
│ Event Context                   │
│   Tier: [TIER_1 ▼]             │
│   Priority: [VIP ▼]            │
│   Status: Accepted              │
│   +1s: [2 ▼]                   │
│                                 │
├─────────────────────────────────┤
│ Curation Intelligence           │
│                                 │
│ Introduced By:                  │
│   Sarah Chen (Partner)          │
│                                 │
│ Host Notes:                     │
│   [Edit]                        │
│   Key LP relationship. CEO of   │
│   portfolio company ($50M ARR). │
│   Strong connector to SaaS      │
│   ecosystem.                    │
│                                 │
│ Tags:                           │
│   [Portfolio CEO] [Key LP] [+]  │
│                                 │
├─────────────────────────────────┤
│ Enrichment Status               │
│   ✓ LinkedIn (Jan 15, 2026)    │
│     title, company, profile pic │
│   ✓ AI Agent (Jan 14, 2026)    │
│     host_notes, tags            │
│   ✓ Salesforce (Jan 10, 2026)  │
│     company, title              │
│   [Re-enrich Profile]           │
│                                 │
├─────────────────────────────────┤
│ Past Events                     │
│   • Q4 2025 Portfolio Dinner    │
│   • Summer 2025 LP Summit       │
│                                 │
└─────────────────────────────────┘
```

### 2. Enhanced Guest Table Row

**Current:** Plain text rows
**New:** Enriched, interactive rows

```
[✓] [Profile Pic] First Last · Company · Title [🔗] [Tier 1] [VIP] [Accepted] [···]
     └─ LinkedIn indicator if enriched
```

**Interaction:**
- Click entire row → Opens detail panel
- Hover → Highlight with subtle background
- Checkbox for bulk actions
- LinkedIn icon shows enrichment status

### 3. Campaign Layout Restructure

**Current Problem:** Invitation Waves stacked on top of guest list

**New Layout: Side-by-side**

```
┌─────────────────────────────────────────────────────────────┐
│ Campaign: Black Ambition Dinner - November Wave            │
├───────────────────┬─────────────────────────────────────────┤
│                   │                                         │
│ Invitation Waves  │  Guest List (scrollable)                │
│                   │                                         │
│ ┌───────────────┐ │  [Search] [Filters]                     │
│ │ Tier 1        │ │                                         │
│ │ 12 guests     │ │  [✓] Jane Smith · Acme · CEO  [VIP]   │
│ │ 8 invited     │ │  [ ] John Doe · Corp · VP    [HIGH]   │
│ │ 5 accepted    │ │  [✓] Sarah Lee · XYZ · Dir   [NORMAL] │
│ │               │ │  ...                                    │
│ │ [Send Wave]   │ │  (click row → detail panel opens)      │
│ └───────────────┘ │                                         │
│                   │                                         │
│ ┌───────────────┐ │                                         │
│ │ Tier 2        │ │                                         │
│ │ 25 guests     │ │                                         │
│ │ ...           │ │                                         │
│ └───────────────┘ │                                         │
│                   │                                         │
│ ┌───────────────┐ │                                         │
│ │ Tier 3        │ │                                         │
│ │ 40 guests     │ │                                         │
│ │ ...           │ │                                         │
│ └───────────────┘ │                                         │
│                   │                                         │
│ ┌───────────────┐ │                                         │
│ │ Waitlist      │ │                                         │
│ │ 15 guests     │ │                                         │
│ └───────────────┘ │                                         │
│                   │                                         │
└───────────────────┴─────────────────────────────────────────┘
```

**Benefits:**
- Always see tier totals
- Drag/drop guests between tiers (future)
- Scroll guest list independently
- Click guest → detail panel opens

---

## Implementation Phases

### Phase 1: Data Model & Types ✓ PRIORITY

1. Create `types/guest.ts` with full GuestProfile interface
2. Update all forms to collect structured fields:
   - First Name, Last Name (separate fields)
   - Company (required for corporate events)
   - Title
   - LinkedIn URL
   - Introduction Source
   - Host Notes
   - Tags

### Phase 2: Guest Detail Panel Component

1. Create `components/GuestDetailPanel.tsx`
2. Sliding animation from right (Luma-style)
3. All guest intelligence sections
4. Edit mode for host notes, tags, tier, priority
5. Enrichment status indicators

### Phase 3: Update Guest Tables

1. Make all guest table rows clickable
2. Add enrichment indicators (LinkedIn icon)
3. Wire up detail panel on click
4. Update hover states for interactivity

### Phase 4: Campaign Tab Restructure

1. Split-screen layout: Waves left, Guests right
2. Fixed wave sidebar (280px)
3. Scrollable guest list
4. Integrate detail panel

### Phase 5: Overview Tab Redesign

**New Focus: Guest Intelligence Dashboard**

Show:
- Event capacity gauge
- Guest breakdown by tier
- Enrichment status (X% enriched from LinkedIn)
- Recent activity feed
- Quick actions

NOT: Legacy form-heavy interface

### Phase 6: Guests Tab Enhancement

1. Full guest list with filters
2. Bulk operations (move tiers, send invites)
3. Import/export with structured fields
4. Detail panel on row click

---

## Key Decisions for Hosts

The UI must help hosts answer these questions **instantly**:

### 👤 Who is this person?
- Profile picture, name, company, title
- LinkedIn profile link
- Contact information

### 💡 Why are they important?
- Host notes field (primary curation tool)
- Tags (Portfolio CEO, Key LP, Board Member, etc.)
- Introduction source (who vouched for them)

### 🎯 What tier should they be?
- Current tier assignment
- Priority level
- Easy to change (dropdown or drag-drop)

### 📊 What's their history?
- Past event attendance
- Enrichment status
- RSVP/check-in timeline

---

## Design System Consistency

### Colors

**Tier Colors:**
- Tier 1: Purple (VIP tier)
- Tier 2: Blue (Standard)
- Tier 3: Gray (Lower priority)
- Waitlist: Amber (Holding pattern)

**Priority Colors:**
- VIP: Purple
- High: Blue
- Normal: Gray
- Low: Light gray

**Enrichment Status:**
- Enriched: Green checkmark
- Not enriched: Gray circle
- Failed: Red warning

**Status Colors:**
- Invited: Blue
- Accepted: Green
- Declined: Red
- Considering: Gray

### Icons (Lucide)

- User: guest profile
- Building: company
- Briefcase: title/role
- Linkedin: LinkedIn enrichment
- Mail: email contact
- Phone: phone contact
- Tag: tags/labels
- FileText: host notes
- Users: introduction source
- Calendar: past events
- Check: enriched/completed
- AlertCircle: not enriched/warning

---

## Success Metrics

**UI must enable:**

1. **Fast Curation** - Click guest → see full intelligence in <1 second
2. **Confident Decisions** - Host notes + tags + enrichment = clear tier assignment
3. **No Missed Opportunities** - Rich profiles help identify key guests
4. **Efficient Workflows** - Edit inline, bulk operations, quick tier changes

---

## Database Migration (Later)

**Schema Changes Needed:**

```sql
-- Add structured fields to campaign_invitations
ALTER TABLE campaign_invitations
  ADD COLUMN first_name VARCHAR(255),
  ADD COLUMN last_name VARCHAR(255),
  ADD COLUMN company VARCHAR(255),
  ADD COLUMN title VARCHAR(255),
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN profile_picture_url TEXT,
  ADD COLUMN introduction_source VARCHAR(255),
  ADD COLUMN host_notes TEXT,
  ADD COLUMN tags TEXT[], -- PostgreSQL array
  ADD COLUMN enriched_from_linkedin BOOLEAN DEFAULT FALSE,
  ADD COLUMN enriched_from_salesforce BOOLEAN DEFAULT FALSE,
  ADD COLUMN last_enriched_at TIMESTAMP;

-- Migration: Split existing full_name into first_name, last_name
-- (Run after UI is finalized)
```

**Hold off until UI is perfect** to avoid double migration.

---

## Next Steps

1. ✅ Create GuestProfile type
2. ✅ Build GuestDetailPanel component
3. ✅ Update GuestAddEditModal with structured fields
4. ✅ Restructure Campaign tab (side-by-side layout)
5. ✅ Redesign Overview tab (guest intelligence dashboard)
6. ✅ Update Guests tab with detail panel
7. ⏳ Database migration (after UI approval)

---

## Reference

**Luma-style interaction:**
- Clickable rows
- Sliding side panel
- Rich profile display
- Inline editing

This is the standard for modern event management tools, and Moots must match or exceed this UX for our ICP (corporate event hosts).

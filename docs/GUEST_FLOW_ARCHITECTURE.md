# Guest Flow Architecture — Moots Entry Dashboard

> This document is the single source of truth for how guest management works in the platform. Read this before modifying any guest-related code.

## Core Principle

Moots Entry is a **vetting-first** platform. The host starts with a large pool of candidates, enriches and scores them with AI against event-specific objectives, vets the ranked list, selects who gets invited, sends invitations, tracks RSVPs, and only at the end does the guest get app access.

**This is NOT a join-request approval tool.** The old Retool-based dashboard was built entirely around mobile app join requests. The current platform inverts that: the host controls the pipeline from the beginning.

---

## Two Distinct Guest Paths

### Path A: Inbound (RSVP page, integrations, app join requests)

Someone discovers the event and expresses interest unprompted. They enter the pool as a candidate who needs vetting.

```
Guest fills out RSVP form (or integration pushes contact)
    |
    v
Contact auto-created in People Database
    |
    v
Auto-enriched (AI pulls LinkedIn, Apollo, WealthX data)
    |
    v
Auto-scored against event objectives (0-100 relevance score)
    |
    v
Appears in Guest Intelligence with score, rationale, talking points
    |
    v
Host reviews and either:
  - APPROVES -> adds to invitation campaign -> sends confirmation email -> guest gets app access
  - DECLINES -> contact stays in People Database for future events (intelligence compounds)
```

**Key**: Vetting happens AFTER the RSVP. The guest expressed interest; the host decides if they belong in the room.

### Path B: Outbound (People Database)

The host proactively selects people from their existing contact database. These are people already known, already enriched, already scored.

```
Host imports contacts (CSV, CRM sync, manual entry)
    |
    v
Contacts enriched and scored (manual or auto-trigger)
    |
    v
Host reviews ranked list in Guest Intelligence
    |
    v
Host selects high-scoring contacts -> "Add to Invitation Wave"
    |
    v
Campaign invitation created (with contact_id link)
    |
    v
Host sends RSVP email with unique token
    |
    v
Guest clicks link -> confirms attendance ("I can attend" / "I can't make it")
    |
    v
Confirmed guests receive deep link -> Moots guest app access
```

**Key**: Vetting already happened before the invitation was sent. These are people the host deliberately chose.

---

## The Three-Layer Data Architecture

### Layer 1: People Database (`people_contacts`)
- Persistent, workspace-scoped contact intelligence
- Compounds over time — the host never starts from zero
- Contains: name, company, title, emails, enrichment data, AI summary, tags, industry, seniority
- Source tracking: MANUAL, CSV_IMPORT, RSVP_SUBMISSION, JOIN_REQUEST, EVENT_IMPORT, API

### Layer 2: Event Objectives (`event_objectives`)
- What matters for THIS specific event
- Weighted criteria (e.g., "Senior PE decision-makers with $1B+ AUM" at weight 2.0)
- Different events score the same people differently

### Layer 3: Scoring Engine (`guest_scores`)
- Per-contact, per-event AI scoring
- `relevance_score` (0-100), `matched_objectives` (per-objective breakdown), `score_rationale`, `talking_points`
- UNIQUE(contact_id, event_id) — same contact, different score per event

---

## Guest Intelligence Page — The Vetting Hub

The `/dashboard/[eventId]/guest-intelligence` page is the core of the product. It must support both paths.

### What it shows
- **Full contact pool** ranked by relevance score (highest first)
- **Source badge** on each contact: RSVP (inbound), Import, Manual, CRM
- **Event status** on each contact: Not Invited / Selected / Invited / Confirmed / Declined
- **Rich intelligence**: score, rationale, talking points, matched objectives (via ScoreCard and DossierPanel)

### Stats row
| Pool | Scored | Qualified (60+) | Pending Review | Selected | Confirmed |

### Actions
- **Path A (inbound RSVP/join request, needs vetting)**: "Approve" (adds to campaign) / "Decline"
- **Path B (outbound, all scored contacts)**: "Add to Invitation Wave" (opens campaign/tier/priority selector)
- **Bulk**: Select multiple contacts -> "Add Selected to Wave"
- **Score**: "Score All Contacts" button triggers batch AI scoring

### View modes
- **Ranked List**: ScoreCard components sorted by score, expandable with rationale and talking points
- **Table View**: Full table with Score, Name, Company, Title, Source, Event Status, Actions columns
- **Pending Review**: Filtered to inbound RSVP/join-request contacts awaiting host decision

---

## Campaign Invitations — The Last Mile

The `campaign_invitations` table tracks the invitation pipeline. Status flow:

```
CONSIDERING -> INVITED -> ACCEPTED / DECLINED / WAITLIST / BOUNCED
```

### Critical: `contact_id` column
`campaign_invitations` has a `contact_id UUID REFERENCES people_contacts(id)` column. This MUST be set when creating invitations from Guest Intelligence. It bridges scoring intelligence to the invitation pipeline.

### Tier and Priority (for over-subscription management)
- **Tier**: TIER_1, TIER_2, TIER_3, WAITLIST — controls invitation wave ordering
- **Priority**: VIP, HIGH, NORMAL, LOW — within a tier, who gets a seat if over-subscribed

### The two-step email flow
1. **RSVP Email** (CONSIDERING -> INVITED): Generates `invitation_token`, sends email with `/rsvp/{token}` link
2. **Join Link Email** (ACCEPTED -> app access): Sends deep link for Moots guest app after confirmation

---

## RSVP Submissions — Inbound Pipeline Entry

The `rsvp_submissions` table captures public RSVP form responses. When a submission arrives:

1. Create/match a `people_contacts` record (set `rsvp_submissions.contact_id`)
2. Auto-trigger enrichment for the new contact
3. Auto-trigger scoring against event objectives (if objectives exist)
4. Contact appears in Guest Intelligence with full AI intelligence

The host reviews them in Guest Intelligence and decides: approve (add to campaign) or decline.

---

## App Join Requests — Edge Case

`event_join_requests` is the mobile app flow where existing Moots users request to join an event. This is a **secondary, edge-case flow** — not the primary workflow.

When a join request arrives, ideally:
1. Match to existing contact by email (or create new contact)
2. Enrich and score
3. Surface in Guest Intelligence for vetting

---

## Auto-Pipeline: Enrichment + Scoring

When a contact enters the pool from ANY source, the system should automatically:
1. **Enrich**: Call AI (Claude) to generate summary, industry, seniority from public data
2. **Score**: If the event has objectives, score the contact against them

This is fire-and-forget async. The `lib/auto-pipeline.ts` utility handles this by:
- Creating `enrichment_jobs` and `scoring_jobs` records for tracking
- Running `runEnrichmentPipeline()` then `scoreBatchForEvent()` sequentially
- Logging all actions to `audit_logs` with `actorEmail: 'system'`

---

## Data Model Relationships

```
people_contacts (workspace-scoped, persistent)
    |
    |-- guest_scores (per-event scoring, UNIQUE contact_id + event_id)
    |       |-- matched_objectives -> event_objectives
    |
    |-- campaign_invitations (per-campaign, contact_id FK)
    |       |-- invitation_token, rsvp_email_sent_at (Step 1: RSVP)
    |       |-- join_token, join_link_sent_at (Step 2: App access)
    |       |-- tier, priority (over-subscription management)
    |       |-- status: CONSIDERING -> INVITED -> ACCEPTED/DECLINED
    |
    |-- rsvp_submissions (per-event, contact_id FK)
    |       |-- Public form responses, auto-linked to contact
    |
    |-- event_join_requests (per-event, NOT linked by FK)
            |-- Mobile app requests, matched by email
```

---

## Funnel Metrics

The overview and analytics should reflect the vetting-first funnel:

```
Pool (all contacts) -> Scored -> Qualified (60+) -> Selected (in campaign) -> Confirmed (ACCEPTED) -> Checked In
```

NOT the old model of: Invited -> Pending -> Approved -> Declined

---

## UX Principles — Every Screen Answers Two Questions

Every screen in the dashboard should answer: **What does the host need to see right now?** and **What should they do next?**

The Platform Preview in `MootsEntryLanding.jsx` is the validated reference for data model, UI patterns, and information hierarchy. Build to that standard.

### Overview Tab — "How is my guest list shaping up?"

The first thing a host sees when opening an event. Must show:

1. **Vetting funnel** (stat cards with arrow connectors, matching the Platform Preview):
   - Guest Pool Evaluated -> Qualified -> Invited -> Confirmed
   - These are the Platform Preview's stat cards — not capacity gauges, not status counts

2. **Needs Attention section** (actionable alerts with terracotta accent):
   - Guests who haven't RSVP'd (invitations sent but no response)
   - New inbound RSVPs above scoring threshold (need approval)
   - High-scoring contacts not yet invited
   - Pending approvals from collaborators (PR team suggested guests)
   - Unscored contacts in the pool

3. **Activity feed** (timeline of what happened):
   - "Catherine Aldrich confirmed attendance"
   - "PR team added 3 guest suggestions"
   - "Enrichment complete for 47 new contacts"
   - "David Nakamura declined — moved to waitlist"

4. **Quick actions** (context-aware next steps):
   - No objectives? -> "Set Objectives"
   - Unscored contacts? -> "Run AI Scoring"
   - Pending RSVPs? -> "Review Pending Guests"
   - Event today? -> "Open Check-in"

### Guest Intelligence Tab — "Who belongs in the room?"

The core vetting hub. Shows the ranked, enriched pool with source indicators and event status. The host can:
- Review AI intelligence (scores, rationale, talking points, matched objectives)
- Approve inbound RSVPs or decline them
- Select contacts for outbound invitation waves
- Open full dossiers with deep contact profiles

The Platform Preview shows this as: ranked profile cards with scores, objective match percentages, and conversation starters. The ScoreCard and DossierPanel components implement this.

### Collaboration Visibility

Collaboration with PR agencies, sponsors, and internal stakeholders is a key selling point. The platform must make it obvious:

1. **Collaborator presence**: Avatar stack in the event header showing who's involved. Click to see roles (Owner, Admin, Team Member, External Partner, Viewer).

2. **Guest suggestions workflow**: External Partners (PR agencies, sponsors) can suggest guests. These appear in Guest Intelligence with a "Suggested by [Partner Name]" indicator. The host approves or rejects suggestions inline.

3. **Activity attribution**: The activity feed shows WHO did what — "PR team added 3 suggestions," "Sponsor flagged 2 VIPs," "Admin approved Catherine Aldrich."

4. **Role-based access**: Sensitive data (relevance scores, financial context, AI dossiers) requires OWNER, ADMIN, or TEAM_MEMBER role. External Partners see limited views. Viewers are read-only.

### The Full Host Journey

```
"I just created an event"
    |
    v  SET OBJECTIVES -> Define what kind of guests matter
    |
    v  BUILD THE POOL -> Import contacts, set up RSVP page, connect integrations
    |
    v  ENRICH & SCORE -> AI analyzes the pool against objectives
    |
    v  VET THE LIST -> Review ranked contacts in Guest Intelligence
    |
    v  SELECT & INVITE -> Add top contacts to invitation waves, send RSVP emails
    |
    v  TRACK RSVPs -> Monitor confirmations, manage over-subscription
    |
    v  BRIEF THE TEAM -> Generate briefing packets with talking points
    |
    v  EVENT DAY -> Check-in, seating, live updates
    |
    v  FOLLOW UP -> Post-event sequences, thank-you emails
    |
    v  MEASURE ROI -> "I'm presenting to my CMO" — funnel analytics, pipeline attribution
```

Every tab maps to a stage in this journey. The tab order reflects the chronological flow.

---

## Key Implementation Rules

1. **Always set `contact_id`** when creating campaign_invitations from the scoring/intelligence view
2. **Always set `contact_id`** on rsvp_submissions after creating/matching the contact
3. **Auto-trigger enrichment + scoring** when contacts enter the pool from inbound sources
4. **Guest Intelligence is the vetting hub** — all paths converge here before invitations
5. **Campaign infrastructure is unchanged** — CampaignDetailPanel, SendRsvpModal, RSVP token flow all work as-is
6. **Intelligence compounds** — declined contacts stay in People Database for future events
7. **Every write operation** must call `logAction()` for audit logging
8. **All queries filter by `workspace_id`** — no cross-workspace data leakage
9. **Build to the Platform Preview standard** — `MootsEntryLanding.jsx` is the validated reference for data model, UI patterns, and information hierarchy
10. **Every screen answers two questions**: What does the host need to see right now? What should they do next?

# Moots Entry — Event Host Dashboard

## Project Overview

Moots Entry is the **Event Host Dashboard** — a web-based intelligence and operations platform for managing curated, high-value corporate events. It is the command center where hosts import contacts, enrich guest profiles using AI, score and rank candidates against event-specific objectives, manage invitation waves, track RSVPs, run live check-in, and measure post-event ROI.

**This is NOT a mass ticketing or general RSVP tool.** The core value is curation: helping hosts build the right attendee mix from a persistent, enriched contact database that compounds intelligence over time.

## Architecture

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS 3, Lucide React icons |
| Primary Database | Neon (serverless PostgreSQL) via @neondatabase/serverless |
| Optional Secondary DB | Supabase (used in entry/mobile mode) |
| File Storage | Azure Blob Storage (event images, avatars) |
| Email | Resend |
| Rate Limiting | Upstash Redis (optional; falls back to in-memory) |
| Validation | Zod |
| CSV Parsing | Papa Parse |
| QR Codes | qrcode, html5-qrcode, @yudiel/react-qr-scanner |

## Source of Truth

Before starting any implementation work, read the relevant documents:

| Document | Path | Purpose |
|----------|------|---------|
| **Technical Spec** | `docs/TECHNICAL_SPEC.md` | Complete product specification — 19 functional modules, data entities, workflows, permissions, integrations. **Read this first.** |
| **Formatted Spec** | `docs/HOST_DASHBOARD_SPEC.docx` | Same content, formatted for stakeholders |
| **Codebase Overview** | `CODEBASE_OVERVIEW.md` | What's already built — existing schema, API routes, components |
| **Mobile App Context** | `AGENT_CONTEXT.md` | Flutter guest app — separate codebase, PowerSync, Firebase Auth, Stream Chat |
| **Brand Guidelines** | `docs/MOOTS_BRAND_GUIDE_COMPLETE.md` | Colors, typography, component specs |

## Three-Layer Architecture

Understanding this is critical — it's the product's core differentiation:

1. **People Database** (Layer 1) — Persistent, organization-level contact intelligence that compounds over time. Event-independent. The host never starts from zero.
2. **Event Profile & Goals** (Layer 2) — What matters for this specific event. Objectives, target criteria, capacity.
3. **Matchmaking Engine** (Layer 3) — Scores the same people differently for every event based on that event's objectives. Produces 0–100 relevance scores with "Why They Match" rationale.

## Implementation Rules

### Data Isolation
- **All new tables MUST include `workspace_id`** for multi-tenant isolation
- All queries MUST filter by `workspace_id` — no cross-workspace data leakage
- The `contacts` table uses `workspace_id` (not the old `org_id` pattern)

### Authentication & Authorization
- All API routes MUST use the auth middleware (replacing HTTP Basic Auth)
- Every request checks: (1) user is authenticated, (2) user belongs to target workspace, (3) user's role permits the action
- Sensitive data (relevance scores, financial context, AI dossiers) requires OWNER, ADMIN, or TEAM_MEMBER role
- External Partners and Viewers have restricted access — see Section 5 of the spec

### Audit Logging
- **All write operations MUST call `logAction()`** to record in the audit_logs table
- Log format: `{ actor_id, actor_email, action, entity_type, entity_id, previous_value, new_value, metadata }`
- Bulk operations log as a single batch action with item count
- System-triggered actions use `actor_id = null` with `actor_email = "system"`

### Code Patterns
- Follow existing patterns in `src/app/api/` for new API routes
- Use Zod for all input validation
- Use TypeScript strict mode
- Database queries use `@neondatabase/serverless` — follow the existing connection pattern
- Rate limiting on public endpoints via Upstash Redis

### Brand & Design
- Colors: Terracotta (#B8755E), Forest Green (#2F4F3F), Cream (#FAF9F7), Charcoal (#1C1C1E)
- Typography: Playfair Display (headings/names), DM Sans (body/UI)
- Minimum 17px body text
- 8pt grid spacing, 20px card radius, 56px button height

## Implementation Phases

### Phase 1 — Foundation (must be built first)
These modules block everything else:

1. **Authentication (Module 2.18)** — `users` table, login/signup pages, session middleware, replace HTTP Basic Auth
2. **Workspaces (Module 2.17)** — `workspaces` + `workspace_members` tables, scoping middleware, workspace switching
3. **Audit Logs (Module 2.19)** — `audit_logs` table, `logAction()` utility

### Phase 2 — Core Intelligence (the product moat)
4. **People Database (Module 2.2)** — `contacts` table, CSV import, deduplication, tagging
5. **Enrichment Pipeline (Module 2.2 + Section 6.2)** — Async multi-source enrichment
6. **AI Scoring Engine (Module 2.3)** — `event_objectives` + `guest_scores` tables, scoring logic

### Phase 3 — Event Operations
7. **Guest Dossiers & Briefings (Modules 2.7 + 2.8)** — Talking points, briefing packets, day-of updates
8. **Check-in & Walk-in Onboarding (Module 2.13)** — QR scanning, walk-in flow, deep links, host notifications
9. **Public RSVP Page (Module 2.16)** — Embeddable per-event page, `rsvp_pages` table
10. **Broadcast + Follow-Up (Modules 2.14 + 2.11)** — Host broadcast channel, automated post-event sequences

### Phase 4 — Integrations & Polish
11. **CRM Sync** — Salesforce + HubSpot bi-directional
12. **Workspace Tool Import** — Airtable + Notion API integration
13. **Seating Optimization (Module 2.9)** — AI-suggested seating, introduction pairings
14. **Analytics Dashboard (Module 2.12)** — ROI reporting, funnel visualization, pipeline attribution

## Existing Database Schema

These tables already exist in Neon PostgreSQL:

- `events` — Event metadata, capacity, status, seating config
- `invitation_campaigns` — Named invitation waves with denormalized stats
- `campaign_invitations` — Individual guest invitations with tier/priority/status
- `event_join_requests` — Guest-initiated join requests (mobile app flow)
- `event_attendees` — Confirmed attendees linked to events
- `user_profiles` — Basic guest profiles (mobile app, NOT host accounts)
- `email_send_log` — Email delivery audit trail

## New Tables to Create

See Section 4.2 of the spec for full schemas:

- `users` — Host dashboard user accounts (separate from `user_profiles`)
- `workspaces` — Multi-tenant organizational containers
- `workspace_members` — User-to-workspace role mapping
- `sessions` — Active user sessions
- `contacts` — Persistent People Database (replaces per-campaign guest model)
- `event_objectives` — Scoring criteria per event
- `guest_scores` — Per-contact, per-event AI scoring results
- `collaborators` — Per-event collaborator access
- `follow_up_sequences` — Post-event follow-up tracking
- `audit_logs` — Immutable action trail
- `broadcast_messages` — Host-to-all-guests announcements
- `rsvp_pages` — Per-event embeddable RSVP page configuration

## Open Questions

There are 17 open questions in Section 8 of the spec that require founder decisions. Key blockers:

- **#1**: Auth library choice (NextAuth.js vs Lucia vs custom)
- **#4**: AI model for scoring (GPT-4, Claude, or self-hosted)
- **#5**: Supabase vs Neon for People Database (needs to be accessible from both dashboard and mobile app)
- **#12**: Relationship between `campaign_invitations` and `contacts` (data model refactoring)

When you encounter an open question during implementation, flag it clearly and proceed with the most reasonable default, noting the assumption.

## What NOT to Build

- **Guest mobile app features** — The Flutter app (Stream Chat, PowerSync, Firebase Auth) is a separate codebase. This dashboard communicates with it via API only.
- **Features not in the spec** — Do not invent features. Everything must trace back to the Technical Spec.
- **Premature optimization** — Build for correctness first. Performance optimization is Phase 4+.

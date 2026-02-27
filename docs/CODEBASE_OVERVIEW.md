# Moots Entry — Codebase Overview for AI Agents

This document explains what Moots Entry is, what has been built, how it works, and how the code is structured. It is intended as a reference for AI agents working on this codebase.

---

## What Is Moots?

Moots is an **outcome-driven guest experience platform** for curated, high-quality gatherings. It is built for hosts who care deeply about **who** attends their events — not just how many people show up.

Target events include: curated breakfasts, luncheons, dinners, private talks, networking cocktails, demo days, forums, fundraisers, LP meetings, and company offsites.

**This is not a mass ticketing or general RSVP tool.** The core value is curation: helping hosts build the right attendee mix, manage invitation waves, and understand event outcomes. It also tracks guest interactions for up to 30 days post-event.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS 3, Lucide React icons |
| Primary Database | Neon (serverless PostgreSQL) via `@neondatabase/serverless` |
| Optional Secondary DB | Supabase (used in entry/mobile mode) |
| File Storage | Azure Blob Storage (event images, avatars) |
| Email | Resend |
| AI | Anthropic Claude (enrichment + scoring + seating) |
| Rate Limiting | Upstash Redis (production) / in-memory fallback (dev) |
| Error Monitoring | Sentry |
| Validation | Zod |
| CSV Parsing | Papa Parse |
| PDF Export | jsPDF + jspdf-autotable |
| QR Codes | `qrcode`, `html5-qrcode`, `@yudiel/react-qr-scanner` |
| Testing | Vitest (unit), Playwright (E2E) |
| CI | GitHub Actions |

---

## App Modes

The app has two operating modes, controlled by the `NEXT_PUBLIC_APP_MODE` environment variable:

- **`dashboard`** — Admin interface for hosts. Uses Neon database. Session-based auth (cookies).
- **`entry`** — Mobile/public API mode. Uses Supabase. Exposes public endpoints for guests.

Most development has happened in **dashboard mode**.

---

## Authentication & Authorization

- **Session-based auth** with HTTP-only cookies (`lib/auth.ts`)
- Users, workspaces, and roles managed via `users`, `workspaces`, `workspace_members` tables
- `requireAuth()` / `requireRole()` middleware on protected API routes
- Roles: `OWNER`, `ADMIN`, `TEAM_MEMBER`, `EXTERNAL_PARTNER`, `VIEWER`
- Magic link + password login supported
- Public endpoints (no auth required):
  - `GET /api/events/[eventId]`
  - `POST /api/events/[eventId]/join-requests`
  - `GET|POST /api/rsvp/[invitation-token]`
  - `GET|POST /api/join/[join-token]`
  - `GET /api/health`

---

## Three-Layer Architecture

1. **People Database** (Layer 1) — Persistent, organization-level contact intelligence. Event-independent. `people_contacts` table.
2. **Event Profile & Goals** (Layer 2) — Per-event objectives, capacity, target criteria. `event_objectives` table.
3. **Matchmaking Engine** (Layer 3) — Scores contacts differently for every event. 0–100 relevance scores with rationale. `guest_scores` table.

---

## Database Schema

All tables are in Neon PostgreSQL. Migrations are in `migrations/` (001-006).

### Foundation Tables
- `events` — Event metadata, capacity, status, seating config
- `users` — Host dashboard accounts (separate from mobile `user_profiles`)
- `workspaces` — Multi-tenant organizational containers
- `workspace_members` — User-to-workspace role mapping
- `sessions` — Active user sessions (PostgreSQL-backed)
- `audit_logs` — Immutable action trail

### People Database + Scoring
- `people_contacts` — Persistent People Database with enrichment, tags, financials
- `event_objectives` — Scoring criteria per event with weights
- `guest_scores` — Per-contact, per-event AI scoring results
- `enrichment_jobs` / `scoring_jobs` — Async batch job tracking

### Invitation Pipeline
- `invitation_campaigns` — Named invitation waves with denormalized stats
- `campaign_invitations` — Individual guest invitations with tier/priority/status
- `email_send_log` — Email delivery audit trail

### Event Operations
- `event_checkins` — Check-in records (QR scan, walk-in, invitation)
- `guest_team_assignments` — Host team member → contact assignments
- `briefing_packets` — AI-generated briefings
- `rsvp_pages` / `rsvp_submissions` — Embeddable RSVP pages
- `broadcast_messages` — Host-to-all announcements
- `follow_up_sequences` — Post-event automated follow-ups

### Integrations
- `seating_suggestions` / `introduction_pairings` — AI seating + intro recommendations
- `crm_connections` / `crm_sync_log` — Salesforce/HubSpot sync

---

## Key Utility Modules (`lib/`)

| File | Purpose |
|------|---------|
| `db.ts` | Neon PostgreSQL client (lazy-initialized singleton) |
| `env.ts` | Zod-validated environment config (fails fast on startup) |
| `auth.ts` | Session management, password hashing, `requireAuth()` |
| `audit-log.ts` | `logAction()` — fire-and-forget audit logging |
| `rate-limit.ts` | Upstash Redis (prod) / in-memory (dev) rate limiting |
| `with-error-handling.ts` | Route handler wrapper + Sentry integration |
| `errors.ts` | Custom error classes (ValidationError, NotFoundError, etc.) |
| `validate-request.ts` | Zod-based request body validation |
| `email-service.ts` | Resend integration for all email types |
| `logger.ts` | Structured logging (JSON in prod, pretty in dev) |
| `enrichment/pipeline.ts` | Batch enrichment orchestrator |
| `enrichment/types.ts` | Pluggable `EnrichmentProvider` interface |
| `scoring/engine.ts` | Claude AI scoring engine |
| `broadcast/sender.ts` | Broadcast email sender |
| `checkin/manager.ts` | Check-in + walk-in management |
| `analytics/aggregator.ts` | Event analytics with funnel stages |
| `analytics/export.ts` | CSV/JSON/PDF export |
| `seating/optimizer.ts` | AI-powered seating suggestions |
| `crm/provider.ts` | CRM sync abstraction (Salesforce/HubSpot) |
| `contacts/import.ts` | CSV contact import with deduplication |
| `waitlist/promoter.ts` | Auto-promote waitlisted guests when capacity opens |
| `jobs/processor.ts` | Cron-based batch job processor |

---

## Production Infrastructure

### Vercel Deployment
- `vercel.json` — Function duration limits + cron configuration
- Cron jobs: `process-jobs` (every minute), `cleanup` (daily at 3am UTC)
- `GET /api/health` — Health check endpoint

### Error Monitoring
- Sentry client/server/edge configs (`sentry.*.config.ts`)
- `withErrorHandling()` reports exceptions to Sentry
- `SENTRY_DSN` env var (optional)

### Rate Limiting
- Upstash Redis sliding window in production
- In-memory LRU fallback for local dev
- Separate limiters: public, auth, RSVP, broadcast, join, upload

### Background Jobs
- Enrichment + scoring jobs created via API, processed by cron
- `lib/jobs/processor.ts` picks up PENDING jobs in batches of 10
- Jobs tracked in `enrichment_jobs` / `scoring_jobs` tables

---

## Testing

### Unit Tests (Vitest)
- Config: `vitest.config.ts`
- Run: `npm test`
- 66 tests across 11 test files covering all lib modules
- Mocked DB and external services

### E2E Tests (Playwright)
- Config: `playwright.config.ts`
- Run: `npm run test:e2e`
- Tests: dashboard navigation, check-in flows, RSVP submissions

### CI Pipeline (GitHub Actions)
- `.github/workflows/ci.yml`
- Jobs: lint → typecheck → test → build (on push/PR to main)

---

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run migrate` | Run all SQL migrations |

### One-time Scripts
| Script | Purpose |
|--------|---------|
| `npx tsx scripts/run-all-migrations.ts` | Idempotent migration runner |
| `npx tsx scripts/backfill-contact-ids.ts` | Link invitations to contacts by email |

---

## Open Questions — Resolved Defaults

| # | Question | v1 Default |
|---|----------|------------|
| 3 | Enrichment providers | Claude AI only. `EnrichmentProvider` interface documented for future Apollo/Clearbit |
| 6 | Multi-day events | `start_date`/`end_date` range. No sub-event schema in v1 |
| 8 | Waitlist auto-promotion | Implemented. Auto-promotes next WAITLIST guest when an invite is DECLINED |
| 9 | Follow-up sender identity | Reply-To set to workspace owner's email. `reply_to_email`/`reply_to_name` on workspaces |
| 10 | PDF export | Implemented via jsPDF. Branded with Moots colors |
| 11 | Historical data migration | CSV import handles legacy data. No automatic migration |
| 12 | Campaign → Contact linking | Backfill script + auto-link on future invitation creation |
| 15 | Audit log retention | Daily cron deletes logs older than 365 days (configurable) |
| 16 | Walk-in SMS | Phone captured but no SMS in v1. Documented for future Twilio integration |

---

## File Structure

```
moots-entry/
├── app/
│   ├── api/
│   │   ├── campaigns/[campaignId]/
│   │   ├── events/[eventId]/
│   │   │   ├── campaigns/
│   │   │   ├── capacity/
│   │   │   ├── checkin/
│   │   │   ├── join-requests/
│   │   │   ├── objectives/
│   │   │   └── scoring/
│   │   ├── invitations/
│   │   ├── join/[join-token]/
│   │   ├── rsvp/
│   │   ├── auth/
│   │   ├── contacts/
│   │   ├── enrichment-jobs/
│   │   ├── cron/
│   │   │   ├── process-jobs/
│   │   │   └── cleanup/
│   │   ├── health/
│   │   └── uploads/
│   ├── components/
│   ├── dashboard/[eventId]/
│   ├── auth/
│   ├── checkin/[eventId]/
│   ├── join/[join-token]/
│   └── rsvp/[invitation-token]/
├── lib/
│   ├── analytics/
│   ├── broadcast/
│   ├── checkin/
│   ├── contacts/
│   ├── crm/
│   ├── enrichment/
│   ├── jobs/
│   ├── scoring/
│   ├── seating/
│   ├── waitlist/
│   └── schemas/
├── e2e/                    # Playwright E2E tests
├── migrations/             # SQL migrations (001-006)
├── scripts/                # Migration runner, backfill scripts
├── .github/workflows/      # CI pipeline
├── sentry.*.config.ts      # Sentry monitoring
├── vitest.config.ts        # Unit test config
├── playwright.config.ts    # E2E test config
├── vercel.json             # Deployment config
└── .env.example            # Environment variable reference
```

---

## Development Status

**All four implementation phases are complete:**

1. **Phase 1 — Foundation:** Auth, workspaces, audit logging, invitation system
2. **Phase 2 — Core Intelligence:** People database, enrichment pipeline, AI scoring
3. **Phase 3 — Event Operations:** Check-in, dossiers, RSVP pages, broadcast, follow-up
4. **Phase 4 — Integrations:** Seating optimization, analytics, CRM sync, workspace imports

**Operational items complete:**
- Critical bug fixes (SQL column refs, status enum corrections)
- Upstash Redis rate limiting + Sentry error monitoring
- Vercel deployment config + cron-based job processing
- Full test suite (Vitest unit + Playwright E2E + GitHub Actions CI)
- Open question defaults (waitlist, reply-to, backfill, retention, PDF export)
- Environment documentation + codebase overview update

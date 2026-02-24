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
| Rate Limiting | Upstash Redis (optional; falls back to in-memory) |
| Validation | Zod |
| CSV Parsing | Papa Parse |
| QR Codes | `qrcode`, `html5-qrcode`, `@yudiel/react-qr-scanner` |

---

## App Modes

The app has two operating modes, controlled by the `NEXT_PUBLIC_APP_MODE` environment variable:

- **`dashboard`** — Admin interface for hosts. Uses Neon database. Requires HTTP Basic Auth.
- **`entry`** — Mobile/public API mode. Uses Supabase. Exposes public endpoints for guests.

Most development has happened in **dashboard mode**.

---

## Authentication & Authorization

- **Dashboard** is protected by **HTTP Basic Auth** enforced in `middleware.ts`
- Credentials are set via `DASHBOARD_AUTH_USER` and `DASHBOARD_AUTH_PASS` env vars
- Uses timing-safe string comparison (`lib/timing-safe-compare.ts`) to prevent timing attacks
- Public endpoints (for guests, no auth required):
  - `GET /api/events/[eventId]`
  - `POST /api/events/[eventId]/join-requests`
  - `GET /api/events/[eventId]/join-requests/me`
  - `GET|POST /api/rsvp/[invitation-token]`
  - `GET|POST /api/join/[join-token]`

---

## Database Schema

All tables are in Neon PostgreSQL. The migration file is at `migrations/001_create_invitation_system.sql`.

### Core Tables

#### `events`
The central entity. Stores all event metadata.
```
id, title, location (JSONB), start_date, end_date, timezone
image_url, event_url, hosts (JSONB), sponsors (JSONB)
is_private, approve_mode (MANUAL | AUTO)
status (DRAFT | PUBLISHED | COMPLETE | CANCELLED)
total_capacity, seating_format (STANDING | SEATED | MIXED)
tables_config (JSONB), created_at, updated_at
```

#### `user_profiles`
One record per unique guest (`owner_id`). Tracks all events a guest has attended.
```
id, owner_id (UNIQUE), event_ids (INT[])
emails (JSONB), first_name, last_name, photo_url
created_at, updated_at
```

#### `event_join_requests`
Guest requests to join an event (submitted via mobile app or landing page).
```
id, event_id, owner_id (UNIQUE per event)
status (PENDING | APPROVED | REJECTED | CANCELLED | DRAFT)
plus_ones, comments
rsvp_contact, company_website, goals, looking_for
visibility_enabled (default TRUE), notifications_enabled (default TRUE)
approved_at, created_at, updated_at
```

#### `event_attendees`
Created when a join request is APPROVED. Links guest to event.
```
id, event_id, owner_id, user_profile_id (FK)
join_request_id (FK), visibility_enabled, notifications_enabled
created_at, updated_at
```

#### `invitation_campaigns`
Named waves of invitations. A single event can have multiple campaigns (e.g. "Wave 1 — VIP", "Wave 2 — General").
```
id, event_id (FK), name, description
status (DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED)
email_subject, email_body (customizable templates)
total_considering, total_invited, total_accepted, total_declined, total_joined (denormalized)
created_at, updated_at
```

#### `campaign_invitations`
Individual guest records within a campaign. Tracks the full lifecycle from consideration to attendance.
```
id, campaign_id (FK), event_id (FK)
full_name, email (UNIQUE per campaign)
status (CONSIDERING | INVITED | ACCEPTED | DECLINED | WAITLIST | BOUNCED | FAILED)
tier (TIER_1 | TIER_2 | TIER_3 | WAITLIST)
priority (VIP | HIGH | NORMAL | LOW)
internal_notes, expected_plus_ones
invitation_token (unique), token_expires_at, rsvp_email_sent_at, rsvp_responded_at
join_token (unique), join_link_sent_at, join_completed_at, join_request_id (FK)
table_assignment, seat_assignment (reserved for future seating feature)
created_at, updated_at
```

#### `email_send_log`
Audit trail for all emails sent.
```
id, invitation_id (FK), campaign_id (FK)
recipient_email, subject
email_type (RSVP_INVITATION | JOIN_LINK)
status (QUEUED | SENT | FAILED | BOUNCED)
email_service_id, email_service_response (JSONB)
sent_at, created_at
```

### Key Database Patterns
- `updated_at` is automatically updated on all tables via PostgreSQL triggers
- Campaign statistics (`total_considering`, `total_invited`, etc.) are **denormalized** and kept in sync via triggers — do not recompute them manually
- `user_profiles.event_ids` is an `INT[]` array — use `ARRAY[]::int[]` for concatenation in raw SQL

---

## Guest Lifecycle (The Core Flow)

There are **two separate flows** that should not be confused:

### Flow 1: Invitation → RSVP (Pre-Event Curation)
Used when the host proactively invites specific people.

```
Host creates Campaign
  → adds guests to campaign (status: CONSIDERING)
  → sends RSVP emails (status: INVITED)
Guest clicks email link → /rsvp/[invitation-token]
  → accepts or declines (status: ACCEPTED | DECLINED)
Host reviews responses
  → sends join link email to accepted guests
Guest clicks join link → /join/[join-token]
  → completes onboarding form
  → creates event_join_request + event_attendee records
```

### Flow 2: Direct Join Request (Organic / Mobile App)
Used when guests discover the event and request to join.

```
Guest submits via mobile app → POST /api/events/[eventId]/join-requests
  → creates event_join_request (status: PENDING)
Host reviews in dashboard Guests tab
  → approves or rejects
On approval:
  → event_join_request status → APPROVED
  → event_attendee record created
  → user_profile upserted / event_ids array updated
```

---

## API Routes Reference

### Events
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/events` | Yes | List all events |
| POST | `/api/events/create` | Yes | Create new event |
| GET | `/api/events/[eventId]` | No | Get event details (mobile) |
| PATCH | `/api/events/update` | Yes | Update event |

### Join Requests
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/events/[eventId]/join-requests` | Yes | List join requests with stats |
| POST | `/api/events/[eventId]/join-requests` | No | Submit join request (mobile, rate-limited) |
| GET | `/api/events/[eventId]/join-requests/me` | No | Check own join status |
| PATCH | `/api/events/[eventId]/join-requests?id=[id]` | Yes | Update request status/notes |

### Capacity
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/events/[eventId]/capacity-status` | Yes | Filled/remaining/over-capacity metrics |
| GET | `/api/events/[eventId]/capacity` | Yes | Full capacity data |

### Campaigns
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/events/[eventId]/campaigns` | Yes | List campaigns for event |
| POST | `/api/events/[eventId]/campaigns` | Yes | Create campaign |
| GET | `/api/campaigns/[campaignId]` | Yes | Get campaign details |
| PATCH | `/api/campaigns/[campaignId]` | Yes | Update campaign |
| DELETE | `/api/campaigns/[campaignId]` | Yes | Delete campaign (cascades) |
| POST | `/api/campaigns/[campaignId]/send-rsvp` | Yes | Send RSVP emails in bulk |

### Invitations
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/campaigns/[campaignId]/invitations` | Yes | List invitations |
| POST | `/api/campaigns/[campaignId]/invitations` | Yes | Create single invitation |
| POST | `/api/campaigns/[campaignId]/invitations/upload` | Yes | CSV bulk upload |
| PATCH | `/api/invitations/[invitationId]` | Yes | Update single invitation |
| POST | `/api/invitations/bulk-update` | Yes | Bulk update status/tier/priority |
| POST | `/api/invitations/bulk-send-join-links` | Yes | Send join links to multiple guests |

### RSVP & Join (Public)
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/rsvp/[token]/details` | No | Fetch invitation for RSVP page |
| POST | `/api/rsvp/[token]` | No | Accept or decline RSVP |
| GET | `/api/join/[token]/details` | No | Fetch invitation for join page |
| POST | `/api/join/[token]` | No | Complete join onboarding |

### Uploads
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/uploads/event-image` | Yes | Upload event image to Azure |

---

## Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage / marketing landing page |
| `/dashboard` | Event list (upcoming, past, drafts) |
| `/dashboard/[eventId]` | Redirects to `/overview` |
| `/dashboard/[eventId]/overview` | Stats, capacity gauge, recent activity |
| `/dashboard/[eventId]/guests` | Guest approval workflow |
| `/dashboard/[eventId]/campaigns` | Invitation wave management |
| `/dashboard/[eventId]/seating` | Placeholder (future) |
| `/dashboard/[eventId]/checkin` | Placeholder (future) |
| `/checkin/[eventId]` | Real-time check-in with QR scanning |
| `/rsvp/[invitation-token]` | Guest RSVP accept/decline page (public) |
| `/join/[join-token]` | Guest onboarding / join room page (public) |

---

## Key Components

| File | Purpose |
|------|---------|
| `CreateEventModal.tsx` | Modal + form for creating events |
| `CampaignForm.tsx` | Campaign create/edit form |
| `CampaignDetailPanel.tsx` | Slide-out panel showing campaign + invitations list |
| `GuestDetailPanel.tsx` | Slide-out panel for viewing/editing a guest profile |
| `GuestPipelineTable.tsx` | Table of campaign invitations with status, tier, priority |
| `SendRsvpModal.tsx` | Modal for bulk-sending RSVP emails |
| `InviteWavePlanner.tsx` | UI for managing invitation tiers/waves |
| `CapacityGauge.tsx` | Visual capacity indicator (filled vs remaining) |
| `EventTabNavigation.tsx` | Tab switcher within event dashboard |
| `EventHeaderActions.tsx` | Header-level event action buttons |

---

## Key Utility Modules (`lib/`)

| File | Purpose |
|------|---------|
| `db.ts` | Neon PostgreSQL client (lazy-initialized) |
| `env.ts` | Zod-validated environment config (fails fast on startup) |
| `schemas/` | Zod schemas for API request body validation |
| `email-service.ts` | Resend integration for RSVP and join link emails |
| `cors.ts` | CORS headers for public API endpoints |
| `security-headers.ts` | Security response headers middleware |
| `rate-limit.ts` | Rate limiter using Upstash Redis or in-memory fallback |
| `logger.ts` | Structured logging (info/warn/error) |
| `invitation-token.ts` | Token generation for invitations |
| `errors.ts` | Standardized API error responses |
| `with-error-handling.ts` | Wrapper for consistent error handling in API routes |
| `validate-request.ts` | Zod-based request body validation helper |
| `file-validation.ts` | File type/size validation for uploads |
| `mobile-redirect.ts` | Redirect logic for mobile app deep links |
| `timing-safe-compare.ts` | Timing-safe string comparison for auth |
| `password-validation.ts` | Password strength rules |

---

## Code Conventions

### API Route Pattern
All API routes follow this pattern:
1. Wrap with `withErrorHandling()` for consistent error responses
2. Validate request body with `validateRequest(schema, body)`
3. Use Zod schemas defined in `lib/schemas/`
4. Return JSON with appropriate HTTP status codes (200/201/400/404/422/429/500)

### Database Access
- Use `getDb()` from `lib/db.ts` — never import the client directly
- Raw SQL via tagged template literals (Neon serverless style)
- Use `ARRAY[]::int[]` for PostgreSQL array concatenation (not `'{}'::int[]`)

### Environment Variables
All env vars are validated via `lib/env.ts` at startup. Required in dashboard mode:
- `DATABASE_URL` — Neon connection string
- `DASHBOARD_AUTH_USER` + `DASHBOARD_AUTH_PASS` — Basic auth credentials
- `RESEND_API_KEY` — Email sending
- `AZURE_STORAGE_CONNECTION_STRING` + `AZURE_STORAGE_CONTAINER_NAME` — File uploads

### Error Handling for Legacy Data
Some older `user_profiles` records are missing `event_ids` entries. The approval flow in `join-requests/route.ts` includes auto-repair logic to add missing event IDs rather than failing with a 422 error.

---

## File Structure

```
moots-entry/
├── app/
│   ├── api/
│   │   ├── campaigns/[campaignId]/          # Campaign CRUD + send-rsvp
│   │   ├── events/[eventId]/
│   │   │   ├── campaigns/                  # Event-scoped campaigns
│   │   │   ├── capacity/                   # Capacity endpoints
│   │   │   ├── capacity-status/
│   │   │   └── join-requests/              # Join request management
│   │   ├── invitations/                    # Invitation CRUD + bulk ops
│   │   ├── join/[join-token]/              # Join flow (public)
│   │   ├── rsvp/[invitation-token]/        # RSVP flow (public)
│   │   └── uploads/event-image/            # Azure image upload
│   ├── components/                         # Shared React components
│   ├── checkin/[eventId]/                  # Check-in page
│   ├── dashboard/
│   │   ├── [eventId]/
│   │   │   ├── layout.tsx                  # Shared event layout + tab nav
│   │   │   ├── overview/
│   │   │   ├── guests/
│   │   │   ├── campaigns/
│   │   │   ├── seating/
│   │   │   └── checkin/
│   │   └── page.tsx                        # Event list
│   ├── join/[join-token]/                  # Join landing page (public)
│   ├── rsvp/[invitation-token]/            # RSVP landing page (public)
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                            # Homepage
├── lib/                                    # Server utilities
├── types/                                  # Shared TypeScript types
├── migrations/                             # SQL migration files
├── scripts/                                # Test + migration scripts
├── middleware.ts                           # Auth + CORS + security headers
├── next.config.mjs
├── package.json
└── tsconfig.json
```

---

## Development Status

**Completed:**
- Event creation and management
- Guest pipeline (campaign invitations with tier/priority system)
- Multi-wave RSVP email sending
- Join link flow (two-step: RSVP → join room)
- Guest approval workflow
- User profile management with event attendance tracking
- Capacity tracking and gauge visualization
- Check-in page with QR code scanning
- CSV bulk import for guest lists
- Azure image uploads
- Rate limiting and security headers
- Email audit logging

**In Progress / Placeholders:**
- Seating arrangement planning (`/dashboard/[eventId]/seating`)
- Advanced check-in management (`/dashboard/[eventId]/checkin` tab)

**Known Issues / Notes:**
- Legacy RSVPs may have missing `event_ids` in `user_profiles` — auto-repair is in place
- Supabase integration is optional and only active in `entry` mode
- Campaign statistics are denormalized (PostgreSQL triggers keep them in sync)

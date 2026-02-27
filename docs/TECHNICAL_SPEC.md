# Moots Host Dashboard — Technical Product Specification

> **MOOTS BY MUSE FINANCIAL TECHNOLOGIES INC.**  
> Version 1.2 | February 2026 | CONFIDENTIAL  
> Prepared for: Claude Code Agent Implementation Teams

---

# 1. Product Overview

## 1.1 What Moots Host Dashboard Is

Moots Host Dashboard (internally: Moots Entry) is a web-based intelligence and operations platform for event hosts managing curated, high-value corporate gatherings. It is the command center where hosts import contacts, enrich guest profiles using AI and third-party data sources, score and rank candidates against event-specific objectives, manage invitation waves, track RSVPs, run live check-in, and measure post-event ROI.

This is not a mass ticketing or general RSVP tool. The core value is curation: helping hosts build the right attendee mix, manage invitation waves with tiered priority, and understand event outcomes tied to business pipeline.

## 1.2 Who Uses It

-   Corporate event organizers (brand activations, conferences, satellite dinners)

-   PR agencies running events on behalf of clients

-   Internal company teams managing curated guest lists (investor relations, client events)

-   Wealth advisory and financial institutions hosting client cultivation events

-   Foundations and nonprofits managing donor cultivation dinners

-   Multi-partner curated events with collaborative guest list management

## 1.3 Core Objective

Replace the manual, fragmented workflow of guest vetting (copy-pasting names into LinkedIn, WealthX, Apollo one by one), follow-up coordination (emails that get delayed for weeks), and ROI attribution (no framework connecting event spend to pipeline outcomes) with an integrated, AI-powered platform that handles the full lifecycle from guest pool evaluation to post-event pipeline tracking.

## 1.4 Key Differentiation

**Three-Layer Architecture:** Unlike event-scoped tools (where data resets per event), Moots separates the persistent People Database (compounding intelligence over time) from the Event Profile & Goals (what matters for this specific gathering) and the Matchmaking Engine (scoring the same people differently for every event). The host never starts from zero.

**Proactive Invitation Model:** Moots hosts curate invitations from a known or enriched network. They don't vet strangers who RSVP'd. The system recommends who to invite, not who to approve.

## 1.5 Supported Event Formats

  **Format**          **Examples**                                                          **Distinguishing Characteristics**
  Curated Rooms       Breakfasts, luncheons, cocktails, dinners, galas, networking events   Single-occasion, intimate, high curation. Typically 20--200 guests.
  Branded Houses      Multi-day activations at Cannes Lions, Art Basel, SXSW, Davos         Multi-day rotating guest programs, day-by-day programming, real-time briefings. 200--3,500+ guest pool.
  Annual Retreats     Client appreciation, partner programs, recurring summits              Recurring events with historical relationship tracking across years.
  Satellite Dinners   Conference-adjacent intimate gatherings                               Small (20--50), ultra-curated, often VIP-only alongside larger conferences.

# 2. Functional Modules

## 2.1 Event Creation & Management

### Purpose

Allow hosts to create, configure, and manage events with full metadata, capacity settings, and lifecycle status control.

### Required Capabilities

-   Create event with title, location (JSONB), start/end dates, timezone, image, event URL

-   Set event status: DRAFT → PUBLISHED → COMPLETE → CANCELLED

-   Configure capacity: total_capacity, seating_format (STANDING | SEATED | MIXED)

-   Configure tables: tables_config (JSONB) for seated events

-   Set approval mode: MANUAL (host reviews each request) or AUTO (auto-approve)

-   Set privacy: is_private flag (controls guest-side event discovery)

-   Define event hosts (JSONB array) and sponsors (JSONB array)

-   Upload event hero image (Azure Blob Storage)

-   Edit all event fields after creation

**Event Objectives & Target Criteria (AI-Driven)**

Each event must support host-defined objectives that drive AI scoring. Examples from materials:

-   \"Brand decision-makers, $10M+ media budgets\"

-   \"Creative agency leads\"

-   \"Luxury vertical partners\"

-   \"Exited founders with $50M+ net worth\"

These objectives become the scoring criteria for the Matchmaking Engine. The system evaluates every guest candidate against these objectives and produces a relevance score (0--100).

### Inputs

-   Event metadata from host (form fields)

-   Event image upload

-   Event objectives (free-text and/or structured criteria)

### Outputs

-   Event record in database with unique eventId

-   Public event URL (for mobile app discovery)

-   Dashboard views (Overview, Guests, Campaigns, Seating, Check-in)

### Edge Cases

-   Multi-day events (branded houses) with day-by-day programming

-   Events with no capacity limit vs. strictly capped events

-   Recurring events (same event, different dates) --- need to preserve guest history linkage

-   Cancellation of published events with existing RSVPs

### Existing Implementation

Events table, create/update API routes, CreateEventModal.tsx, event list page, and event detail layout with tab navigation are already built. Event objectives and AI scoring criteria are NOT yet implemented.

## 2.2 People Database (Persistent Contact Intelligence)

### Purpose

Maintain an organization-level, event-independent database of enriched contact profiles that compounds in value over time. This is Layer 1 of the three-layer architecture and the primary moat: the host never starts from zero.

### Required Capabilities

-   Import contacts via: CSV upload, CRM sync (Salesforce, HubSpot), past event import, manual entry

-   One-time enrichment per contact across multiple intelligence sources (LinkedIn, Clearbit, WealthX, Apollo, Crunchbase, public records)

-   Store enriched profile data: professional background, company, role, seniority, net worth range, investment activity, board affiliations, social links, philanthropy history

-   Track relationship history: which events they attended, interactions, follow-up status, engagement trajectory over time

-   Deduplicate contacts (match on email, name + company, LinkedIn URL)

-   Tag and segment contacts with custom labels/collections

-   Search and filter the full contact database

-   View contact timeline: meetings, email touchpoints, event attendance, role changes

**Data Fields (Inferred from Materials)**

  **Category**   **Fields**                                                                            **Source Type**
  Identity       full_name, first_name, last_name, email(s), phone(s), photo_url                   Host input + auto-enriched
  Professional   company, title, role_seniority, industry, company_size, linkedin_url               Auto-enriched
  Financial      net_worth_range, income_sources, assets, liquidity_events, investment_activity   Auto-enriched (WealthX, etc.)
  Network        board_affiliations, memberships (YPO, etc.), alma_mater, shared_connections        Auto-enriched
  Engagement     events_attended[], interaction_history[], follow_up_status, last_contacted   Computed from events
  Custom         internal_notes, tags[], custom_labels[], host_relationship_notes              Host input
  AI-Generated   ai_summary, talking_points[], conversation_starters[], risk_flags             Computed

### Inputs

-   CSV files (Papa Parse), CRM API connections, manual form entry, past event guest lists

### Outputs

-   Enriched contact profiles with multi-source intelligence

-   Searchable, filterable contact database

-   Contact cards with timeline and relationship history

### Edge Cases

-   Duplicate detection across different email addresses for same person

-   Enrichment failures (person not found in data sources) --- graceful degradation

-   Stale data refresh: how often to re-enrich (role changes, company moves, liquidity events)

-   Privacy: which enriched data is visible to which collaborators

### Existing Implementation

user_profiles table exists with basic fields (owner_id, emails, first_name, last_name, photo_url, event_ids). CSV bulk upload exists for campaign invitations. Full enrichment pipeline, People Database as a standalone entity, and CRM sync are NOT yet implemented.

## 2.3 Guest Pool Evaluation & AI Scoring

### Purpose

This is Layer 3 (Matchmaking Engine): automatically score and rank every contact in the People Database against a specific event's objectives. Produce a ranked recommendation list so the host can efficiently curate the invite list.

### Required Capabilities

-   Accept event objectives/criteria as scoring input

-   Score each person in the pool against event objectives (0--100 relevance score)

-   Provide per-guest scoring rationale: \"Why They Match\" explanation

-   Surface matched objective tags per guest (e.g., \"Brand media budgets $10M+\")

-   Sort and filter by score, objective match, tier, priority

-   Support re-scoring when objectives change

-   Generate approval decks for leadership sign-off

**Scoring Data Points (from Platform Preview)**

The demo shows four dashboard tabs for each guest pool:

-   **Objective Match:** How well each guest aligns with stated event objectives

-   **Guest Intelligence:** Enriched profile data --- professional background, financial context, network

-   **Relationship History:** Past interactions, event attendance, engagement trajectory

-   **Post-Event Outcomes:** Follow-up actions, meetings booked, pipeline generated

**Key Metrics (from Demo Dashboard)**

  **Metric**             **Cannes Lions Example**   **SuperReturn Example**
  Guest Pool Evaluated   2,400                      3,500
  Qualified for Event    583                        127
  Guests Invited         340                        24
  Avg. Relevance Score   86                         91

### Edge Cases

-   Very large pools (3,500+) --- scoring must be performant/async

-   Guests who score high but have relationship conflicts or blacklist status

-   Re-scoring after event objectives are changed mid-planning

-   Guests who appear in multiple partners' pools --- deduplication across collaborators

### Existing Implementation

NOT yet implemented. campaign_invitations has tier and priority fields but no AI scoring. The Flutter app has event_attendees_matches with match_score and match_reasons, but this is guest-side matching, not host-side pool evaluation.

## 2.4 Invitation Campaign Management

### Purpose

Manage named waves of invitations for each event. Support tiered invitation strategies where VIP/Tier 1 guests are invited first, with subsequent waves based on acceptance rates.

### Required Capabilities

-   Create multiple campaigns per event (e.g., \"Wave 1 --- VIP\", \"Wave 2 --- General\")

-   Campaign lifecycle: DRAFT → ACTIVE → PAUSED → COMPLETED → CANCELLED

-   Customize email templates per campaign: email_subject, email_body

-   Add guests to campaigns with status: CONSIDERING → INVITED → ACCEPTED → DECLINED → WAITLIST → BOUNCED → FAILED

-   Assign tier (TIER_1 | TIER_2 | TIER_3 | WAITLIST) and priority (VIP | HIGH | NORMAL | LOW) per guest

-   Bulk send RSVP emails within a campaign

-   Track denormalized campaign stats: total_considering, total_invited, total_accepted, total_declined, total_joined

-   CSV bulk import of guests into a campaign

-   Bulk update status/tier/priority across multiple invitations

### Invite Wave Strategy

The platform must support the following workflow:

1.  Host defines target capacity (e.g., 120 seats)

2.  Wave 1 (Tier 1/VIP): Invite top-scored, highest-priority guests first

3.  Monitor acceptance rate and remaining capacity

4.  Wave 2 (Tier 2): Fill remaining spots from next tier

5.  Waitlist management: auto-promote when spots open from declines

### Existing Implementation

Fully built: invitation_campaigns table, campaign_invitations table with tier/priority/status, RSVP email sending via Resend, CSV upload, bulk operations, denormalized stats via PostgreSQL triggers, CampaignForm, CampaignDetailPanel, GuestPipelineTable, SendRsvpModal, InviteWavePlanner components.

## 2.5 RSVP Management

### Purpose

Track and manage guest responses to invitations through the two-step flow: RSVP acceptance, then join room onboarding.

### Required Capabilities

-   **Flow 1 --- Invitation → RSVP (host-initiated):** Host sends RSVP email → guest clicks unique token link → accepts/declines → host sends join link to accepted guests → guest completes onboarding form → join request + attendee records created.

-   **Flow 2 --- Direct Join Request (guest-initiated):** Guest discovers event via mobile app → submits join request (PENDING) → host approves/rejects in dashboard → on approval, attendee record created.

-   Track invitation tokens with expiration (token_expires_at)

-   Track email delivery status (QUEUED | SENT | FAILED | BOUNCED) via email_send_log

-   Dashboard view: filter by RSVP status, sort by response date

-   Bulk actions: re-send to non-responders, send reminders

### Existing Implementation

Fully built: both flows implemented with token-based RSVP pages, join pages, email sending, and audit logging.

## 2.6 Join Request Management

### Purpose

Review and manage organic requests from guests who discover events through the mobile app or shared links.

### Required Capabilities

-   View all pending join requests with guest-submitted data: rsvp_contact, company_website, goals, looking_for

-   Approve or reject requests individually or in bulk

-   On approval: auto-create event_attendee record, upsert user_profile, add event to event_ids array

-   Track join request status: PENDING | APPROVED | REJECTED | CANCELLED | DRAFT

-   Support plus_ones field and comments

-   Guest visibility and notification preferences (visibility_enabled, notifications_enabled)

### Existing Implementation

Fully built: join request API with rate limiting, dashboard Guests tab with approval workflow, auto-repair for legacy user_profiles missing event_ids.

## 2.7 Guest Intelligence & Dossiers

### Purpose

Provide hosts with deep, AI-enriched intelligence on each guest: professional background, financial context, network connections, talking points, and conversation starters. This is the core \"guest intelligence\" that differentiates Moots from simple RSVP tools.

### Required Capabilities

-   Per-guest dossier view with enriched profile data

-   AI-generated talking points specific to event context

-   Shared connections with host team members

-   Conversation starters based on mutual interests, recent news, portfolio overlap

-   Risk flags (potential conflicts of interest, competitive relationships)

-   Relationship trajectory: how engagement has changed over time (e.g., net worth growth, role changes)

-   Team assignment: which host team member is assigned to connect with which guest

**Dossier Data Points (from Demo Dashboard)**

  **Field**                **Example**                                                            **Source**
  Name / Title / Company   Rachel Torres, VP Global Media, Unilever                               Auto-enriched
  Relevance Score          96/100                                                                 Computed (AI)
  Why They Match           \"Controls $340M digital spend, shifting 30% to creator platforms\"   Computed (AI)
  Matched Objectives       Brand media budgets $10M+                                             Computed (AI)
  Net Worth / AUM          $180M (for financial events)                                          Auto-enriched (WealthX)
  Talking Points           3--5 bullet points per guest                                           Computed (AI)
  Shared Connections       Mutual contacts in host network                                        Computed
  Relationship History     \"Met at Q3 Investor Forum\", attendance trajectory                    Computed from events
  Follow-Up Status         \"Pending\", \"Sent\", \"Meeting booked\"                              Tracked
  Team Assignment          Assigned host team member                                              Host input

### Existing Implementation

NOT yet implemented. GuestDetailPanel exists as a slide-out panel for viewing/editing basic guest info, but no enrichment, AI dossiers, talking points, or intelligence sources are built.

## 2.8 Pre-Event Briefing Packets

### Purpose

Generate personalized briefing documents for each host team member before the event: who they should meet, what to discuss, shared connections to reference, and conversation guides.

### Required Capabilities --- Pre-Event Briefing Packets

-   Generate per-rep briefing packet based on team assignment and event objectives

-   Include: guest photo, name, title, relevance score, talking points, shared connections

-   Support for door staff briefings (branded house format with day-by-day programming)

-   Export as PDF or view in-dashboard

-   Approval deck generation for leadership sign-off (summary of who's invited and why)

### Required Capabilities --- Day-Of & End-of-Day Updates (Multi-Day Events)

For branded houses and multi-day events, briefing packets must stay current throughout the event. The system generates periodic updates for the host team.

-   Morning briefing: who is expected today, their relevance scores, key objectives for the day, any new RSVPs or cancellations since yesterday

-   End-of-day recap: who checked in today, which conversations happened (based on check-in data and team notes), key opportunities surfaced, follow-up actions suggested

-   Walk-in intelligence: when a walk-in is onboarded (Module 2.13), their enrichment data is included in the next briefing update with a highlight flag

-   Delivery: push notification to host team via mobile app, email digest, or in-dashboard notification --- configurable per event

-   For single-day events: a pre-event summary (morning of) and a post-event recap (same evening or next morning) serve the same purpose

### Existing Implementation

NOT yet implemented.

## 2.9 Table & Seating Assignment

### Purpose

For seated events, assign guests to specific tables and seats. Support AI-optimized seating based on objectives and suggested introduction pairings.

### Required Capabilities

-   Assign guests to tables (table_assignment field exists on campaign_invitations)

-   Assign specific seats within tables (seat_assignment field exists, reserved for future)

-   Configure table layout via tables_config JSONB on events

-   AI-suggested seating optimization based on event objectives and guest compatibility

-   Suggested introduction pairings for hosts ("these two guests should meet")

-   Visual seating chart (future)

### Existing Implementation

Placeholder: /dashboard/[eventId]/seating route exists but no UI. table_assignment and seat_assignment fields exist on campaign_invitations. tables_config JSONB on events. No seating logic implemented.

## 2.10 Partner & Stakeholder Collaboration

### Purpose

Allow hosts to invite PR partners, sponsors, or internal stakeholders to collaborate on the guest list. Control what each collaborator can see and do.

### Required Capabilities

-   Invite external collaborators (PR agencies, sponsors) to review/suggest/approve guests

-   Role-based visibility: external collaborators see only what host chooses to share

-   Sensitive data gating: relevance scores and financial context visible only to core team

-   Collaborative actions: suggest guests, approve/flag guests, add notes

-   Audit trail: who suggested/approved/rejected which guest

### Existing Implementation

NOT yet implemented. No collaboration, roles, or permission system exists beyond single HTTP Basic Auth.

## 2.11 Post-Event Follow-Up & Automation

### Purpose

Automate follow-up sequences within hours of event completion while conversations are still warm. Track follow-up delivery, responses, and meeting bookings.

### Required Capabilities

-   Automated follow-up email sequences triggered post-event (within 2 hours, per website)

-   Personalized follow-up content referencing event context and conversation notes

-   Include scheduling links for booking follow-up meetings

-   Track follow-up status per guest: sent, opened, replied, meeting booked

-   Admin dashboard: see which team members connected with whom, which follow-ups sent, which guests responded

-   CRM sync: push follow-up data, meeting bookings, and interaction logs to Salesforce/HubSpot

**Key Metrics (from Sales Decks)**

-   2 hours post-event follow-up (vs. 2 weeks industry average)

-   319 curated follow-up notes sent automatically (Cannes case study)

-   47 follow-up gatherings booked within 48 hours (Cannes case study)

### Existing Implementation

NOT yet implemented. Email sending infrastructure exists (Resend + email_send_log) but no post-event automation, follow-up sequences, or CRM sync.

## 2.12 Analytics & ROI Reporting

### Purpose

Provide leadership with clear metrics tying event investment to business outcomes. Generate post-event engagement reports with pipeline attribution.

### Required Capabilities

-   Post-event ROI dashboard: pipeline generated, meetings booked, deals attributed

-   Engagement reports: who attended, quality of interactions, follow-up actions taken

-   Funnel visualization: Guest Pool → Qualified → Invited → Accepted → Attended → Follow-up → Pipeline

-   Team performance tracking: connections per team member, follow-up completion rate

-   Historical comparison: ROI across events over time (intelligence compounds)

-   Export reports for leadership review

**Key Metrics (from Website & Decks)**

  **Metric**                         **Value**
  Faster Guest Vetting               90% faster (from hours per name to seconds)
  Post-Event Follow-Up               2 hours (vs. 2 weeks)
  Meeting Conversion Rate            3.2× vs. unstructured networking
  Leadership Visibility              100% --- every dollar tracked to outcomes
  Pipeline Generated (Cannes)        $8.7M
  Pipeline Generated (SuperReturn)   $4.2M

### Existing Implementation

Capacity tracking and gauge visualization exist. Overview page shows basic stats. Full ROI reporting, pipeline attribution, and engagement analytics are NOT yet implemented.

## 2.13 Check-in & Walk-in Onboarding

### Purpose

Real-time check-in for event day. Support QR code scanning, manual lookup for door staff, and rapid walk-in onboarding for guests who arrive without being on the list.

### Required Capabilities --- Standard Check-in

-   QR code scanning via device camera (using html5-qrcode / @yudiel/react-qr-scanner)

-   Manual guest lookup by name

-   Real-time check-in status updates

-   Check-in counter: arrived vs. expected

-   For branded houses: day-specific check-in with rotating guest programs

-   Priority alerts: notify host team when VIP/high-priority guests arrive

### Required Capabilities --- Walk-in Guest Onboarding

When a guest arrives who is not on the list (walk-in, plus-one of an attendee, or last-minute addition), door staff must be able to onboard them instantly without disrupting the event flow.

-   Quick-add form on tablet/phone: name, email, phone number, company, title, relationship to host (e.g., "plus-one of [attendee name]")

-   On submission: system sends SMS or email with a deep link to the Moots guest app, allowing the walk-in to join the event and access the full guest experience (matches, introductions, chat)

-   Auto-create records: event_attendee, user_profile, and optionally a contact in the People Database

-   Real-time notification to host team: push notification or dashboard alert that a walk-in has arrived, including their name, company, and --- if enrichment is fast enough --- a quick intelligence snapshot (who they are, the opportunity)

-   Walk-in flagging: mark as WALK_IN in attendance records so hosts can distinguish planned vs. unplanned guests in post-event reporting

-   Optional: trigger immediate lightweight enrichment on the walk-in's email/name to surface relevant context for the host team within minutes

### Edge Cases

-   Walk-in provides only a phone number (no email) --- SMS deep link flow must work standalone

-   Walk-in is already in the People Database from a previous event --- match and merge, surface relationship history

-   Multiple walk-ins arriving simultaneously during peak entry --- form must be fast (under 30 seconds to complete)

-   Walk-in at a private event --- require host team approval before check-in is confirmed

### Existing Implementation

Check-in page (/checkin/[eventId]) with QR scanning exists. Dashboard check-in tab is a placeholder. Walk-in onboarding, SMS deep links, real-time host notifications, and priority alerts are NOT implemented.

## 2.14 Messaging & Communications

### Purpose

Manage all host-to-guest communications, including RSVP emails, join links, follow-up sequences, in-app messaging, and host broadcast announcements. Guest-to-guest messaging is handled by the Flutter mobile app (Stream Chat).

### Required Capabilities

-   RSVP invitation emails (customizable templates per campaign)

-   Join link emails to accepted guests

-   Post-event follow-up email sequences (automated)

-   Email delivery tracking: sent, bounced, failed (via email_send_log)

-   In-app guest messaging (via Flutter app using Stream Chat)

### Host Broadcast Channel

Each event has a one-way broadcast channel where the host can send announcements to all event guests. This is a host-to-all-guests communication tool for sharing important information before, during, and after the event.

-   Per-event broadcast channel: host composes a message from the dashboard, all event guests receive it in the mobile app and optionally via email/SMS

-   Use cases: venue changes, schedule updates, weather alerts, post-event thank-you messages, important logistics

-   One-way communication: guests can read but not reply to broadcast messages (keeps signal-to-noise ratio high)

-   Delivery options: push notification via mobile app, email via Resend, SMS (configurable per broadcast)

-   Scheduling: host can compose now and schedule for later (e.g., morning-of reminder)

-   Broadcast history: log of all sent broadcasts per event, visible in dashboard

### Existing Implementation

RSVP and join link email sending via Resend is fully built. Email audit log exists. In-app messaging is handled by the Flutter app (Stream Chat integration). Post-event automated sequences and host broadcast channel are NOT built.

## 2.15 Import & Export

### Purpose

Enable data portability: import guest lists from various sources, export data for external tools and reporting.

### Required Capabilities --- Import

-   CSV upload with Papa Parse (built)

-   CRM sync: Salesforce bi-directional, HubSpot contact & deal pipeline

-   Past event import: re-import guest lists from previous Moots events

-   Invitation platform sync: Paperless Post (invitation tracking), Luma (RSVP management)

-   Greenvelope import: Greenvelope does not offer a public API --- integration is via CSV export from Greenvelope's dashboard (guest names, emails, RSVP status, meal preferences, plus-ones). Moots imports the exported spreadsheet and maps fields to campaign_invitations. Document the recommended export steps for hosts using Greenvelope.

-   Workspace tool import: Airtable (via Airtable API --- read bases/tables), Notion (via Notion API --- read databases). Many event teams maintain guest lists and CRM-like databases in these tools.

-   Manual entry: single guest add form

### Required Capabilities --- Export

-   Approval decks: export curated guest list with scores for leadership review

-   Briefing packets: PDF export per team member

-   Post-event reports: engagement + ROI reports

-   CRM push: sync interactions, follow-ups, pipeline data back to CRM

-   CSV export of guest lists, attendee data

### Existing Implementation

CSV upload (Papa Parse) for campaign invitations is built. All other import/export capabilities (CRM sync, Paperless Post, Luma, PDF export, approval decks) are NOT yet implemented.

## 2.16 Public RSVP Page (Embeddable)

### Purpose

Provide each event with a branded, publicly shareable HTML page where invited guests can RSVP directly. This page can be shared via link or embedded into a host's existing website as an alternative to third-party invitation platforms (Paperless Post, Luma, Splash).

### Required Capabilities

-   Auto-generate a unique public URL per event (e.g., /e/[slug] or /rsvp/[eventId])

-   Branded landing page with event details: title, date/time, location, hero image, host information

-   RSVP form: name, email, company, title, dietary restrictions, plus-one option, custom fields (configurable per event)

-   Embeddable via iframe snippet --- host can paste into their own website or email campaign

-   Configurable appearance: host can choose color theme, add logo, customize confirmation copy

-   Capacity-aware: show \"Waitlist\" state when event is at capacity, or hide remaining spots

-   Confirmation email sent automatically on RSVP submission (via Resend)

-   RSVP submissions flow into the campaign_invitations pipeline with status ACCEPTED or WAITLIST

-   Anti-spam: rate limiting, honeypot fields, optional CAPTCHA for public-facing pages

-   QR code generation for the RSVP page URL (printable for physical invitations)

### Inputs

-   Event metadata (auto-populated from event record)

-   Host customization: branding overrides, custom form fields, confirmation copy

### Outputs

-   Public RSVP page URL

-   Embeddable iframe snippet (HTML code block for copy/paste)

-   QR code image (downloadable PNG/SVG)

-   RSVP submissions piped into invitation management pipeline

### Edge Cases

-   RSVP page for private events: require an access code or invitation token to view

-   Duplicate submissions from the same email address

-   Event at capacity: transition from RSVP to waitlist mode in real-time

-   Host disables RSVP page after a deadline

-   RSVP page must render correctly when embedded in diverse host websites (CSS isolation)

### Existing Implementation

NOT yet implemented. Token-based RSVP pages exist at /rsvp/[token] for invited guests, but there is no public, embeddable RSVP landing page per event. The existing RSVP flow requires a pre-generated invitation token.

## 2.17 Workspaces

### Purpose

Provide multi-tenant organizational containers (workspaces) where clients and their collaborators manage events, contacts, and campaigns together. A workspace represents a single client organization and all the people, events, and intelligence within it.

### Required Capabilities

-   Create a workspace for each client organization on signup

-   Workspace isolation: all data (events, contacts, campaigns, scores) scoped to workspace via workspace_id

-   Invite collaborators to workspace by email with assigned role (Owner, Admin, Team Member, External Partner, Viewer)

-   Workspace-level settings: organization name, logo, default branding, email sender identity, notification preferences

-   Workspace switching: users who belong to multiple workspaces can switch between them

-   Workspace member management: list members, update roles, remove access, view last active date

-   Per-event collaborator assignments: workspace members can be assigned to specific events (not all events visible to all members)

-   Workspace billing owner: one owner responsible for subscription/payment

### Workspace Roles

  **Role**           **Manage Members**   **Create Events**   **View All Events**   **Manage Billing**   **Delete Workspace**
  Owner              Yes                  Yes                 Yes                   Yes                  Yes
  Admin              Yes                  Yes                 Yes                   No                   No
  Team Member        No                   Yes                 Assigned only         No                   No
  External Partner   No                   No                  Assigned only         No                   No
  Viewer             No                   No                  Assigned only         No                   No

### Edge Cases

-   User invited to multiple workspaces: need workspace selector in navigation

-   Owner leaves or is removed: ownership must transfer before account closure

-   External partner invited to workspace but only for specific events --- event-scoped access

-   Workspace deletion: archive all data, require explicit confirmation, retain for recovery period

### Existing Implementation

NOT yet implemented. The organizations table is defined as a new entity in Section 4 but has no corresponding UI, API, or access control. Current system is single-tenant with HTTP Basic Auth.

## 2.18 Authentication & Login

### Purpose

Secure the host dashboard with a proper multi-user authentication system, replacing the current single-credential HTTP Basic Auth. Authentication is the foundation for workspaces, role-based permissions, audit logging, and collaborator access.

### Required Capabilities

-   Email + password registration and login with secure password hashing (bcrypt/argon2)

-   Magic link authentication (passwordless email login) as an alternative

-   Session management via secure HTTP-only cookies or JWT tokens

-   Password reset flow: request → email with reset token → set new password

-   Invitation-based onboarding: workspace owner invites collaborator by email → collaborator receives signup link → creates account → auto-joins workspace with assigned role

-   SSO support (SAML/OIDC) for enterprise clients (mentioned in website FAQ)

-   Multi-factor authentication (TOTP) for enterprise tier

-   Session expiration and automatic logout after configurable idle period

-   Login rate limiting and brute-force protection (via Upstash Redis, already available)

-   Account lockout after repeated failed attempts

### Auth Flows

**Flow 1 --- Self-Registration:** User visits signup page → enters email, password, name, organization → email verification sent → clicks verification link → account active → workspace auto-created.

**Flow 2 --- Invitation-Based:** Workspace owner invites collaborator by email → collaborator receives email with unique signup link → creates account (or logs in if existing) → auto-joined to workspace with assigned role.

**Flow 3 --- SSO (Enterprise):** Enterprise client configures SAML/OIDC provider in workspace settings → users authenticate via corporate identity provider → auto-provisioned in workspace.

### Edge Cases

-   User already has account and is invited to a second workspace --- auto-join, no re-registration

-   Password reset for accounts created via SSO (should be blocked, redirect to SSO provider)

-   Session persistence across browser tabs and devices

-   Migration path: existing HTTP Basic Auth users need seamless transition to new system

### Existing Implementation

Current authentication is a single HTTP Basic Auth credential set via DASHBOARD_USER and DASHBOARD_PASS environment variables, checked with timing-safe comparison. No user accounts, no session management, no multi-user support exists. The Flutter mobile app uses Firebase Auth (Apple Sign-In, phone OTP) --- this is a separate auth system for guests, not hosts.

## 2.19 Audit Log System

### Purpose

Record a comprehensive, immutable trail of all significant actions taken within a workspace. Allows administrators to answer \"who did what and when\" for accountability, compliance, and operational transparency.

### Required Capabilities

-   Log all write operations: create, update, delete actions on events, campaigns, invitations, contacts, and workspace settings

-   Log authentication events: login, logout, failed login attempts, password resets, SSO sessions

-   Log collaboration actions: member invited, role changed, access revoked, event assigned

-   Log communication actions: RSVP emails sent, join links sent, follow-up sequences triggered

-   Each log entry records: actor (user_id + email), action type, target entity (type + id), timestamp, IP address, previous value (for updates), new value (for updates)

-   Filterable audit log viewer in dashboard: filter by user, action type, entity type, date range

-   Searchable: find actions by guest name, event name, or email address

-   Export audit logs as CSV for compliance reporting

-   Retention policy: configurable per workspace (default: 12 months, enterprise: unlimited)

-   Immutable: audit records cannot be edited or deleted by any user (append-only table)

### Logged Action Categories

  **Category**     **Example Actions**
  Events           Event created, updated, published, cancelled, completed
  Guests           Guest added, status changed, tier changed, removed, scored
  Campaigns        Campaign created, activated, paused, emails sent, CSV uploaded
  Contacts         Contact created, enriched, merged (dedup), tagged, deleted
  Workspace        Member invited, role changed, access revoked, settings updated
  Auth             Login, logout, failed login, password reset, MFA enabled
  Communications   RSVP email sent, join link sent, follow-up triggered, email bounced

### Edge Cases

-   Bulk operations (e.g., bulk update 200 invitations) --- log as a single batch action with item count, not 200 individual entries

-   System-triggered actions (e.g., auto-promote from waitlist) --- log with actor = \"system\"

-   Very high-volume workspaces --- pagination and efficient querying over millions of log rows

-   GDPR: if a user requests data deletion, audit log retains action records but scrubs PII

### Existing Implementation

Partial: email_send_log tracks email delivery events. No general audit logging exists for user actions, data changes, or authentication events.

# 3. Core User Workflows

## 3.1 Create Event

1.  Host clicks "Create Event" from dashboard event list

2.  Fills in event metadata: title, dates, location, capacity, seating format, image

3.  Defines event objectives and target guest criteria

4.  Sets approval mode (MANUAL or AUTO) and privacy

5.  Saves as DRAFT, publishes when ready

## 3.2 Import & Enrich Guests

1.  Host uploads CSV, connects CRM, or imports from past events into People Database

2.  System enriches each contact across intelligence sources (one-time per contact, not per event)

3.  Enrichment results populate dossier fields: background, financial context, network, AI summary

4.  Host reviews enriched profiles, adds internal notes/tags

## 3.3 Score & Curate Guest List

1.  AI scores entire People Database against event objectives

2.  Host reviews ranked list with relevance scores and "Why They Match" rationale

3.  Host approves, skips, or flags candidates

4.  Optionally invites PR partners/sponsors to collaborate on curation

5.  Generates approval deck for leadership sign-off

## 3.4 Manage Invitation Waves

1.  Host creates Campaign (e.g., "Wave 1 --- VIP")

2.  Adds approved guests to campaign with tier and priority

3.  Customizes email template for the wave

4.  Sends RSVP invitations in bulk

5.  Monitors acceptance rate; opens Wave 2 as needed

6.  Sends join links to accepted guests

## 3.5 Run Event Check-in

1.  Door staff opens check-in page on tablet/phone

2.  Scans guest QR code or looks up by name

3.  System confirms guest is on approved list, marks as checked in

4.  Real-time arrival counter visible to host team

5.  VIP alerts triggered when priority guests arrive

## 3.6 Post-Event Follow-Up & Reporting

1.  Within 2 hours of event end, automated follow-up sequences send personalized emails

2.  Each follow-up references event context, conversation notes, includes scheduling link

3.  Track response rates, meeting bookings, pipeline attributed

4.  Sync all data to CRM (Salesforce/HubSpot)

5.  Generate post-event ROI report for leadership

6.  Update People Database with new interaction data (intelligence compounds)

# 4. Data Entities

The following entities represent the core data model. Items marked [EXISTS] are already in the Neon PostgreSQL schema. Items marked [NEW] must be designed and implemented.

## 4.1 Existing Entities

**events [EXISTS]**

  **Field**                **Type**    **Notes**
  id                       SERIAL PK   
  title                    TEXT        
  location                 JSONB       Structured location object
  start_date, end_date   TIMESTAMP   
  timezone                 TEXT        
  image_url               TEXT        Azure Blob Storage URL
  event_url               TEXT        Public-facing URL
  hosts                    JSONB       Array of host objects
  sponsors                 JSONB       Array of sponsor objects
  is_private              BOOLEAN     Controls guest-side discovery
  approve_mode            ENUM        MANUAL | AUTO
  status                   ENUM        DRAFT | PUBLISHED | COMPLETE | CANCELLED
  total_capacity          INT         
  seating_format          ENUM        STANDING | SEATED | MIXED
  tables_config           JSONB       Table layout configuration

**invitation_campaigns [EXISTS]**

  **Field**                                                                             **Type**      **Notes**
  id                                                                                    SERIAL PK     
  event_id                                                                             FK → events   
  name                                                                                  TEXT          e.g., \"Wave 1 --- VIP\"
  status                                                                                ENUM          DRAFT | ACTIVE | PAUSED | COMPLETED | CANCELLED
  email_subject, email_body                                                           TEXT          Custom per-campaign templates
  total_considering, total_invited, total_accepted, total_declined, total_joined   INT           Denormalized via triggers

**campaign_invitations [EXISTS]**

  **Field**                             **Type**        **Notes**
  id                                    SERIAL PK       
  campaign_id, event_id               FK              
  full_name, email                     TEXT            Email unique per campaign
  status                                ENUM            CONSIDERING | INVITED | ACCEPTED | DECLINED | WAITLIST | BOUNCED | FAILED
  tier                                  ENUM            TIER_1 | TIER_2 | TIER_3 | WAITLIST
  priority                              ENUM            VIP | HIGH | NORMAL | LOW
  invitation_token, join_token        TEXT (unique)   For RSVP and join flows
  table_assignment, seat_assignment   TEXT            Reserved for seating feature
  internal_notes                       TEXT            Host-only notes

### Other Existing Entities

-   **event_join_requests [EXISTS]:** Guest-submitted requests with status, contact info, goals, plus_ones

-   **event_attendees [EXISTS]:** Created on approval, links guest to event via owner_id and user_profile_id

-   **user_profiles [EXISTS]:** Basic profiles with owner_id, emails, name, photo, event_ids array

-   **email_send_log [EXISTS]:** Audit trail for all emails sent (type, status, service response)

## 4.2 New Entities Required

**contacts (People Database) [NEW]**

Organization-level persistent contact records, independent of events. Replaces the per-campaign guest model for the intelligence layer.

  **Field**                             **Type**             **Notes**
  id                                    UUID PK              
  org_id                               FK → organizations   Multi-tenant isolation
  full_name, first_name, last_name   TEXT                 
  emails                                JSONB                Array of email objects
  phones                                JSONB                
  photo_url                            TEXT                 
  company, title, role_seniority       TEXT                 
  industry                              TEXT                 
  linkedin_url, twitter_url           TEXT                 
  net_worth_range                     TEXT                 From enrichment
  board_affiliations                   JSONB                
  enrichment_data                      JSONB                Raw enrichment payload
  enriched_at                          TIMESTAMP            Last enrichment date
  ai_summary                           TEXT                 AI-generated profile summary
  tags                                  TEXT[]             Custom host tags
  internal_notes                       TEXT                 
  source                                TEXT                 How contact was added
  event_history                        JSONB                Events attended + outcomes

**event_objectives [NEW]**

Scoring criteria per event for the Matchmaking Engine.

  **Field**          **Type**      **Notes**
  id                 UUID PK       
  event_id          FK → events   
  objective_text    TEXT          e.g., \"Brand decision-makers, $10M+ media budgets\"
  weight             FLOAT         Relative importance for scoring
  criteria_config   JSONB         Structured matching rules

**guest_scores [NEW]**

Per-contact, per-event AI scoring results.

  **Field**             **Type**        **Notes**
  id                    UUID PK         
  contact_id           FK → contacts   
  event_id             FK → events     
  relevance_score      INT (0--100)    
  matched_objectives   JSONB           Which objectives this person matches
  score_rationale      TEXT            AI-generated \"Why They Match\"
  talking_points       JSONB           AI-generated conversation starters
  scored_at            TIMESTAMP       

**collaborators [NEW]**

  **Field**                   **Type**      **Notes**
  id                          UUID PK       
  event_id                   FK → events   
  user_email                 TEXT          
  role                        ENUM          OWNER | TEAM_MEMBER | PR_PARTNER | VIEWER
  permissions                 JSONB         Granular access control
  invited_at, accepted_at   TIMESTAMP     

**follow_up_sequences [NEW]**

  **Field**                           **Type**        **Notes**
  id                                  UUID PK         
  event_id                           FK → events     
  contact_id                         FK → contacts   
  status                              ENUM            PENDING | SENT | OPENED | REPLIED | MEETING_BOOKED
  email_content                      TEXT            Personalized follow-up
  sent_at, opened_at, replied_at   TIMESTAMP       
  meeting_link                       TEXT            Scheduling link
  crm_synced                         BOOLEAN         

**workspaces [NEW]**

Multi-tenant organizational containers. Replaces the simpler organizations concept with full workspace management including collaborator access control.

  **Field**     **Type**        **Notes**
  id            UUID PK         
  name          TEXT            Organization / workspace name
  slug          TEXT (unique)   URL-safe identifier for workspace switching
  logo_url     TEXT            Workspace logo (Azure Blob Storage)
  plan          ENUM            PILOT | STANDARD | ENTERPRISE
  owner_id     FK → users      Billing owner
  settings      JSONB           Branding, email sender identity, notification prefs
  created_at   TIMESTAMP       

**workspace_members [NEW]**

Maps users to workspaces with roles and access control.

  **Field**          **Type**          **Notes**
  id                 UUID PK           
  workspace_id      FK → workspaces   
  user_id           FK → users        
  role               ENUM              OWNER | ADMIN | TEAM_MEMBER | EXTERNAL_PARTNER | VIEWER
  event_ids         UUID[]          Events this member can access (null = all, for Owner/Admin)
  invited_at        TIMESTAMP         
  accepted_at       TIMESTAMP         Null if invitation pending
  last_active_at   TIMESTAMP         

**users [NEW]**

Authenticated user accounts for the host dashboard. Separate from user_profiles (which are guest-side mobile app profiles).

  **Field**              **Type**        **Notes**
  id                     UUID PK         
  email                  TEXT (unique)   Primary login email
  password_hash         TEXT            bcrypt/argon2 hash (null for SSO-only accounts)
  full_name             TEXT            
  avatar_url            TEXT            
  email_verified        BOOLEAN         Must verify before full access
  mfa_enabled           BOOLEAN         TOTP multi-factor auth
  mfa_secret            TEXT            Encrypted TOTP secret
  sso_provider          TEXT            SAML/OIDC provider ID (null for email/password)
  sso_subject_id       TEXT            External identity provider user ID
  last_login_at        TIMESTAMP       
  failed_login_count   INT             Reset on successful login
  locked_until          TIMESTAMP       Account lockout expiry
  created_at            TIMESTAMP       

**sessions [NEW]**

Active user sessions for the host dashboard.

  **Field**       **Type**          **Notes**
  id              UUID PK           Session token
  user_id        FK → users        
  workspace_id   FK → workspaces   Active workspace for this session
  ip_address     INET              
  user_agent     TEXT              
  expires_at     TIMESTAMP         
  created_at     TIMESTAMP         

**audit_logs [NEW]**

Immutable, append-only audit trail for all significant actions within a workspace.

  **Field**         **Type**                **Notes**
  id                UUID PK                 
  workspace_id     FK → workspaces         Scoped to workspace
  actor_id         FK → users (nullable)   Null for system-triggered actions
  actor_email      TEXT                    Denormalized for log readability
  action            TEXT                    e.g., event.created, guest.status_changed, campaign.emails_sent
  entity_type      TEXT                    e.g., event, campaign, invitation, contact, workspace
  entity_id        UUID                    
  previous_value   JSONB                   State before change (for updates)
  new_value        JSONB                   State after change (for updates)
  metadata          JSONB                   Additional context (batch size, IP, etc.)
  ip_address       INET                    
  created_at       TIMESTAMP               Immutable, indexed

**broadcast_messages [NEW]**

Host-to-all-guests announcements per event.

  **Field**            **Type**      **Notes**
  id                   UUID PK       
  event_id            FK → events   
  sender_id           FK → users    Host team member who sent it
  content              TEXT          Message body
  delivery_channels   TEXT[]      PUSH | EMAIL | SMS
  scheduled_at        TIMESTAMP     Null = send immediately
  sent_at             TIMESTAMP     
  recipient_count     INT           Denormalized guest count
  created_at          TIMESTAMP     

**rsvp_pages [NEW]**

Configuration for per-event public RSVP landing pages.

  **Field**           **Type**        **Notes**
  id                  UUID PK         
  event_id           FK → events     One RSVP page per event
  slug                TEXT (unique)   URL slug: /e/[slug]
  is_enabled         BOOLEAN         Host can disable the page
  custom_fields      JSONB           Additional form fields beyond default set
  branding            JSONB           Logo URL, color overrides, confirmation message
  access_code        TEXT            Optional: required for private events
  rsvp_deadline      TIMESTAMP       Auto-disable after this date
  waitlist_enabled   BOOLEAN         Accept waitlist when at capacity
  created_at         TIMESTAMP       

# 5. Permissions & Roles

The following role hierarchy is inferred from the FAQ ("Moots supports role-based collaboration") and the partner collaboration requirements.

  **Role**      **Description**                                          **Can View Scores/Financial**   **Can Invite Guests**   **Can Approve Guests**   **Can Edit Event**
  Event Owner   Created the event. Full access.                          Yes                             Yes                     Yes                      Yes
  Team Member   Internal staff. Full operational access.                 Yes                             Yes                     Yes                      Limited
  PR Partner    External collaborator. Can suggest and review guests.    No                              Suggest only            No                       No
  Sponsor       Event sponsor. Can view guest list, suggest additions.   No                              Suggest only            No                       No
  Viewer        Read-only access to event overview and reports.          No                              No                      No                       No

## 5.1 Data Visibility Rules

-   **Core Team (Owner + Team Members):** See everything --- relevance scores, financial context, internal notes, AI dossiers.

-   **PR Partners / Sponsors:** See guest names, titles, companies, and public profile info. Do NOT see relevance scores, financial data, internal notes, or AI-generated intelligence.

-   **Viewers:** See event overview, capacity status, and aggregate reports. No individual guest data.

## 5.2 Authentication & Access Control

The dashboard currently uses HTTP Basic Auth (single credential set via environment variables). Module 2.18 defines the replacement authentication system with email/password, magic link, and SSO support. All API routes must transition from Basic Auth to session-based or JWT authentication. The workspace_members table (Section 4) stores role assignments, and middleware must enforce role-based access on every request.

### Access Control Enforcement

-   Every API route checks: (1) user is authenticated, (2) user belongs to the target workspace, (3) user's role permits the requested action

-   Event-scoped access: Team Members, External Partners, and Viewers only see events listed in their workspace_members.event_ids

-   Sensitive data gating: relevance scores, financial context, and AI dossiers require OWNER, ADMIN, or TEAM_MEMBER role

-   All permission checks logged to audit_logs for compliance (Module 2.19)

# 6. Integration Requirements

  **Integration**      **Type**            **Direction**    **Purpose**                                                          **Status**
  CSV Import           File                Inbound          Bulk upload guest lists via Papa Parse                               BUILT
  Salesforce           API (CRM)           Bi-directional   Sync contacts, push follow-ups, pipeline attribution                 NOT BUILT
  HubSpot              API (CRM)           Bi-directional   Contact & deal pipeline sync                                         NOT BUILT
  Paperless Post       API (Invitations)   Inbound          Invitation tracking --- sync RSVP status                             NOT BUILT
  Luma                 API (Events)        Inbound          RSVP management --- import attendee lists                            NOT BUILT
  Resend               API (Email)         Outbound         RSVP emails, join links, follow-ups                                  BUILT
  Azure Blob Storage   API (Storage)       Outbound         Event images, avatars                                                BUILT
  Webhooks & API       API                 Both             Custom automations, third-party integrations                         NOT BUILT
  Enrichment Sources   API (Data)          Inbound          LinkedIn, Clearbit, WealthX, Apollo, Crunchbase                      NOT BUILT
  Calendar             API                 Outbound         Meeting scheduling from follow-ups                                   NOT BUILT
  Flutter Mobile App   API (Internal)      Both             Guest-side event data, join requests, attendee sync                  PARTIAL
  SSO (SAML/OIDC)      Auth                Inbound          Enterprise single sign-on for host dashboard users                   NOT BUILT
  Greenvelope          File (CSV)          Inbound          Import guest lists via CSV export from Greenvelope (no public API)   NOT BUILT
  Airtable             API (Workspace)     Inbound          Import guest lists and contact data from Airtable bases              NOT BUILT
  Notion               API (Workspace)     Inbound          Import guest lists and contact data from Notion databases            NOT BUILT

## 6.1 CRM Sync Requirements

-   Push enriched contact data to CRM on enrichment

-   Pull existing CRM contacts into People Database

-   Push event attendance, follow-up actions, meeting bookings to CRM

-   Map Moots contact fields to CRM fields (configurable mapping)

-   Handle CRM rate limits and sync failures gracefully

## 6.2 Enrichment Pipeline Requirements

-   Batch enrichment: process hundreds/thousands of contacts asynchronously

-   Multi-source aggregation: combine data from LinkedIn, WealthX, Apollo, Clearbit, Crunchbase, public records

-   Graceful degradation: if one source fails, still return available data

-   Refresh policy: configurable staleness threshold for re-enrichment

-   Cost management: track enrichment API costs per contact

# 7. Non-Functional Requirements

## 7.1 Performance

-   Dashboard page load: <2 seconds for event overview with up to 500 guests

-   AI scoring: process 3,500 guest pool within 5 minutes (async with progress indicator)

-   Email sending: batch send up to 500 RSVP emails per campaign without timeout

-   Search: <500ms response for contact search across 10,000+ records

-   Check-in: QR scan to confirmation in <1 second

## 7.2 Scalability

-   Multi-event: hosts manage multiple concurrent events across different formats

-   Guest pool: support evaluation of 3,500+ guests per event

-   People Database: scale to 10,000+ contacts per organization

-   Multi-tenant: organizations share no data; complete isolation via org_id

## 7.3 Security & Privacy

-   Enterprise-grade privacy: all intelligence processed in isolated, encrypted environments (per FAQ)

-   Guest data never shared across organizations

-   SOC 2 compliance path (mentioned in website enterprise features)

-   GDPR compliance: data deletion on request, consent tracking

-   Sensitive financial data (net worth, income) visible only to core team roles

-   Rate limiting on public endpoints (already implemented via Upstash Redis)

-   Timing-safe auth comparison (already implemented)

## 7.4 Mobile Responsiveness

-   Dashboard must function on tablet (door staff check-in use case)

-   Check-in page optimized for phone/tablet camera scanning

-   Guest-facing pages (RSVP, join) are already mobile-responsive

## 7.5 Reliability

-   Email delivery tracking with retry logic for failures

-   Enrichment pipeline with retry and partial-failure handling

-   Campaign statistics kept in sync via PostgreSQL triggers (denormalized, not computed on read)

-   Legacy data auto-repair (user_profiles missing event_ids)

## 7.6 Brand & Design Standards

All host-facing UI must adhere to the Moots brand guidelines:

-   Colors: Terracotta (\#B8755E), Forest Green (\#2F4F3F), Cream (\#FAF9F7), Charcoal (\#1C1C1E)

-   Typography: Playfair Display (headings/names), DM Sans (body/UI)

-   Minimum 17px body text for 40+ professional readability

-   8pt grid spacing system

-   Cards: 20px radius, layered shadows, 24px padding

-   Buttons: 56px height, 28px border-radius, terracotta primary

# 8. Open Questions

The following areas require founder decisions before implementation can proceed:

  **\#**   **Question**                                                **Context**                                                                                                                                                                           **Impact**
  1        Auth library/framework choice?                              Module 2.18 defines the auth requirements. Options: NextAuth.js (built-in Next.js support), Lucia Auth (lightweight), Auth.js, or custom implementation with bcrypt + iron-session.   Blocks: authentication implementation, session management, SSO integration.
  2        People Database: separate table or extend user_profiles?   user_profiles exists but is guest-scoped (owner_id). People Database needs org-scoped contacts independent of Flutter user accounts.                                                Blocks: contact enrichment, persistent intelligence, CRM sync.
  3        Enrichment provider priority and budget?                    Multiple sources mentioned (LinkedIn, WealthX, Apollo, Clearbit, Crunchbase). Each has different cost per lookup and data quality.                                                    Blocks: enrichment pipeline design and cost modeling.
  4        AI model for scoring and dossier generation?                Need LLM for: scoring rationale, talking points, conversation starters, profile summaries. Options: GPT-4, Claude, self-hosted.                                                       Blocks: AI scoring engine, dossier generation, briefing packets.
  5        Supabase vs. Neon for People Database?                      Dashboard uses Neon, Flutter app uses Supabase. People Database needs to be accessible from both.                                                                                     Blocks: database architecture for shared data layer.
  6        Multi-day event programming model?                          Branded houses have day-by-day programming with different guest rotations. How is this modeled? Sub-events? Day slots?                                                                Blocks: branded house check-in, day-specific briefings.
  7        CRM sync: push-only or bi-directional?                      Bi-directional mentioned on website, but adds complexity (conflict resolution, field mapping). MVP could be push-only.                                                                Impacts: integration timeline and complexity.
  8        Waitlist auto-promotion logic?                              When a guest declines, should the next waitlisted guest be auto-invited, or require host approval?                                                                                    Impacts: waitlist management UX and automation level.
  9        Follow-up email sender identity?                            Should follow-ups come from the host's email domain (requires DNS setup) or from a Moots domain?                                                                                      Impacts: email deliverability and brand perception.
  10       Approval deck format?                                       Website mentions "approval decks for leadership sign-off." PDF export? In-dashboard shared view? PowerPoint?                                                                          Impacts: export functionality scope.
  11       Historical data migration?                                  Are there existing events/guests from before this build that need to be imported into the People Database?                                                                            Impacts: data migration planning.
  12       Relationship between campaign_invitations and contacts?    Currently guests are added directly to campaigns. With People Database, should campaign_invitations reference contacts table?                                                        Blocks: data model refactoring for intelligence layer.
  13       RSVP page: public or gated by default?                      Should the embeddable RSVP page be publicly accessible for all events, or require an access code for private events? What about spam prevention on public pages?                      Impacts: RSVP page access model, anti-spam measures.
  14       Workspace self-service signup or admin-provisioned?         Should new clients be able to create their own workspace via self-registration, or must workspaces be provisioned by Moots admin during onboarding?                                   Impacts: signup flow, billing integration, onboarding automation.
  15       Audit log retention and storage?                            Audit logs grow indefinitely. Should they be stored in the same Neon database or offloaded to a time-series/log store? What retention period for each tier?                           Impacts: database sizing, query performance, compliance posture.
  16       Walk-in deep link delivery: SMS provider?                   Walk-in onboarding sends a deep link to the mobile app via SMS or email. SMS requires a provider (Twilio, MessageBird, etc.). Which provider and what sender identity?                Impacts: walk-in onboarding flow, cost per SMS.
  17       Airtable/Notion import: field mapping strategy?             Airtable bases and Notion databases have arbitrary schemas. Should Moots auto-detect common fields (name, email, company) or require hosts to map columns manually?                   Impacts: import UX complexity, data quality.

**Appendix A: Existing Tech Stack Reference**

  **Layer**               **Technology**
  Framework               Next.js 14 (App Router, TypeScript)
  Styling                 Tailwind CSS 3, Lucide React icons
  Primary Database        Neon (serverless PostgreSQL) via @neondatabase/serverless
  Optional Secondary DB   Supabase (used in entry/mobile mode)
  File Storage            Azure Blob Storage (event images, avatars)
  Email                   Resend
  Rate Limiting           Upstash Redis (optional; falls back to in-memory)
  Validation              Zod
  CSV Parsing             Papa Parse
  QR Codes                qrcode, html5-qrcode, @yudiel/react-qr-scanner

**Appendix B: Existing API Routes**

  **Method**         **Route**                                          **Auth**   **Purpose**
  GET                /api/events                                        Yes        List all events
  POST               /api/events/create                                 Yes        Create new event
  GET                /api/events/[eventId]                            No         Get event details (mobile)
  PATCH              /api/events/update                                 Yes        Update event
  GET                /api/events/[eventId]/join-requests              Yes        List join requests with stats
  POST               /api/events/[eventId]/join-requests              No         Submit join request (rate-limited)
  GET                /api/events/[eventId]/capacity-status            Yes        Filled/remaining metrics
  GET/POST           /api/events/[eventId]/campaigns                  Yes        List/create campaigns
  GET/PATCH/DELETE   /api/campaigns/[campaignId]                      Yes        Campaign CRUD
  POST               /api/campaigns/[campaignId]/send-rsvp            Yes        Send RSVP emails in bulk
  GET/POST           /api/campaigns/[campaignId]/invitations          Yes        List/create invitations
  POST               /api/campaigns/[campaignId]/invitations/upload   Yes        CSV bulk upload
  POST               /api/invitations/bulk-update                       Yes        Bulk update status/tier/priority
  POST               /api/invitations/bulk-send-join-links              Yes        Send join links
  GET/POST           /api/rsvp/[token]                                No         RSVP flow (public)
  GET/POST           /api/join/[token]                                No         Join flow (public)
  POST               /api/uploads/event-image                           Yes        Upload to Azure

**Appendix C: Frontend Page Map**

  **Route**                          **Purpose**                                                   **Status**
  /                                  Homepage / marketing landing page                             Built
  /dashboard                         Event list (upcoming, past, drafts)                           Built
  /dashboard/[eventId]/overview    Stats, capacity gauge, recent activity                        Built
  /dashboard/[eventId]/guests      Guest approval workflow                                       Built
  /dashboard/[eventId]/campaigns   Invitation wave management                                    Built
  /dashboard/[eventId]/seating     Seating arrangement planning                                  Placeholder
  /dashboard/[eventId]/checkin     Check-in management tab                                       Placeholder
  /checkin/[eventId]               Real-time check-in with QR scanning                           Built
  /rsvp/[invitation-token]         Guest RSVP accept/decline page                                Built
  /join/[join-token]               Guest onboarding / join room page                             Built
  /e/[slug]                        Public embeddable RSVP page per event                         NOT BUILT
  /login                             Email/password and magic link login                           NOT BUILT
  /signup                            Self-registration with workspace creation                     NOT BUILT
  /signup/invite/[token]           Invitation-based collaborator onboarding                      NOT BUILT
  /dashboard/settings/workspace      Workspace settings, members, roles                            NOT BUILT
  /dashboard/settings/audit-log      Audit log viewer with filters/search                          NOT BUILT
  /dashboard/[eventId]/rsvp-page   RSVP page configuration and embed code                        NOT BUILT
  /dashboard/[eventId]/broadcast   Host broadcast channel --- send announcements to all guests   NOT BUILT

# Context Tab — Revision Notes (v2)

> Apply these changes to the Context tab implementation. These revisions come from reviewing the first build against the spec and the existing Moots platform.

---

## 1. Remove the floating chat bar on the Context tab

**Problem**: The Context tab currently has TWO chat inputs — the floating bottom chat bar ("Ask Moots about your event...") that exists across all tabs, AND the Moots Intelligence input bar inside the right panel ("Ask Moots to research..."). They conflict with each other visually and functionally.

**Fix**: On the Context tab ONLY, hide the global floating chat bar. The right panel's Moots Intelligence input is the chat for this tab. This is the only tab where the floating chat should not appear.

**Why this matters**: The Moots Intelligence panel in the right column IS the conversation. Everything we built for the activity feed, SSE streaming, user message bubbles — that's how the chat should work everywhere eventually. But for now, the Context tab is the only place it lives, and the floating bar creates duplication.

---

## 2. Event Details — field input types need proper controls

**Problem**: Clicking "Date" opens a plain text input instead of a date picker. "Time" has no time picker. These are unusable as plain text fields.

**Fix**:
- **Date**: Use a proper date picker component (calendar popup). The existing event creation form already uses `MM/DD/YYYY` date inputs — match that pattern.
- **Time**: Use a time picker or dropdown selector. The creation form uses time dropdowns (e.g., "6:00 PM", "10:00 PM") — reuse the same component. The Context tab should show **Start Time – End Time** (two pickers), not a single text field.
- **Start Date / End Date**: The creation form supports separate start and end dates + times. The Context tab currently only shows one "Date" field. It should show Start Date + Start Time / End Date + End Time, matching the creation form.

---

## 3. Event Details — align fields with existing event creation form

**Problem**: The Context tab's Event Details section has different fields than the creation form. Fields need to be merged.

**Existing creation form fields** (from the "Create Event" modal):
- Event Format (Curated Dinner, Branded House, Annual Retreat, Custom)
- Event Title
- Start Date + Start Time
- End Date + End Time
- Timezone
- Location (Venue name, City, State — 3 separate fields)
- Private event (invite-only) checkbox

**Context tab currently shows**:
- Event Name, Type, Date, Time, Location, Capacity, Host, Dress Code, Description

**Merge strategy**:
- **Keep from creation form**: Event Format (shows as "Type" on Context tab — use the same 4 options as selectable chips or dropdown), Start/End Date+Time, Timezone, Location (Venue, City, State), Private event toggle
- **Keep from Context tab**: Capacity, Hosting Company (renamed from "Host" — see below), Dress Code, Description
- **Add missing**: Partners/Sponsors section (see item 5 below)
- **Remove**: The "From event setup" badge is fine as a read-only indicator for fields that came from the creation flow

---

## 4. Rename "Host" → "Hosting Company"

**Problem**: "Host" currently shows a person's name ("Marcus Sterling"). But in the Moots context, the host is typically the company using the product (e.g., "Meridian Capital Partners"). It could also be a PR agency's client.

**Fix**:
- Rename the field to **"Hosting Company"**
- Default value: the company name from the user's organization/account
- Keep it editable — PR agencies will change this to their client's name
- If you want to show a person, that's the "Event Lead" or part of the Team section

---

## 5. Add Team & Partners to Event Details

**Problem**: The creation form has steps for "Guest Pool" and "Team" (steps 3 and 4), but the Context tab doesn't surface the team attached to this event or partners/sponsors.

**Fix**: Add two sub-sections inside Event Details:

**Team** (read-only, with link to manage):
- Show team members attached to this event (avatars + names)
- "Manage team" link → goes to Team settings or the creation form's step 4

**Partners / Sponsors** (editable):
- List of sponsor/partner companies with role and tier
- "Add partner" button → inline form: Company name, Role (dropdown: Sponsor, Partner, Co-host, Venue), Tier (Primary, Gold, Silver)
- This feeds directly into the Generated Context's Sponsors card
- If sponsors are detected from uploaded documents, the AI should auto-populate this section and note it in the activity feed

---

## 6. Timestamps — format them properly

**Problem**: The activity feed shows raw ISO timestamps like `2026-03-02T00:41:42.068Z`.

**Fix**: Use relative time formatting:
- Under 1 minute: "Just now"
- Under 1 hour: "5 minutes ago"
- Under 24 hours: "2 hours ago"
- Older: "Mar 2, 2026 12:41 AM"

Use the same timestamp formatting pattern used elsewhere in the platform (check the Overview tab's "AI Agent Activity" section — it shows "2d ago").

---

## 7. Activity feed empty state needs guidance

**Problem**: When the Context tab loads fresh, the right panel shows one welcome message and vast white space. Users don't understand what the feed will become.

**Fix**: Below the welcome message, show a subtle onboarding hint — 3 ghost/faded steps showing what the feed will look like once they start:

```
1. Upload documents    →  "AI reads & extracts key information"
2. Generate context    →  "AI researches market, finds insights"
3. Ask questions       →  "AI helps with speakers, sponsors, strategy"
```

Style: Muted text, dashed timeline connectors (not solid), ~50% opacity. Disappears once the first real activity arrives.

---

## 8. Right panel divider styling

**Problem**: The vertical divider between left and right panels is a soft pink/terracotta gradient. It looks decorative rather than structural.

**Fix**: Replace with a clean `border-right: 1px solid` using the platform's standard border colour (check Tailwind config for `border-default` or similar). Should feel like a structural panel divider, not a decorative element.

---

## 9. Generate Context button — make it visible and prominent

**Problem**: There's no visible "Generate Context" CTA. The spec calls for a fixed bottom button on the left panel, but it's not rendering or not visible.

**Fix**:
- Add a prominent "Generate Context" button at the bottom of the left panel (fixed/sticky)
- Show it as soon as at least one document or link has been added
- Before any uploads: show a disabled state or don't show it at all
- Button states: `✦ Generate Context` (primary, brand fill) → `⟳ Analysing...` (disabled, spinner) → `✦ Re-generate Context` (secondary/outline after first generation)

---

## 10. Suggested prompts should be contextual

**Problem**: The chat suggestion chips ("Who are my top 5 guests?", "Summarize the seating arrangement", "Who hasn't responded yet?") assume guest data already exists. On a fresh Context tab with no generated context, these don't make sense.

**Fix**: Adapt suggestions based on state:

**Before context generation:**
- "What documents should I upload for a dinner event?"
- "Help me define the event's strategic purpose"
- "What context is the AI missing?"

**After context generation:**
- "Who are my top 5 guests?"
- "Find keynote speakers from past events"
- "What competing events are happening that week?"

---

## 11. Left panel bottom padding

**Problem**: When scrolled down, the Documents and Links sections get partially obscured by the Generate Context button (or previously by the floating chat bar).

**Fix**: Add bottom padding to the left panel's scrollable area equal to the height of the fixed bottom button (~80px) so all content remains accessible when scrolled to the bottom.

---

## Summary of field mapping (Creation Form → Context Tab)

| Creation Form Field | Context Tab Field | Input Type | Notes |
|---|---|---|---|
| Event Format | Type | Selectable chips or dropdown (4 options) | Curated Dinner, Branded House, Annual Retreat, Custom |
| Event Title | Event Name | Inline text edit | Pre-populated |
| Start Date | Start Date | Date picker (calendar) | |
| Start Time | Start Time | Time dropdown | Match creation form pattern |
| End Date | End Date | Date picker (calendar) | |
| End Time | End Time | Time dropdown | |
| Timezone | Timezone | Dropdown | |
| Location (Venue, City, State) | Location | 3 inline fields or single with breakdown | Keep structured |
| Private event | Private | Toggle/checkbox | |
| — | Hosting Company | Inline text edit | NEW: defaults to org name |
| — | Capacity | Inline number edit | Already exists |
| — | Dress Code | Inline text edit | Already exists |
| — | Description | Multiline text edit | Already exists |
| — | Partners/Sponsors | Editable list | NEW: company + role + tier |
| Team (step 4) | Team | Read-only avatars + manage link | From creation step 4 |

# Dashboard Feedback — Event 81 Review
## Focus: Overview + Guest Intelligence tabs only

> **INSTRUCTION FOR CLAUDE CODE:** This feedback covers 3 changes for this session. Work through them in order. After each change, verify it works at `localhost:3003/dashboard/81/`.

---

## 1. TAB ORDER: Move Overview before PRE-EVENT label

**Current order:**
```
PRE-EVENT | Overview | Objectives | Guest Intelligence | Briefings | EVENT DAY | Check-in & Seating | POST-EVENT | Follow-Up | Analytics
```

**Correct order:**
```
Overview | PRE-EVENT | Objectives | Guest Intelligence | Briefings | EVENT DAY | Check-in & Seating | POST-EVENT | Follow-Up | Analytics
```

Overview is about the whole event lifecycle — it shows the full funnel, capacity, needs attention, and activity. It is NOT a pre-event activity. It should be the first tab, standing alone before the PRE-EVENT phase label.

---

## 2. GUEST INTELLIGENCE: Merge Ranked view and Table View into one unified table

Right now there are two sub-tabs: **Ranked (200)** and **Table View**. They're too similar to justify being separate views. Merge them into a single table that combines the best of both:

### Use Table View as the base layout
Table View is clearer — it has proper columns (Score, Name, Company, Title, Source, Event Status, Actions). Keep this as the foundation.

### Add capabilities from the Ranked view into the table
The Ranked view has expandable rows — clicking a contact reveals AI-Generated Insights, Why They Match, Objective Breakdown, Suggested Talking Points, and action buttons (View Guest Profile, Add to Wave). **This expandable inline detail must be added to the Table View rows.** When you click a row in the merged table, it should expand to show the same intelligence card.

### Add a Tags column between Title and Source
The table currently goes: Score → Name → Company → Title → (big gap) → Source → Event Status → Actions. There's too much whitespace between Title and Source. Add a **Tags** column between Title and Source that displays the contact's category tags (PE, LP, Growth, Crossover, Technology, etc.). These tags already exist in the Ranked view (they appear as small labels next to the score) — just surface them as a proper column.

**New column order:**
```
Score | Name | Company | Title | Tags | Source | Event Status | Actions
```

### Add column sorting
The table has filtering (by source, by search) but **no sorting**. Every column header should be clickable to sort ascending/descending:
- Sort by Score (high→low or low→high) — essential for "who's my best match?"
- Sort by Name (A→Z) — for finding a specific person quickly
- Sort by Company (A→Z) — for "show me everyone from Blackstone"
- Sort by Event Status — for "show me all Confirmed first, then Qualified, then Not Invited"
- Sort by Source — for "show me all RSVP contacts together"

Add a small sort arrow indicator (▲/▼) on the active sort column. Default sort should be by Score descending (highest first), which matches the current behavior.

### Remove the Ranked sub-tab
After merging, remove the **Ranked (200)** sub-tab entirely. The only remaining sub-tabs should be:
```
Table View | Pending Review (30)
```
Or simply rename it:
```
All Contacts | Pending Review (30)
```

---

## 3. ADD GUEST FORM: Missing fields and wrong structure

The current Add Guest form has:
- Full Name* (single field)
- Email*
- Title
- Company
- Note (optional)

### Required changes:

**a) Split Full Name into First Name and Last Name**
Replace the single "Full Name" field with two separate fields:
- **First Name*** (mandatory)
- **Last Name*** (mandatory)

These should be side by side on the same row to save vertical space.

**b) Add LinkedIn URL field**
Add a **LinkedIn URL** field after Email. This field should:
- Accept a full LinkedIn URL (e.g., `https://linkedin.com/in/sarahchen`) or just a username (`sarahchen`)
- When a LinkedIn URL is provided, display a small "Fetch from LinkedIn" or auto-fetch indicator that signals the system will look up this person's profile
- If LinkedIn data is found, **auto-fill the Title and Company fields** with the fetched data (but keep them editable so the user can correct if needed)
- This is how most contacts will be added in practice — the user has someone's LinkedIn and wants Moots to pull the rest

**c) Make Company mandatory**
Company is currently optional. Change it to **Company*** (mandatory). Every contact needs a company association — it's core to how Moots scores and categorizes guests.

**d) Final field order:**
```
First Name*          Last Name*
Email*
LinkedIn URL         [Fetch from LinkedIn button/indicator]
Title                (auto-filled from LinkedIn if available)
Company*             (auto-filled from LinkedIn if available)
Note (optional)
                     [Cancel]  [Add Guest]
```

---

## OBSERVATIONS — WHAT'S IMPROVED SINCE EVENT 80

Good progress to acknowledge:
- "GUEST POOL" label is now correct (was "POOL")
- Every contact now has a status badge (Qualified, Confirmed) — no more blank statuses
- Source column is diversified (RSVP, Import) — no longer all "Manual"
- Pending Review (30) now has real content with 30 inbound RSVPs, AI scores, and review instructions
- "More >" dropdown has been removed
- "Review Pending Guests" button added to Overview
- Needs Attention now includes "30 inbound RSVPs need your review"
- Overview activity feed is populated with named contacts

### Minor observations (not for this session, just noting):
- Tab order issue (item 1 above) still present from Event 80 feedback
- Activity feed timestamps are all "1h ago" — should be varied (1h, 2h, 3h, yesterday)
- Overview "Recent Activity" header appears twice (once as section header, once inside the card)
- Column headers in Table View are not clickable for sorting

---

*Review conducted: Feb 26, 2026 — Event 81, localhost:3003*

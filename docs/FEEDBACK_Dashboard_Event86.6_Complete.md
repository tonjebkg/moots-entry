# FEEDBACK — Dashboard Event 86.6 (Role/Priority Split + Table Polish)

**Date:** 2026-03-01
**Reviewer:** Founder + Independent QA
**Scope:** Guest Intelligence tab (All Contacts + Pending Review), Role/Priority columns, Bulk Actions, Table Design
**Build:** Post-86.5

---

## Context

Read these files before starting:
- `docs/MOOTS_VISION.md`
- `docs/PRODUCT_PRINCIPLES.md`

Key principles:
- **Agent Model**: Agent proposes → Human decides → Agent responds → Agent learns
- **Font minimum**: No text under 13px. Body 16px minimum. Target user is 40+.
- **Event Status Pipeline**: In Pool → Selected → Invited → Confirmed → Declined → Waitlist.

---

## What's Working in 86.5 (Keep These)

- "AI QUALIFIED" pipeline card rename — good, no longer confused with event status.
- "Qualified" removed from Event Status dropdown — contacts now show "In Pool" correctly.
- Role column exists after Title — structure is right, but needs to be split (see Issue 1).
- Role dropdown is inline-editable — good interaction pattern.
- Pending Review has full column parity with All Contacts.
- Bulk action bar is now sticky (z-index fix from 86.5).

---

## Issues

### ISSUE 1 — Split the "Role" column into two columns: "Role" and "Priority" (CRITICAL)

**Current state:** A single "Role" column contains all 10 options mixed together: —, Tier 1, Tier 2, Tier 3, Team Member, Partner, Co-host, Speaker, Talent, VIP.

**Required change:** Split into two separate columns, both positioned after "Title":

**Column A — "Role"** (functional role on the team):
- *(empty/undefined placeholder — e.g., "Set role" in gray)*
- Team Member
- Partner
- Co-host
- Speaker
- Talent

These are operational roles the team needs to identify at a glance. They describe what this person DOES at the event.

**Column B — "Priority"** (invitation priority tier):
- *(empty/undefined placeholder — e.g., "—")*
- VIP — **special visual treatment: yellow/gold background** to stand out
- Tier 1
- Tier 2
- Tier 3
- Waitlist

These map directly to invitation waves. When sending invites, VIP goes first, then Tier 1, Tier 2, Tier 3, then Waitlist. This column creates a direct, visible link between the guest list and the campaign/wave system.

**Both columns must be:**
- Inline-editable via dropdown (same pattern as current Role dropdown)
- Present on ALL tables platform-wide (All Contacts, Pending Review, etc.)
- At least 13px font size

### ISSUE 2 — Remove red VIP emphasis from Tags (MEDIUM)

**Current state:** In the Tags column of the table, "VIP" appears with a red/orange background, styled differently from all other tags. Other tags (PE, Credit, Consumer, etc.) use neutral gray pills.

**Required change:** VIP in tags is just a regular free-form tag like any other. It should use the **same neutral gray pill styling** as every other tag. No special color, no emphasis. The VIP visual distinction now belongs in the Priority column (Issue 1) with the yellow/gold treatment — not in tags.

This applies to:
- Tags column in table rows
- Tags section in expanded rows
- The "+ VIP" quick-add button in Manage Tags (should be removed — VIP as a tag is just free text, not a promoted action. Keep "+ Speaker" and "+ Priority" if relevant, or remove all quick-add buttons and let users type freely)

### ISSUE 3 — Unify CTA labels: "Send Invites" everywhere (MEDIUM)

**Current state:** The expanded row shows **"+ Add to Wave"** as the action button. The bulk action bar says **"Send Invites"** (updated in 86.5). These are inconsistent.

**Required change:** Use **"Send Invites"** consistently everywhere:
- Expanded row action button → "Send Invites" (replace "Add to Wave")
- Bulk action bar → "Send Invites" (already correct)
- Any other place this CTA appears

The user's mental model is "I want to send invites." The concept of waves is handled internally within the invitation flow, not as the primary label.

### ISSUE 4 — Fix Role column width: pre-size for longest value (MEDIUM)

**Current state:** When a role is assigned (e.g., "Team Member"), the Role column expands to fit the text, pushing other columns narrower. This causes a visible layout shift.

**Required change:** The Role column (and the new Priority column) must have a **fixed minimum width** that accommodates the longest possible value without reflow. The longest value in Role is "Team Member" (~100px). The longest in Priority is "Waitlist" (~60px). Set `min-width` on both columns so selecting any value never causes a layout shift. The table should look stable whether cells show "Set role" or "Team Member."

### ISSUE 5 — Font sizes still under 13px (CARRY-OVER from 86.5)

**Current state:** The 86.5 build may not have fully addressed the font size audit. Elements likely still under 13px:
- Score numbers in table rows
- Source badges (RSVP, Import)
- Tag pills
- Min Score label/value
- "+N" overflow counters

**Required change:** Re-audit all text in Guest Intelligence. Nothing under 13px except avatar initials (decorative, can stay at 11px minimum). Score numbers should be 14px+ as they are the primary ranking metric.

---

## Execution Order

Follow this sequence. Each step must be completed and verified before moving to the next.

1. **Split Role into Role + Priority columns** — Remove the current single "Role" column. Add two new columns after "Title": Role (Team Member, Partner, Co-host, Speaker, Talent) and Priority (VIP with yellow/gold treatment, Tier 1, Tier 2, Tier 3, Waitlist). Both inline-editable, both with fixed min-widths. Apply to All Contacts and Pending Review. (Issue 1 + Issue 4)

2. **Remove VIP red emphasis from Tags** — Make VIP tag a neutral gray pill like all other tags. Remove the "+ VIP" quick-add button from Manage Tags (or make it non-special). (Issue 2)

3. **Unify CTA to "Send Invites"** — Replace "Add to Wave" with "Send Invites" in the expanded row action buttons. Verify bulk bar already says "Send Invites." (Issue 3)

4. **Fix font sizes** — Audit and increase all text under 13px: scores, source badges, tags, overflow counters, Min Score. (Issue 5)

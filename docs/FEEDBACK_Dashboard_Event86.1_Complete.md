# Feedback: Dashboard Event 86.1 — Overview Tab (Focused)

**INSTRUCTION FOR CLAUDE CODE:** This is a focused, prioritized review of ONLY the Overview tab in the latest build (Event 86). It merges the founder's direct voice-note feedback with an independent review that measured actual font sizes, element positions, and contrast levels. Work through items in strict priority order. After each fix, verify it at `localhost:3003/dashboard/86/overview` in a browser at 100% zoom (no zoom-in). Do NOT move to other tabs until ALL items below are resolved.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 86)
**URL:** `localhost:3003/dashboard/86/overview`
**Date reviewed:** 2026-02-27

---

## What Improved Since Last Build

Before diving into fixes, here's what Claude Code got right — acknowledge and preserve these:

1. **"AI Activity" and "Guest Activity" renames** — live and working. Good.
2. **Guest Activity timestamps are now varied** (1h, 3h, 8h, 14h, 1d, 2d, 3d, 5d) — no longer all "2h ago." Good.
3. **Guest Activity types are now varied** ("confirmed attendance", "was sent RSVP email", "declined invitation") — no longer all "confirmed attendance." Good.
4. **Section headings** bumped to 20px (from 14px in Event 83). Good.
5. **Pipeline sub-text** bumped from 11px to 13px. Better, but still not enough (see below).
6. **Chat input** now has a visible container with border. Better than invisible, but still not prominent enough.
7. **"Score them now →"** wording (was "Run AI Scoring →"). More proactive. Good.
8. **Needs Attention section** with actionable items and direct links — excellent pattern. Preserve.
9. **Side-by-side layout** for AI Activity / Guest Activity — working well. Keep.

---

## Issues — Strict Priority Order

### 1. BLOCKER: Font sizes are still too small at 100% zoom (P0)

**Founder feedback (direct quote):** "The size of the fonts are still too small. Right now, when my Chrome browser view is on actual size, I have to zoom in once to have at least the proper size. The actual size should be how it looks like when I zoomed once."

**What this means technically:** When Chrome zooms one step (Cmd/Ctrl + =), it applies a ~125% scale. The founder is saying ALL text on the page at 100% zoom needs to be ~25% larger than it currently is. Here's exactly what needs to change:

**Measured current sizes → required target sizes:**

| Element | Current | Target | Where |
|---------|---------|--------|-------|
| Top nav "Events", "People" | 14px | 16px | Global top navigation bar |
| Tab labels (Overview, Objectives, etc.) | 15px | 16px | Tab navigation row |
| Tab category labels (PRE-EVENT, EVENT DAY, POST-EVENT) | 12px | 13px | Tab navigation row — ALL CAPS so slightly smaller is OK |
| Pipeline card labels (GUEST POOL, SCORED, etc.) | 13px | 15px | Pipeline funnel cards |
| Pipeline card numbers (200, 72, 44, 20, 17) | ~32px | Keep or slight bump | Already the largest text — fine |
| Pipeline card sub-text ("72 scored", "36% of 200") | 13px | 15px | Below the big numbers in cards |
| "Event Capacity" label | 12px | 14px | Capacity bar section |
| "17/20 seats" text | ~14px | 15px | Capacity bar right side |
| "Needs Attention" heading | 20px | Keep | Already improved — good |
| Needs Attention item text | ~15px | 16px | Action item lines |
| Needs Attention bold numbers (1, 31, 26, 128) | ~15px bold | 16px bold | The count badges |
| Needs Attention action links ("View in Campaigns →") | ~14px | 15px | Right-aligned links |
| AI Activity / Guest Activity headings | 20px | Keep | Already improved — good |
| Activity feed entry text | ~15px | 16px | Feed item descriptions |
| Activity feed timestamps (7h ago, 1d ago) | 13px | 14px | Secondary info, but 13px is too small |
| Activity feed category badges (Observation, Briefing) | 12px | 13px | Inside colored pill badges |
| Chat input placeholder "Ask Moots about your event..." | ~15px | 16px | Chat input field |
| Chat suggested questions | ~13px | 14px | Question chips above input |

**Founder also specifically called out:** "The menu — Events and People — is too small. It's also why we try to solve the size of these navigation tabs." So the top nav and tab bar sizes are explicitly requested to increase.

**Implementation approach:** The cleanest way to do this is to increase the base/root font size for the Overview page context, or bump all Tailwind text utility classes up one step (e.g., `text-xs` → `text-sm`, `text-sm` → `text-base`, `text-base` → `text-lg`). Do NOT just change individual elements — apply a systematic size increase so everything scales proportionally.

---

### 2. BLOCKER: Pipeline cards are too tall — Needs Attention must be visible without scrolling (P0)

**Founder feedback (direct quote):** "The card that we use for Guest Pool, Scored, Qualified, Selected, and Confirmed — the height is too big. Maybe we can reduce it to make sure that on the screen we have at least, we don't have to scroll to see the section like Needs Attention, the full section."

**Measured:** The "Needs Attention" heading starts at ~659px from the top of the viewport (viewport height = ~1004px). That means on a standard screen, only the heading and the first attention item are visible — the user must scroll to see items 2, 3, and 4.

**The fix:**
- Reduce vertical padding/margins on the pipeline cards. The cards currently have generous internal padding — the labels, numbers, and sub-text could be packed tighter.
- Reduce the vertical gap between the pipeline cards row and the Event Capacity bar.
- Reduce vertical spacing between the Event Capacity bar and the Needs Attention section.
- **Goal:** At 100% zoom on a standard 1080p display, the ENTIRE "Needs Attention" section (all 4 items) should be visible without any scrolling. The pipeline cards + capacity bar + Needs Attention should all fit above the fold.
- Do NOT sacrifice readability to achieve this — the font size increases from issue #1 still apply. Achieve the space savings through padding/margin reduction on the cards and section gaps.

---

### 3. BUG: Chat returns error on every interaction (P0)

**Current:** The chat input bar shows "Sorry, I encountered an error. Please try again." This error appears when clicking any suggested question chip or when typing and sending a message. The error persists even after dismissing it — the message stays visible in the chat area.

**Founder feedback (direct quote):** "There's just an error when we click on one suggested text, or even when I write a text and then I push it. I have this error: 'Sorry, I encountered an error, please retry.' And then when I close the window, I still see the error message."

**The fix:**
- Debug the chat submission handler. Check: Is the API endpoint configured correctly? Is the event context being passed? Is there a missing API key or environment variable?
- When the chat panel is collapsed/dismissed, the error message should be cleared — it should not persist in the UI.
- If the AI backend is not connected yet, show a graceful fallback message instead of an error: "Chat is being set up for this event. I'll be ready shortly." — not a harsh error.

---

### 4. "Needs Attention" items have duplicate numbers in the text (P1)

**Current — exact text of each line:**
- Line 1: `1` invited guests haven't responded ← OK (no duplication)
- Line 2: `31` I've scored **31** new RSVP submissions. Review them to approve or decline. ← **DUPLICATE: "31" appears as badge AND in sentence**
- Line 3: `26` **26** contacts score 70+ but haven't been invited. ← **DUPLICATE: "26" appears as badge AND starts the sentence**
- Line 4: `128` contacts are waiting to be scored. I'll match them against your objectives. ← OK (no duplication)

**Founder feedback (direct quote):** "We have 31 that is the number of contacts, and then we have a sentence '31 new RSVP submissions.' We have in the same sentence twice the number. Same with 26. It's visually weird. We cannot have a repetition of the same number because for a human it's just terrible."

**The fix — rewrite the sentence text to remove the number since it's already shown as the bold badge:**

| Line | Badge | Current sentence | Fixed sentence |
|------|-------|-----------------|----------------|
| 1 | **1** | "invited guests haven't responded" | No change needed — already clean |
| 2 | **31** | "I've scored 31 new RSVP submissions. Review them to approve or decline." | **"New RSVP submissions scored. Review them to approve or decline."** |
| 3 | **26** | "26 contacts score 70+ but haven't been invited. They're strong matches for your objectives." | **"Contacts score 70+ but haven't been invited. They're strong matches for your objectives."** |
| 4 | **128** | "contacts are waiting to be scored. I'll match them against your objectives — takes about 2 minutes." | No change needed — already clean |

The pattern is: the **bold number badge** on the left IS the count. The sentence to the right should describe what it refers to WITHOUT repeating that count.

---

### 5. Remove "17/20" capacity badge from the event header (P1)

**Current:** In the top-right of the event header area, between the TU user avatar and the "Edit Event" button, there's a green "17 / 20" text showing event capacity.

**Founder feedback (direct quote):** "In between the user icon and Edit Event, there's like 17/20. This thing has nothing to do here. I think it was like the capacity, but the capacity now we have another item to manage capacity, so again, that's nothing to do here."

**The fix:** Remove the "17 / 20" text from the event header completely. The Event Capacity bar (with the green progress bar and "17 / 20 seats" label) already shows this information prominently below the pipeline cards. Having it in both places is redundant and clutters the header.

---

### 6. Move TU user icon next to the Settings gear icon (P1)

**Current:** The TU (user avatar) icon is floating in the event header row, positioned near the event title area between the "17/20" badge and "Edit Event" button. The Settings gear icon is alone in the top-right corner of the global navigation bar.

**Founder feedback (direct quote):** "The user icon here, TU, is really misplaced. It should be next to the settings icon, but I don't know why it's lost where it is."

**The fix:** Move the TU user avatar to the global top navigation bar, positioned to the right of the Settings gear icon (or to its left). The top-right corner of the nav bar should have: `[Settings ⚙️] [TU avatar]`. Remove it from the event header row entirely. This is a global nav element — it should live in the global nav, not in the event-specific header.

---

### 7. Rename "AI Activity" → "AI Agent Activity" (P2)

**Founder feedback (direct quote):** "I'd rather talk about AI Agent Activity. It makes it more — we understand that agents are autonomous."

**Current:** "AI Activity"

**The fix:** Rename to **"AI Agent Activity"**. This reinforces that the AI is an autonomous agent, not just a tool. It aligns with MOOTS_VISION.md's core concept of the platform being an agent interface.

---

### 8. Chat input still needs more visual prominence (P2)

**Current:** The chat input bar has been improved from the previous build — it now has a visible container with a border. However, with the error message persisting (issue #3), it's hard to assess the full chat UX.

**After fixing issue #3 (the error bug), verify:**
- The chat container has enough contrast against the page background (page bg is `rgb(250, 249, 247)` / warm cream)
- The border is at least 1px solid with a visible color (not near-white)
- The send button arrow has enough visual weight to be clickable
- The suggested question chips are readable and clearly interactive
- When a response comes back, it should be clearly visible and formatted well

**Founder feedback:** "I like the improvement for the chat box, the chat input." — So the direction is right, just needs the error fixed and then a visual polish pass.

---

## Summary — Execution Order for Claude Code

```
STEP 1: Fix font sizes (issue #1)
  → Systematically increase all text sizes per the table above
  → Verify at 100% zoom: can you comfortably read everything?

STEP 2: Reduce pipeline card height (issue #2)
  → Tighten padding/margins on cards and section gaps
  → Verify: Is the FULL "Needs Attention" section (all 4 items) visible without scrolling at 100% zoom?

STEP 3: Fix chat error bug (issue #3)
  → Debug the chat submission flow
  → Ensure errors don't persist after dismissing
  → Test: click a suggested question → should get a response, not an error

STEP 4: Fix Needs Attention number duplication (issue #4)
  → Rewrite line 2 and line 3 sentences per the table above
  → Verify: each line reads naturally with no repeated numbers

STEP 5: Remove "17/20" from event header (issue #5)
  → Delete the capacity badge from the header row
  → Verify: header shows only [< Events] [Event title] [Edit Event]

STEP 6: Move TU avatar to global nav bar (issue #6)
  → Place it next to the Settings gear icon in the top-right
  → Verify: top nav right side shows [Settings ⚙️] [TU avatar]

STEP 7: Rename "AI Activity" → "AI Agent Activity" (issue #7)
  → Update the heading text
  → Verify: left column heading reads "AI Agent Activity"

STEP 8: Polish chat visibility after error fix (issue #8)
  → Only after step 3 is verified working
  → Check contrast, border, send button, suggested questions
```

**After completing all 8 steps, take a screenshot at 100% zoom and verify:**
1. ALL text is comfortably readable without zooming
2. Pipeline cards + Capacity bar + full Needs Attention section fit above the fold
3. Chat works (no errors) and is visually prominent
4. No duplicate numbers in Needs Attention
5. No "17/20" in the header
6. TU avatar is in the global nav
7. Left column says "AI Agent Activity"

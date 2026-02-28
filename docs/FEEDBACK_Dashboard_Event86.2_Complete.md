# Feedback: Dashboard Event 86.2 — Objectives Tab

**INSTRUCTION FOR CLAUDE CODE:** This is a focused, prioritized review of ONLY the Objectives tab in the latest build (Event 86). It merges the founder's direct voice-note feedback with an independent review that measured font sizes, tested interactivity, and checked element behavior. Work through items in strict priority order. After each fix, verify it at `localhost:3003/dashboard/86/objectives` in a browser at 100% zoom. Do NOT move to other tabs until ALL items below are resolved.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 86)
**URL:** `localhost:3003/dashboard/86/objectives`
**Date reviewed:** 2026-02-27

---

## What's Working Well — Preserve These

1. **"+ Add Objective" button is now at the TOP** — directly below the "Event Objectives" heading. Fixed from Event 83. Good.
2. **AI Interpretation section** exists for each objective — shows the AI's understanding of the objective in italic text, a qualify count ("43 contacts currently qualify"), and "To refine scoring, consider:" suggestions. This is an excellent pattern.
3. **3 well-written seed objectives** with distinct AI interpretations and per-objective qualify counts (43, 28, 15 contacts). Shows the system working.
4. **"Describe who you want at this event in plain language. Moots handles the scoring."** — good helper text under each objective input.
5. **Trash icon** per objective for deletion. Good.
6. **Objective numbering** (1, 2, 3) is clear with circled numbers on the left.

---

## Issues — Strict Priority Order

### 1. Font sizes are too small for 40+ users (P0)

**Founder feedback (direct quote):** "First, the text is too small for 40 plus years old users, so everywhere the font has to be bigger."

**Measured current sizes on the Objectives tab:**

| Element | Current | Target | Notes |
|---------|---------|--------|-------|
| Objective input text (the user's written objective) | 14px | 16px | This is the PRIMARY content the user writes and reads |
| "Describe who you want..." helper text | 12px | 14px | Currently very faint and small |
| "AI INTERPRETATION" label | 12px | 13px | ALL CAPS label, can be slightly smaller |
| AI Interpretation body text (italic) | 14px | 16px | The AI's response — must be easily readable |
| "X contacts currently qualify based on this objective" | 12px | 14px | Critical metric — tells user the impact of their objective |
| "To refine scoring, consider:" label | 12px | 14px | Section heading within the AI box |
| Refinement suggestion questions | 12px | 14px | These will become interactive (see issue #3) — need to be readable |
| "?" prefix on suggestions | 12px | 14px | Match the suggestion text |
| "Event Objectives" heading | 20px | Keep | Already adequate |
| "Define what makes a guest ideal..." subtitle | ~14px | 15px | Subtitle text |
| "+ Add Objective" button text | ~14px | 15px | Primary action button |
| Objective number circles (1, 2, 3) | ~14px | Keep | Already legible in the circle |

**Same rule as Overview tab:** No text on this page should be below 13px. Body content and user-written text should be 16px minimum. The AI Interpretation content and qualify counts are CRITICAL information — they must be comfortable to read at a glance.

---

### 2. New objectives should appear at the TOP, not the bottom (P0)

**Current behavior (tested):** Clicking "+ Add Objective" adds new objectives at the BOTTOM of the list. With 3 existing objectives that each take ~200px of vertical space (text + AI Interpretation + refinement suggestions), the new objective appears far below the fold. The user has to scroll down past all existing objectives to see and fill in the new one.

**Founder feedback (direct quote):** "When we add a new objective, instead of coming at the bottom of the previous objectives, I think it should be sorted the other way around. At the bottom, we have the first objective we added, and at the top, we have the new one. Like this, when I click on add a new objective, I see it right away. I don't have to scroll down."

**The fix:** Reverse the display order of objectives. When a new objective is added:
1. It should appear immediately below the "+ Add Objective" button (at position #1 visually)
2. Existing objectives shift down
3. The page should NOT scroll — the new empty objective is already in view right where the user clicked
4. The objective numbers should reflect creation order (Objective 4 is still #4 even if it's displayed at the top), OR renumber top-to-bottom — whichever is simpler. The key point is: **newest objective appears at the top of the list, immediately visible after clicking "+ Add Objective".**

**Additional observation from testing:** Clicking "+ Add Objective" twice created TWO new objectives (#4 and #5) with what appear to be AI-suggested placeholder text ("Institutional LPs actively increasing PE allocations" and "Centers of influence with HNW client networks"). If the AI is pre-filling suggestions, that's interesting but should be validated — are these derived from the event context? If so, this is a good feature. If they're generic/random, remove the placeholder text and show an empty input with the helper text.

---

### 3. CRITICAL FEATURE: "X contacts currently qualify" must be a clickable link (P0 / VISION)

**Current state (tested):** "43 contacts currently qualify based on this objective" is a `<span>` with `cursor: auto` — plain static text. No click handler. No navigation. Clicking it does nothing.

**Founder feedback (direct quote):** "When there's something like '43 contacts currently qualified based on this objective,' I cannot click on it and then be directed to either the People tab and have them filtered out. That would be useful because as a user I can see like, okay, what are the 43 people that would be useful?"

**The fix:**
- Make "43 contacts currently qualify based on this objective" a **clickable link** (underline on hover, pointer cursor, brand color)
- Clicking it should navigate to the **Guest Intelligence tab** (or People tab) with a **pre-applied filter** showing only the contacts that qualify for THIS specific objective
- The URL could be something like: `/dashboard/86/guest-intelligence?objective=1` or use a filter state
- Style it as a clear link: underline, pointer cursor, slightly darker color on hover
- This connects the abstract objective to real people — it's the "show me" moment that builds trust in the AI scoring

**Per-objective qualify counts for reference:**
- Objective 1 (PE/VC decision-makers): 43 contacts
- Objective 2 (C-suite tech executives): 28 contacts
- Objective 3 (Institutional LPs): 15 contacts

---

### 4. CRITICAL FEATURE: Refinement suggestions must be clickable and auto-apply (P0 / VISION)

**Current state (tested):** The "To refine scoring, consider:" suggestions are plain `<span>` elements inside `<li>` tags with `cursor: auto`. Clicking them does nothing. They are static text displayed as questions with a "?" prefix.

**Current suggestions for Objective 1:**
- "? Should I weight co-investment track record more heavily than current AUM?"
- "? Are there specific sectors (healthcare, tech, industrials) where PE focus matters more for this dinner?"

**Founder feedback (direct quote):** "There's 'To refine, consider' — what we want is to be able to click on it and see how it directly impacts the objective, the prompt of the objective. So it must be like clickable suggestions that then go directly to the user prompt and impact the scoring right away. Then we just have to save it. If you don't have to save it because it's already saved, we click on it and just like it adds to the prompt without them needing to confirm again the saving. And then we see how it impacts directly the number of contacts we currently qualify on this."

**The fix — this is the most important feature change on this tab:**

1. **Style each suggestion as a clickable chip/button** — not a plain text question. Use a pill/tag style with a "+" or "Apply" icon. On hover: highlight, pointer cursor, subtle animation.

2. **On click, the suggestion auto-appends to the objective text.** For example, if the objective text is:
   > "Senior PE/VC decision-makers with active deal flow and co-investment appetite — Managing Directors, Partners, and Principals at funds with $1B+ AUM"

   And the user clicks "Should I weight co-investment track record more heavily than current AUM?", the objective text updates to:
   > "Senior PE/VC decision-makers with active deal flow and co-investment appetite — Managing Directors, Partners, and Principals at funds with $1B+ AUM. **Weight co-investment track record more heavily than current AUM.**"

   The suggestion is transformed from a question into a directive statement and appended to the objective.

3. **Auto-save immediately.** No save button required. The click = the confirmation. Show a brief "Saved" indicator (checkmark or subtle toast) so the user knows it took effect.

4. **Auto-re-score and update the qualify count.** After the suggestion is applied, the AI should re-interpret the objective and update "43 contacts currently qualify" to whatever the new count is (it might go up or down). Show a brief loading state: "Re-scoring..." → "38 contacts currently qualify based on this objective" (with an animation or color flash to draw attention to the change).

5. **Remove the applied suggestion from the list.** Once clicked, it should disappear or show a "✓ Applied" state, so the user doesn't click it twice.

6. **The full flow is:**
   ```
   User clicks suggestion → suggestion text auto-appends to objective prompt →
   auto-save → "Re-scoring..." animation → qualify count updates →
   applied suggestion removed from list (or marked as applied)
   ```

   This is the "agent loop" from MOOTS_VISION.md in action: the agent proposes a refinement, the human accepts with one click, the agent responds by re-scoring.

---

### 5. No visible save mechanism per objective (P1)

**Current state:** There are no visible "Save" buttons — not per objective, not globally. Objectives 1-3 seem to be persisted (they survive page refresh), so there may be auto-save on blur or on a timer.

**Previous feedback (Event 83):** We requested per-objective Save buttons.

**The fix (adjusted based on founder's latest feedback):** The founder now says auto-save is preferred: "If you don't have to save it because it's already saved... without them needing to confirm again the saving." So:
- **Auto-save is the right approach** — save the objective text automatically when the user stops typing (debounce 1-2 seconds) or on blur
- **Show a subtle save confirmation** — a small "✓ Saved" text or checkmark that appears briefly next to the objective after auto-save completes
- **If auto-save fails, show an error** — "Couldn't save — retrying..." with a manual retry option
- Do NOT add explicit Save buttons — the founder has clarified that frictionless auto-save is preferred

---

### 6. AI Interpretation text is hard to read in italic (P2)

**Current:** The AI Interpretation body text is rendered in italic, in the brand brown/terracotta color, at 14px. While the color is on-brand, the combination of italic + small text + colored font makes it harder to read quickly — especially for 40+ users.

**The fix:**
- Keep the brown/terracotta color (it's the AI's voice — good visual distinction)
- **Remove the italic styling** or limit it to just the first sentence. Full paragraphs of italic text are significantly harder to scan than regular text
- Bump the font size to 16px (per issue #1)
- The "AI INTERPRETATION" label in all-caps already signals this is the AI speaking — the italic is redundant

---

### 7. Refinement suggestion "?" prefix looks odd (P2)

**Current:** Each suggestion starts with a "?" character: `? Should I weight co-investment track record...`

**The fix:** When implementing issue #4 (clickable suggestions), replace the "?" prefix with a proper icon:
- Use a small "+" icon or a lightbulb icon to indicate "click to apply"
- Or use a chip/pill button style with the suggestion text inside
- The "?" makes them look like FAQ items or broken formatting, not actionable suggestions

---

### 8. Helper text "Describe who you want..." is too faint (P2)

**Current:** Below each objective input, there's gray helper text at 12px: "Describe who you want at this event in plain language. Moots handles the scoring."

**The fix:** Increase to 14px per issue #1 table. Also consider making the color slightly darker — the current light gray (#999 or similar) is hard to read on the cream/white background. Something like #666 would be more readable while still being clearly secondary.

---

## Summary — Execution Order for Claude Code

```
STEP 1: Increase all font sizes on the Objectives tab (issue #1)
  → Apply the size table above
  → Remove italic from AI Interpretation body text (issue #6)
  → Darken helper text color (issue #8)
  → Verify: all text comfortable to read at 100% zoom

STEP 2: Reverse objective order — newest at top (issue #2)
  → New objectives appear immediately below "+ Add Objective" button
  → Existing objectives shift down
  → Verify: click "+ Add Objective" → new objective visible without scrolling

STEP 3: Make "X contacts currently qualify" a clickable link (issue #3)
  → Navigate to Guest Intelligence filtered by this objective
  → Style as a link: underline on hover, pointer cursor
  → Verify: click "43 contacts currently qualify" → lands on Guest Intelligence
    showing only those 43 contacts

STEP 4: Make refinement suggestions clickable with auto-apply (issue #4)
  → Style as clickable chips/buttons with "+" icon (replaces "?" prefix — issue #7)
  → On click: append to objective text → auto-save → re-score → update qualify count
  → Remove/mark applied suggestions
  → Verify: click a suggestion → text appends to objective → count updates

STEP 5: Add auto-save confirmation indicator (issue #5)
  → Show "✓ Saved" briefly after auto-save
  → Verify: edit objective text → wait 2s → see save confirmation
```

**After completing all 5 steps, verify the full flow:**
1. Open Objectives tab — all text readable at 100% zoom without squinting
2. Click "+ Add Objective" — new objective appears at the TOP, immediately visible
3. Click "43 contacts currently qualify" on Objective 1 — navigates to Guest Intelligence filtered to those 43 contacts
4. Click a refinement suggestion — text auto-appends to objective, auto-saves, qualify count updates
5. Edit an objective manually — auto-saves with confirmation indicator

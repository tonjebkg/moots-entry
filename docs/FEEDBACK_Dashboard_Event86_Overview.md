# Feedback: Dashboard Event 86 — Overview Tab

**INSTRUCTION FOR CLAUDE CODE:** This is a focused review of ONLY the Overview tab in Event 86. It merges the founder's direct voice-note feedback with an independent review conducted against MOOTS_VISION.md and PRODUCT_PRINCIPLES.md. Work through items in priority order. After each fix, verify the fix is visible in the browser at `localhost:3003/dashboard/86/overview`. Do NOT move to other tabs — this prompt is scoped to the Overview tab only.

**Event:** Meridian Capital Partners — Q2 Executive Dinner (Event 86)
**URL:** `localhost:3003/dashboard/86/overview`
**Date reviewed:** 2026-02-27

---

## What's Improved Since Event 83

Before diving into issues, here's what's working well:

1. **Agent Activity and Recent Activity are now side-by-side** — major improvement. The two-column layout eliminates the massive vertical scrolling from Event 83. Good.
2. **Pipeline cards** now show a proper funnel: Guest Pool (200) → Scored (72) → Qualified 60+ (44) → Selected (20) → Confirmed (17), each with conversion percentages. This is a clear step up.
3. **Event Capacity bar** (17/20 seats) is a smart addition — gives instant visual sense of how full the event is.
4. **"Needs Attention" section** is excellent — 4 actionable items with direct links ("View in Campaigns →", "Review in Guest Intelligence →", "Run AI Scoring →"). This is the agent surfacing what matters. Great pattern.
5. **Agent Activity timestamps are now varied** (6h, 10h, 14h, 1d, 2d) — feels like a living system.
6. **Ask Moots chat** is now an inline input bar at the bottom with suggested question chips ("Who are my top 5 guests?", "Summarize the seating arrangement", "Who hasn't responded yet?") — much better than the floating button from Event 83.

---

## Issues — Priority Order

### 1. CRITICAL: Everything is too small to read (P0)

**Current state (measured):**
- Pipeline card labels ("Guest Pool", "Scored", "Qualified", "Selected", "Confirmed"): **11px**
- Pipeline card sub-text ("72 scored", "36% of 200", "61% of 72", etc.): **11px**
- "Event Capacity" label: **12px**
- "17/20 seats" text: **12px**
- Section headings ("Needs Attention", "Agent Activity", "Recent Activity"): **14px** — these are H3 tags at the same size as body text
- Needs Attention item text: **12px**
- Activity feed timestamps ("6h ago", "2h ago"): **10px**
- Activity feed category badges ("Observation", "Briefing", "Follow-Up"): **10px**
- Tab category labels ("PRE-EVENT", "EVENT DAY", "POST-EVENT"): **11px**
- **51 elements on the page are under 14px. 13 elements are at 10px.**

**Founder feedback:** "The default view is too small to be seen. The first people who tested this version had to zoom in a lot. You have to resize and make sure that for someone who is 40+, everything is quite easy to read."

**The fix — minimum font size standards for the entire Overview tab:**

| Element Type | Current | Target | Notes |
|---|---|---|---|
| Pipeline card labels (GUEST POOL, SCORED, etc.) | 11px | 13px | ALL CAPS so can be slightly smaller than body |
| Pipeline card numbers (200, 72, 44, etc.) | OK (large) | Keep | Already legible |
| Pipeline card sub-text ("72 scored", "36% of 200") | 11px | 13px | Critical context — must be readable |
| Event Capacity label + "17/20 seats" | 12px | 14px | Important status indicator |
| Section headings (Needs Attention, Agent Activity, Recent Activity) | 14px (H3) | 18px | These are section titles — they must look like headings, not body text |
| Needs Attention item text | 12px | 14px | These are action items — readability is critical |
| Needs Attention item numbers ("1", "31", "26", "128") | 12px | 14px bold | The count is the key data point |
| Activity feed entry text | 12-13px | 14px | Main content of the feed |
| Activity feed timestamps | 10px | 12px | Secondary info, can be smaller but 10px is too small |
| Activity feed category badges | 10px | 11px | Badges can be compact but 10px is unreadable |
| Tab category labels (PRE-EVENT, EVENT DAY, POST-EVENT) | 11px | 12px | ALL CAPS labels, compact is OK but 11px is borderline |
| Chat input placeholder text | 14px | 15px | Should feel prominent, inviting |
| Chat suggested questions | 12px | 13px | Need to be scannable |

**Rule of thumb:** No text on this page should be below 12px. Body content should be 14px minimum. Section headings should be 18px minimum. Apply this to the Overview tab, then use the same standards across all tabs.

---

### 2. CRITICAL: Chat input bar is nearly invisible (P0)

**Current state (measured):**
- Chat input background: `rgb(255, 255, 255)` (white)
- Page background: `rgb(250, 249, 247)` (off-white/cream)
- Chat input border: `0.5px solid rgb(229, 229, 234)` — a half-pixel, barely-visible light gray line
- Chat container: no box-shadow, no distinct background, transparent wrapper
- The suggested question chips have a light gray background that barely distinguishes from the page

**The result:** The entire chat bar — input field, suggested questions, send button — blends into the page background. When zoomed in, the input area is nearly indistinguishable from the surrounding page. It looks like background noise, not a primary interaction element.

**Founder feedback:** "Make sure that the chat box is more visible because right now it has the same color as almost the background. I really want the users to be able to identify that there is this input item here, this box. Stay on brand, but make sure it's visible. It's like one of the main features of this web app, so it's really critical."

**The fix:**
- Give the chat container a **visible border** — at minimum `1.5px solid` with a color that has clear contrast against the cream background (e.g., the brand brown/terracotta `rgb(180, 130, 100)` or a darker warm gray `rgb(200, 195, 190)`)
- Add a **subtle box-shadow** to lift the chat bar off the page: `0 2px 8px rgba(0,0,0,0.08)` or similar
- The chat container background should be **slightly differentiated** from the page — either a slightly warmer white or a very subtle tint
- The **send button** (the arrow icon) should have more visual weight — currently it's a muted brown circle that blends in. Make it the primary brand color with enough contrast to say "click me"
- The **suggested question chips** should have slightly more contrast — either a more visible border or a more distinct background color
- **Do NOT make it look like Intercom/support chat.** It should feel like a built-in command bar (think Spotlight on Mac, or the Cursor AI input) — part of the workspace, not a popup widget

---

### 3. Rename "Agent Activity" → "AI Activity" and "Recent Activity" → "Guest Activity" (P1)

**Founder feedback:** "We should call the table Recent Activity 'Guest Activity' to make a clear difference between the agent activity. And 'Agent Activity' should be called 'AI Activity'."

**Current:** "Agent Activity" (left column) and "Recent Activity" (right column).

**The fix:**
- Rename "Agent Activity" → **"AI Activity"**
- Rename "Recent Activity" → **"Guest Activity"**

This makes the distinction immediately clear: left column = what the AI is doing, right column = what the guests are doing. "Recent Activity" is vague — it could mean anything. "Guest Activity" is specific.

---

### 4. Guest Activity timestamps are all identical — "2h ago" (P1)

**Current:** Every single entry in the Guest Activity (right column) shows "2h ago" — all 8 guests show "confirmed attendance" at the exact same timestamp.

**Note:** The AI Activity column (left) has properly varied timestamps (6h, 10h, 14h, 1d, 2d) — this was fixed from Event 83. But the Guest Activity column was not.

**The fix:** Vary the Guest Activity timestamps across a realistic range. For a dinner event, attendance confirmations would trickle in over days, not all arrive at once. Example spread: "1h ago", "3h ago", "yesterday", "2 days ago", "3 days ago", "5 days ago", "1 week ago", "2 weeks ago". Also vary the activity types — not every entry should be "confirmed attendance." Mix in: "RSVP received", "declined invitation", "viewed invitation", "updated dietary preferences", etc.

---

### 5. "Needs Attention" section — excellent pattern, minor refinements (P2)

**Current state — what's great:**
- 4 clear items with counts and direct action links
- "1 invited guests haven't responded" → "View in Campaigns →"
- "31 new RSVP submissions. Review them to approve or decline." → "Review in Guest Intelligence →"
- "26 contacts score 70+ but haven't been invited. They're strong matches." → "Review in Guest Intelligence →"
- "128 contacts are waiting to be scored. I'll match them against your objectives." → "Run AI Scoring →"

**The refinements:**
- The item text at 12px is too small (covered in issue #1)
- The bold count numbers ("1", "31", "26", "128") should be more visually prominent — they're the most important data. Consider larger font or color emphasis
- The "128 contacts waiting to be scored" item should feel more proactive per MOOTS_VISION.md. Instead of "Run AI Scoring →" (which is a manual trigger), consider: "I'll score them now →" or make it auto-scoring as per MOOTS_VISION.md's agent model. The agent shouldn't wait to be told — it should propose: "I'd like to score 128 contacts against your 3 objectives. This usually takes about 2 minutes. Start now?"

---

### 6. Pipeline cards — the ">" arrows between cards need explanation (P2)

**Current:** Between each pipeline card there's a small ">" chevron arrow. These arrows are tiny (part of the 11px problem) and serve as visual connectors between stages.

**The fix:** Either:
- Make the arrows larger and more visible as part of the funnel visualization
- Or remove them and let the left-to-right card layout imply progression — the conversion percentages already tell the story

---

## Summary for Claude Code

**Do first — these two issues are blocking user testing:**

1. **Increase all font sizes** (issue #1). Apply the minimum size table above. The entire page is too small for the target user (40+ corporate event directors). No text under 12px, body content at 14px minimum, section headings at 18px minimum.

2. **Make the chat input bar visually prominent** (issue #2). Add visible border (1.5px+), box-shadow, and differentiate the container from the page background. The chat is the platform's #1 feature — it must be unmissable.

**Then:**

3. Rename "Agent Activity" → "AI Activity" and "Recent Activity" → "Guest Activity" (issue #3)
4. Vary Guest Activity timestamps and activity types (issue #4)
5. Polish Needs Attention section — bigger count numbers, more proactive agent language (issue #5)
6. Consider arrow visibility between pipeline cards (issue #6)

**Do NOT change anything else on the Overview tab until these 6 items are resolved and verified in the browser.**

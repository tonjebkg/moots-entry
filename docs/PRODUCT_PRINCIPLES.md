# Moots Product Principles

**For Claude Code:** Read this before making any UX, UI, or interaction design decision in the Moots platform. These principles are the lens through which all product choices should be evaluated. When implementation details are unspecified, default to these.

---

## Who We're Building For

The primary user is a **corporate event director managing 5–10 events simultaneously**. They are operating under high pressure, in chaos, on tight timelines. They need to get a final guest list approved by their CEO and sponsors before each event. Every second of confusion in the platform costs them. Speed and clarity are never "nice to have" — they are the product.

---

## The 9 Principles

### 1. Start with the event director's experience. Work backwards to the technology.
Don't design around what's technically easy to build. Design around what the event director needs to accomplish right now, under pressure. Ask: "What does this person need to do next?" Then build the shortest, clearest path to that action.

*Source: Steve Jobs — "You've got to start with the customer experience and work backwards to the technology."*

---

### 2. If the user has to think, you've failed.
Every screen, every state, every empty state must be self-evident. No tooltips, no onboarding flows, no "how to use" modals. The design itself must be the instruction. If a user pauses for even a second to figure out what to do next, that's a design failure.

*Source: Steve Jobs — "If the user needs a manual, you've failed."*

---

### 3. Design is how it works, not how it looks.
Visual polish matters, but interaction design matters more. A beautiful screen with a confusing action hierarchy is a failure. Ask not "does this look good?" but "does this work correctly under pressure, in 10 seconds, on the 8th event of the week?"

*Source: Steve Jobs — "Design is how it works."*

---

### 4. Behavior only happens when Motivation, Ability, and Prompt align simultaneously.
An event director will only take an action (approve a guest, send for review, generate a briefing) when: (a) they're motivated to do it, (b) it's easy enough to do in the moment, and (c) there's a clear prompt triggering the action at the right time. If any one of these is missing, the behavior won't happen — even if the user wants to. Remove friction, time the prompt correctly, and make the action obvious.

*Source: Dr. BJ Fogg — B = MAP (Behavior = Motivation × Ability × Prompt)*

---

### 5. Place the prompt at the moment of highest motivation.
When a user has just reviewed a guest and scored them, that's the moment to offer "Add to Guest List" or "Flag for Review." Not buried in a settings menu. Not three clicks away. The right action at the right moment, surfaced immediately after the triggering event.

*Source: Fogg Behavior Model — Prompts must arrive when motivation and ability are already present.*

---

### 6. Reduce friction to near zero on the critical path.
The critical path for Moots is: **Review guest → Score → Qualify → Select → Send for Approval → Invite → Check in.** Every step on this path must require the minimum possible actions. One tap to score. One tap to advance status. One tap to send for approval. Count the clicks. If it's more than one, ask why.

*Source: Fogg — Ability (ease) is a direct multiplier of whether behavior occurs.*

---

### 7. Say no to features. Do fewer things with complete excellence.
When in doubt about whether to add a feature, don't. Every feature added to the platform is a feature the event director has to learn, navigate, and potentially misclick under pressure. The platform should do a small number of things — guest intelligence, briefings, check-in, follow-up — with such depth and quality that no other tool is needed for those jobs.

*Source: Steve Jobs — "Innovation is saying no to 1,000 things."*

---

### 8. Every detail matters, including the ones no one will explicitly notice.
The event director may not articulate why the platform feels fast and trustworthy — but they'll feel it. Status badges that fit on one line. Names that never truncate mid-word. Scores that load before the user looks for them. Row heights that don't jump when expanded. These details compound into a feeling of "this tool was made for me," which is the foundation of trust.

*Source: Steve Jobs — "A great carpenter doesn't use lousy wood for the back of a cabinet, even though nobody will see it."*

---

### 9. The tool must serve the relationship; it must never try to be the relationship.
Moots is a tool that helps event directors connect the right people in a room. It is not the experience itself — the event is. Every design choice should make the event director more confident, faster, and clearer, then get out of the way. No unnecessary friction, no feature that exists to show off, no animation that delays an action.

*Source: Steve Jobs — "The technology should disappear, and the human connection should be everything."*

---

## Quick Decision Filter

When choosing between two implementation approaches, ask:

1. **Which is faster for a stressed user in 10 seconds?** → Choose that.
2. **Which requires less explanation?** → Choose that.
3. **Which puts the prompt at the right moment?** → Choose that.
4. **Which removes a step from the critical path?** → Choose that.
5. **Which adds a feature vs. sharpens an existing one?** → Sharpen.

---

*Derived from: "Fogg Behavior Model" by Dr. BJ Fogg · "Steve Jobs' Product Philosophy Explained" · Moots event director persona research*

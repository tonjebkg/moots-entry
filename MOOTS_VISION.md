# Moots-Entry Product Vision

**Scope:** This document is about **Moots-Entry** — the host-facing platform (web dashboard) where event directors and their teams plan, manage, and execute events with AI-powered intelligence. This is NOT about Moots-Flutter, the guest-facing mobile app. Moots-Entry is the command center; Moots-Flutter is the guest experience. This vision is entirely about the command center.

**For Claude Code:** Read this before building any new feature or making architectural decisions in the Moots-Entry codebase. This document describes what Moots-Entry *is* and what it's building toward. Every feature, every screen, every interaction should move the platform closer to this vision. If a feature doesn't serve this vision, it doesn't belong in Moots-Entry.

---

## What Moots-Entry Is

Moots-Entry is not a dashboard. It is not a SaaS tool. It is not a guest list manager.

**Moots-Entry is the host-facing interface of an autonomous event intelligence agent.**

The Moots ecosystem has two faces: Moots-Entry (for the event team) and Moots-Flutter (for the guests). This document is exclusively about Moots-Entry — the platform where event directors, their teams, and their stakeholders (CEOs, sponsors) plan, orchestrate, and optimize events.

The interface is the window into what the agent is doing, has done, and recommends doing next. The real product is the agent — it researches guests, scores them against objectives, recommends who to invite, proposes seating arrangements, generates briefings, warns about risks, and learns more context with every interaction. It works when the team is asleep. It gets smarter with every event.

The event director doesn't "use" Moots-Entry the way they use a spreadsheet. They *collaborate* with it the way they collaborate with the smartest, most prepared member of their team — one who has read everything, remembers everything, never gets tired, and is always available.

---

## The North Star Experience

### The "Uber Moment"

Before Uber, you stood on a street corner, waved your arm, hoped a cab would stop, negotiated the fare, gave directions, and paid in cash. After Uber, you pressed one button, watched the car come to you on a map, got in, and arrived. There was no going back.

**Moots must create that same irreversible shift for event teams.**

Before Moots: The team spends 40+ hours per event on guest research, manual scoring in spreadsheets, back-and-forth emails about the guest list, seating negotiations that take days, last-minute briefings assembled from scattered notes, and post-event follow-up that falls through the cracks.

After Moots: The event director describes the event and its objectives. Moots researches, scores, and ranks the guest list automatically. The director reviews, adjusts, and sends for CEO/sponsor approval in one tap. Moots proposes seating. Moots generates briefings. Moots tracks check-ins. Moots drafts follow-up. The team spends their time on judgment calls — and even then, Moots is right there helping them think it through.

**The measure of success:** Once a team has used Moots for two events, going back to spreadsheets and email chains feels impossible. Not because their data is locked in — because the intelligence is irreplaceable.

---

## The Agent Model

### The Agent Proposes. The Human Decides.

Every feature in Moots should follow this pattern:

1. **The agent does the work** — researches, analyzes, scores, recommends, generates.
2. **The agent presents its recommendation** with clear reasoning — not just "here's a score" but "here's why this person scored 92 and why they should sit at Table 3."
3. **The human reviews and decides** — approves, adjusts, or overrides.
4. **The agent responds to the override intelligently** — doesn't just accept it silently. If the override has implications, the agent surfaces them. "You moved Sarah to Table 1, but her company is a competitor of your keynote speaker's firm. That could create tension. Want me to suggest an alternative?"
5. **The agent learns from the decision** — the override becomes context for future recommendations.

This is the fundamental interaction loop. It applies to everything: guest selection, seating, briefings, follow-up priorities, sponsor management.

### The Agent is Visibly Working

The current platform shows finished results — a scored list, a generated briefing. The user never sees the intelligence *happening*. This must change.

When the agent is working, the user should *see* it working:

- After event creation: "Analyzing your event objectives... Scanning 2,400 contacts in your network... Found 340 potential matches... Scoring against 6 criteria... Cross-referencing with sponsor priorities... 80 guests ready for your review."
- When generating a briefing: "Reviewing 12 guest profiles for tomorrow's dinner... Checking overnight news... Found 2 relevant updates about attendees... Identifying key talking points... Briefing ready."
- When proposing seating: "Analyzing 8 tables × 10 seats... Matching sponsor objectives to table composition... Ensuring no competitor conflicts... Balancing seniority and conversation dynamics... Seating proposal ready for your review."

This visibility accomplishes two things: it builds trust (the user sees the depth of work being done) and it creates the feeling of working alongside an intelligent agent, not staring at a static screen.

### The Agent Never Sleeps

One of the most powerful properties of autonomous agents is that they work while the team doesn't. Moots should surface this:

- "While you were away: 3 new RSVPs came in. I've scored them and added 2 to the qualified list. 1 needs your review — they're connected to a competitor."
- "Overnight update: A news article about your keynote speaker was published. I've added it to tomorrow's briefing talking points."
- "Reminder: 4 guests haven't responded to their invitation. Based on past patterns, a personal follow-up from your team today has an 80% response rate. Here's a draft for each."

The team should open Moots every morning and find that work has been done. Not just data collected — actual recommendations made, drafts prepared, risks flagged. That's the "super intelligent team member" feeling.

---

## The Context Layers

The agent's intelligence is only as good as the context it has. Moots needs four layers of context, each feeding into every recommendation:

### Layer 1: Company Profile

When a company creates their Moots workspace, the agent should immediately research them — website, industry, recent news, key leadership, market position, competitors. The agent presents: "Here's our understanding of your company. Is this accurate?"

The user confirms, corrects, and enriches. This profile then powers everything: how guests are scored (are they relevant to this company's industry?), how briefings are written (what's the company's language and positioning?), and how sponsors are matched (what's the company's strategic focus?).

This is not a settings page buried in a menu. It's one of the first things the team sees — proof that the agent already understands who they are.

**What the Company Profile should contain:**
- Company name, industry, market position
- Key leadership and their roles
- Strategic priorities and focus areas
- Recent news and milestones
- Competitor landscape
- Brand voice and positioning (enriched over time)
- Recurring event themes and audience types

### Layer 2: Event Context

When creating an event, the current thin form (title, date, location) is not enough. The agent needs deep context to make intelligent recommendations. Event creation should feel like a conversation, not a form:

- What type of event? (Seated dinner, conference, workshop, networking reception)
- How many guests?
- What are the objectives? (Business development, thought leadership, relationship building, sponsor visibility)
- Who are the key stakeholders? (CEO, sponsors, partners)
- What's the budget and format?
- Is there a theme or focus topic?
- What outcome would make this event a success for the company?
- What outcome would make this event a success for each sponsor?

The agent can ask these as a conversation, adapting follow-up questions based on answers. Or the user can paste a detailed event brief and the agent extracts everything it needs.

**The more context provided here, the smarter every downstream recommendation becomes** — guest scoring, seating, briefings, follow-up. This is the foundation.

### Layer 3: Guest Intelligence

This is the core of what Moots already does, but it should be enriched:

- Professional profile (title, company, industry, seniority)
- Relationship to the host company (existing client, prospect, partner, competitor, press)
- History with the company (past events attended, interactions, outcomes)
- Public signals (recent LinkedIn activity, news mentions, job changes, funding rounds)
- Sponsor relevance (how does this guest serve sponsor objectives?)
- Social graph (who else in the guest list do they know? who should they meet?)

### Layer 4: Sponsor Intelligence

This is currently missing and it's critical. For sponsored events, the sponsors are paying clients. Their satisfaction directly impacts revenue. Moots should know:

- Who are the sponsors for this event?
- What tier / how much did they pay?
- What are their specific goals? (Brand visibility, access to certain attendees, product demo opportunities, executive face time)
- How many seats / what table positioning were they promised?
- Who are their key people attending?
- What would make them say "this was worth every dollar"?

With this context, the agent can proactively optimize: "Your platinum sponsor wants access to fintech CTOs. I've placed 3 of the 5 fintech CTOs at their table and drafted an introduction sequence for the host to facilitate." That's the kind of intelligence that makes the event director look exceptional — and that's what creates the "no going back" feeling.

---

## The Conversational Interface

### A Persistent AI Collaborator, Not a Chatbot

Every page in the Moots platform should have access to a conversational interface — a panel where the event director can talk to the agent about the current event. This is not a help desk. This is not a search bar. This is a collaborator.

**What it should feel like:**
- "Who are the three people I should follow up with first and why?"
- "My CEO just told me she wants to sit next to the founder of Stripe. Is he on the list? If not, can you find his details?"
- "Show me everyone from the fintech sector who hasn't confirmed yet."
- "Draft a personal note from our CEO to the guests who declined — something that keeps the door open for next time."
- "The sponsor just changed their goal from brand visibility to hiring. How does that affect the seating?"

**What makes it different from a generic chatbot:**
- It has full context: the company profile, the event objectives, every guest's profile, the sponsor goals, the seating arrangement, the briefing history.
- It remembers the conversation: "Earlier you said the sponsor's priority changed. I've already re-scored 12 guests based on that."
- It's proactive: it doesn't just answer questions — it flags things. "I noticed 4 guests from competing companies are at the same table. Intentional?"
- It can take action: "Move David to Table 3" → done, with the visual interface updating in real time.

### Future: Moots on WhatsApp and Slack

The conversational interface inside the platform is step one. The natural evolution is making the agent available where the team already works:

- **Slack:** A Moots bot in the event team's channel. "Hey @moots, who confirmed today?" "Three new confirmations: [names]. Two are from the priority list. Updated the dashboard."
- **WhatsApp:** For event directors on the go. "Quick update on tomorrow's dinner?" and getting a 30-second voice note summary or a clean text brief.

The interaction model is identical — the same agent, the same context, the same intelligence. Only the channel changes. The team talks to Moots the way they'd talk to a colleague on any messaging platform.

---

## The Seating Example: Full Agent Loop

To make the vision concrete, here's how the seating workflow should work end-to-end:

**1. Agent proposes.**
Once the guest list is finalized, the agent generates a seating arrangement. Not random — informed by everything it knows: sponsor goals, guest relationships, conversation dynamics, competitor conflicts, seniority balance, and the host company's objectives.

The event director sees a visual seating chart with the agent's reasoning available for each placement: "Table 3: Your platinum sponsor's CEO, placed next to two potential clients they specifically requested access to, plus your VP of Sales who can facilitate introductions."

**2. Human adjusts.**
The director drags a guest from Table 3 to Table 1. The interface is immediate — drag and drop, the visual updates.

**3. Agent responds.**
The agent doesn't just accept the move. It engages:

"You moved James (Platinum Sponsor CEO) to Table 1. A few things to consider:
- Table 1 currently has your CEO and keynote speaker — high-value placement for James.
- However, the two potential clients James wanted to meet (Sarah K. and David L.) are still at Table 3. Want me to move them to Table 1 as well?
- If I do, Table 1 will be over capacity. I can move Rachel (who has no direct connection to James) to Table 3 to make room.
- Or: I can keep the clients at Table 3 and arrange an introduction sequence during the cocktail hour so James still meets them."

**4. Human decides with full information.**
The director picks an option or explains: "Actually, my CEO specifically asked to have James at her table — it's a relationship play, not a sales play." The agent now has new context: this is about executive relationship-building, not sponsor ROI. It adjusts its reasoning for future suggestions.

**5. Agent learns.**
This override becomes part of the event context. If a similar situation arises at the next event, the agent knows: "Last time, your CEO prioritized personal relationship with this sponsor over their stated sales objectives. Same approach this time?"

---

## The "No Going Back" Moat

The lock-in isn't data. The lock-in is accumulated intelligence.

After 5 events, Moots knows:
- The company's strategic priorities and how they've evolved
- Every sponsor's real goals (not just what they said in the contract)
- Which guests are recurring and their relationship trajectory
- The CEO's preferences (who they like sitting next to, what topics they want in briefings)
- What follow-up approaches work best (personal note vs. LinkedIn message vs. email)
- Which team members handle which responsibilities

After 20 events, Moots knows more about the company's event strategy than any single team member. It's institutional memory, strategic intelligence, and operational execution combined into one agent that's available 24/7.

Switching to another tool means losing all of that. Not the data — the *understanding*. That's the moat. That's why there's no going back.

---

## Implementation Priority for This Vision

Not everything above needs to be built at once. Here's the sequence that delivers the most "magic" feeling earliest:

### Phase 1: Make the Agent Visible (Current Priority)
- Add a persistent chat/conversation panel to every event page
- Show agent activity on the Overview tab ("Moots updated 12 scores overnight", "3 new RSVPs processed")
- Add visible "thinking" states when generating briefings or processing new guests
- This transforms the platform from "dashboard I look at" to "agent I work with"

### Phase 2: Deepen the Context
- Build the Company Profile page (AI-researched, user-confirmed)
- Redesign event creation as a richer, conversational flow
- Add Sponsor Intelligence (who they are, what they paid, what they want)
- Every recommendation gets smarter because the context is richer

### Phase 3: Close the Agent Loop
- Seating recommendations with drag-and-drop override + agent response
- Proactive suggestions ("You should follow up with these 3 people today — here's why and here are drafts")
- Agent-generated briefings that reference overnight changes and breaking news
- The "while you were away" summary when the director opens the platform each morning

### Phase 4: Expand the Channels
- Slack bot for team Q&A and quick updates
- WhatsApp integration for on-the-go event directors
- Email digests generated by the agent (daily summary, pre-event countdown)
- The agent becomes a team member available everywhere, not just in the browser

---

*This vision should inform every product decision in Moots-Entry. When evaluating a feature, ask: "Does this make the agent smarter, more visible, or more useful to the event team? Does this move us closer to the moment where the team can't imagine going back to spreadsheets?" If the answer is no, it doesn't belong in Moots-Entry.*

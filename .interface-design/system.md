# Moots Entry Design System

## Intent

**Who**: Event coordinators at financial institutions, law firms, and consulting firms managing high-stakes corporate events (VC dinners, executive retreats, Black Ambition dinners, Hennessy founder events).

**What they need**: Spend hours daily managing guest lists, sending tiered invitations, tracking capacity, approving RSVPs. Must scan status at a glance, act with confidence, never miss a detail.

**How it should feel**: Like a legal document meets a well-organized filing system. Professional enough to open in a client meeting. Calm, trustworthy, institutional. The confidence of Linear or Notion, not the chaos of a prototype. Dense with information but never cluttered.

---

## Branding

**Logo**: "M" icon in gradient square (from-[#0f3460] to-[#1a1a2e]) + "Moots" wordmark + "Entry" label

**Icon Library**: Lucide React - Clean, minimal, professional icons
- Never use emojis
- All icons should be consistent size (14-16px for inline, 32-48px for empty states)
- Use semantic icon colors matching context (blue for info, green for success, amber for warning)

---

## Color System

### Foundation
```
Canvas:           #f8f9fa    (warm gray - page background)
Surface:          #ffffff    (pure white - cards, tables, modals)
Surface Subtle:   #f0f2f5    (light gray - hover states, alternating rows)
```

**Why**: White backgrounds signal "production-ready" and maximize readability for long sessions. The warm canvas prevents sterility while maintaining professionalism.

### Text
```
Primary:          #1a1a2e    (navy/charcoal - headings, critical data)
Secondary:        #4a4a5e    (muted gray - body text, descriptions)
Tertiary:         #6e6e7e    (light gray - labels, meta info)
```

**Why**: Strong contrast on white (#1a1a2e has 13.9:1 ratio) ensures legibility. The muted secondary text creates hierarchy without fighting for attention.

### Interactive
```
Primary Action:   #0f3460    (rich blue - CTAs, links, active states)
Hover:            #c5a572    (gold - premium hover accent)
Primary Dark:     #1a1a2e    (navy - primary buttons)
```

**Why**: The blue is institutional and trustworthy (finance-world credible). Gold hover states add sophistication expected by VCs and law firms. Navy buttons feel more serious than playful blues.

### Status
```
Success:          #059669    (green - approved, accepted, confirmed)
Warning:          #d97706    (amber - pending, needs attention)
Error:            #dc2626    (red - rejected, cancelled, critical)
Info:             #0f3460    (blue - invited, active campaigns)
```

**Why**: Semantic colors that work on both white and light backgrounds. Not too bright, professional tone.

### Borders & Dividers
```
Default:          #e1e4e8    (light gray - cards, tables, inputs)
Subtle:           #f0f2f5    (very light - optional secondary borders)
Focus:            #0f3460    (blue - input focus rings)
```

---

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```

**Why**: System fonts render consistently, feel native, and are optimized for UI density. No web font load = instant render.

### Scale
```
Heading XL:    text-2xl (24px)   font-semibold   tracking-tight   #1a1a2e
Heading L:     text-xl (20px)    font-semibold   tracking-tight   #1a1a2e
Heading M:     text-lg (18px)    font-semibold                    #1a1a2e
Heading S:     text-base (16px)  font-semibold                    #1a1a2e

Body L:        text-base (16px)  font-normal                      #4a4a5e
Body M:        text-sm (14px)    font-normal                      #4a4a5e
Body S:        text-xs (12px)    font-medium                      #6e6e7e

Label:         text-xs (12px)    font-semibold   uppercase        #6e6e7e
```

**Why**:
- Headings use `font-semibold` (600) not bold (700) - less heavy, more refined
- Body text at 14px for density without strain
- Labels are uppercase + semibold for clear hierarchy
- `tracking-tight` on large headings prevents looseness

### Line Heights
```
Headings:      leading-tight (1.25)
Body:          leading-relaxed (1.625)
Dense UI:      leading-normal (1.5)
```

---

## Spacing System

### Base Unit: 4px

### Application Scale
```
xs:    4px      (tight gaps, icon spacing)
sm:    8px      (compact padding)
md:    12px     (comfortable table cells)
lg:    16px     (section gaps)
xl:    24px     (card padding, major gaps)
2xl:   32px     (page section spacing)
3xl:   48px     (hero spacing)
```

### Specific Use Cases
```
Card padding:              24px (p-6)
Table cell padding:        12px vertical, 16px horizontal (px-4 py-3)
Button padding:            8px vertical, 16px horizontal (px-4 py-2)
Input padding:             8px vertical, 12px horizontal (px-3 py-2)
Section gaps:              32px (space-y-8)
Column gaps:               24px (gap-6)
Stats card grid gap:       16px (gap-4)
```

**Why**: Generous spacing creates breathing room expected in premium tools. 24px card padding feels considered, not cramped. 32px between sections creates clear visual separation.

---

## Depth System

### Philosophy
Minimal shadows, mostly borders. Surfaces defined by background color shifts, not elevation.

### Shadow Scale
```
None:          shadow-none
Subtle:        shadow-sm      (cards, buttons)
Moderate:      shadow         (modals, dropdowns)
Strong:        shadow-lg      (not used - too heavy)
```

### Border Strategy
```
Default:       1px solid #e1e4e8
Colored:       1px solid [status-color-200]  (status badges)
Focus:         1px solid #0f3460 + ring-1 ring-[#0f3460]
```

**Why**: Borders feel architectural and document-like. Subtle shadows only on interactive elements to signal clickability. No floating cards - everything grounded.

---

## Component Patterns

### Cards
```tsx
// Standard card
<div className="bg-white border border-[#e1e4e8] rounded-lg p-6">
  {content}
</div>

// Clickable card (campaign list item)
<button className="bg-white border border-[#e1e4e8] rounded-lg p-4 hover:border-[#c5a572] hover:shadow-sm transition-all">
  {content}
</button>

// Selected card
<div className="bg-white border-2 border-[#0f3460] rounded-lg p-4 shadow-sm">
  {content}
</div>
```

### Buttons
```tsx
// Primary action (navy with gold hover)
<button className="px-4 py-2 bg-[#1a1a2e] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
  Create Campaign
</button>

// Secondary action (blue with gold hover)
<button className="px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
  Upload CSV
</button>

// Success action
<button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
  Approve
</button>

// Danger action
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
  Reject
</button>

// Ghost button (text-only)
<button className="px-3 py-1 text-[#0f3460] hover:text-[#c5a572] text-sm font-semibold transition-colors">
  View Details
</button>
```

### Inputs
```tsx
// Text input
<input className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors" />

// Select
<select className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] transition-colors">
  <option>Option</option>
</select>
```

### Tables
```tsx
// Table container
<div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden shadow-sm">
  <table className="w-full text-sm">
    <thead className="bg-[#f8f9fa] border-b border-[#e1e4e8]">
      <tr>
        <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Name</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-[#e1e4e8]">
      <tr className="hover:bg-[#f8f9fa] transition-colors">
        <td className="px-4 py-3 font-medium text-[#1a1a2e]">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Status Badges
```tsx
// Approved/Active
<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-200">
  APPROVED
</span>

// Accepted
<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
  ACCEPTED
</span>

// Pending
<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
  PENDING
</span>

// Rejected
<span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-700 border border-red-200">
  REJECTED
</span>
```

### Stats Cards
```tsx
// Info stat (blue)
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="text-2xl font-bold text-[#0f3460] mb-1">156</div>
  <div className="text-xs font-medium text-[#6e6e7e]">Invited</div>
</div>

// Success stat (green)
<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
  <div className="text-2xl font-bold text-emerald-700 mb-1">42</div>
  <div className="text-xs font-medium text-[#6e6e7e]">Accepted</div>
</div>
```

### Modals
```tsx
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
  <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
    <h2 className="text-xl font-semibold text-[#1a1a2e] mb-4">Modal Title</h2>
    {content}
    <div className="flex gap-3 mt-6">
      <button className="flex-1 px-4 py-2 bg-white border border-[#e1e4e8] text-[#4a4a5e] font-semibold rounded-lg hover:bg-[#f8f9fa] transition-colors">
        Cancel
      </button>
      <button className="flex-1 px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white font-semibold rounded-lg transition-colors shadow-sm">
        Confirm
      </button>
    </div>
  </div>
</div>
```

---

## Layout

### Container Widths
```
Max width:        max-w-7xl (1280px)
Page padding:     px-8 (32px horizontal)
```

**Why**: 1280px accommodates large screens without making content too wide to scan. 32px page padding feels generous and premium.

### Grid Patterns
```
Stats (4 col):    grid grid-cols-4 gap-4
Stats (5 col):    grid grid-cols-5 gap-4
Split screen:     flex gap-6 (320px sidebar + flex-1 content)
```

### Sidebar Proportions
```
Campaign list:    w-[320px]    (comfortable for card content)
Detail panel:     flex-1       (takes remaining space)
```

**Why**: 320px gives campaign cards room to breathe without feeling cramped. The golden ratio would be ~500px, but that's too much for a list view.

---

## Animation

### Timing
```
Fast:             duration-150 (hover feedback)
Standard:         duration-200 (most transitions)
Slow:             duration-300 (page transitions, modals)
```

### Easing
```
Default:          ease (transition-colors, transition-all)
```

**Why**: 200ms is perceptible but not slow. Consistent timing creates predictable behavior. Simple easing (no bounce/elastic) maintains professional tone.

---

## Accessibility

### Focus States
```
All interactive elements: focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460]
```

### Contrast Ratios
```
#1a1a2e on #ffffff:  13.9:1  (AAA)
#4a4a5e on #ffffff:  7.2:1   (AA)
#6e6e7e on #ffffff:  4.6:1   (AA for large text)
#0f3460 on #ffffff:  10.1:1  (AAA)
```

---

## Quality Checks

Before shipping any component, verify:

1. **Typography**: All headings use `font-semibold`, body uses `font-normal`, labels use `font-semibold uppercase`
2. **Spacing**: All values are multiples of 4px, cards use p-6, sections use space-y-8
3. **Colors**: Only palette colors used (no arbitrary hex codes outside system)
4. **Borders**: All borders are `border-[#e1e4e8]` unless status-specific
5. **Shadows**: Only `shadow-sm` on interactive cards/buttons, `shadow` on modals
6. **Transitions**: All interactive elements have `transition-colors` or `transition-all`
7. **Focus states**: All inputs/buttons have blue focus ring
8. **Hover states**: All clickable elements have hover state (gold for primary, darker for status)

---

## Component Inventory

### ✅ Completed
- (none yet)

### 🚧 Needs Redesign
- EventTabNavigation
- CampaignDetailPanel
- GuestPipelineTable
- CampaignForm
- SendRsvpModal
- GuestAddEditModal
- InviteWavePlanner
- CapacityGauge
- CreateEventForm

### 📄 Pages to Audit
- layout.tsx (event header)
- overview/page.tsx
- guests/page.tsx
- campaigns/page.tsx
- seating/page.tsx
- checkin/page.tsx
- dashboard/page.tsx (event list)

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, ChevronRight, ChevronLeft, Check, Upload, Database, History, Users as UsersIcon, Plus, Trash2, GripVertical, Sparkles, Loader2 } from 'lucide-react'

type WizardStep = 'basics' | 'objectives' | 'guest-pool' | 'collaboration'
type EventFormat = 'curated-dinner' | 'branded-house' | 'annual-retreat' | 'custom'
type ApproveMode = 'MANUAL' | 'AUTO'
type EventStatus = 'DRAFT' | 'PUBLISHED'

interface CreateEventWizardProps {
  onClose: () => void
  onSuccess: (eventId: string) => void
}

interface Objective {
  objective_text: string
  weight: number
  criteria_config: Record<string, unknown>
  sort_order: number
}

const STEPS: { key: WizardStep; label: string; optional?: boolean }[] = [
  { key: 'basics', label: 'Event Basics' },
  { key: 'objectives', label: 'Objectives' },
  { key: 'guest-pool', label: 'Guest Pool', optional: true },
  { key: 'collaboration', label: 'Team', optional: true },
]

const FORMAT_TEMPLATES: Record<EventFormat, { label: string; description: string; objectives: string[] }> = {
  'curated-dinner': {
    label: 'Curated Dinner',
    description: 'Intimate gathering for high-value networking',
    objectives: [
      'C-suite decision-makers in target industries',
      'Brand-aligned personalities with social influence',
      'High-net-worth investors or fund managers',
    ],
  },
  'branded-house': {
    label: 'Branded House',
    description: 'Multi-day brand experience at a major event',
    objectives: [
      'Industry thought leaders and media personalities',
      'Potential brand partners and collaborators',
      'Key clients and top-tier prospects',
    ],
  },
  'annual-retreat': {
    label: 'Annual Retreat',
    description: 'Strategic planning gathering for team and partners',
    objectives: [
      'Internal leadership and key stakeholders',
      'Strategic partners for upcoming initiatives',
      'Subject matter experts for breakout sessions',
    ],
  },
  custom: {
    label: 'Custom',
    description: 'Define your own event format',
    objectives: [],
  },
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Toronto',
  'America/Vancouver',
  'UTC',
]

function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const ampm = h >= 12 ? 'PM' : 'AM'
      const hours12 = h % 12 || 12
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      times.push(`${hours12}:${pad(m)} ${ampm}`)
    }
  }
  return times
}

function isoDateToUS(yyyymmdd: string): string {
  if (!yyyymmdd) return ''
  const parts = yyyymmdd.split('-')
  if (parts.length !== 3) return ''
  return `${parts[1]}/${parts[2]}/${parts[0]}`
}

function datetimeLocalToISO(date: string, time: string, timezone: string): string {
  const dt = new Date(`${date} ${time}`)
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .format(dt)
    .replace(' ', 'T') + 'Z'
}

export function CreateEventWizard({ onClose, onSuccess }: CreateEventWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics')
  const [eventId, setEventId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Step 1: Basics
  const [evName, setEvName] = useState('')
  const [evFormat, setEvFormat] = useState<EventFormat | null>(null)
  const [evTimezone, setEvTimezone] = useState('America/New_York')
  const [evStartDate, setEvStartDate] = useState('')
  const [evStartTime, setEvStartTime] = useState('6:00 PM')
  const [evEndDate, setEvEndDate] = useState('')
  const [evEndTime, setEvEndTime] = useState('10:00 PM')
  const [evLocationVenue, setEvLocationVenue] = useState('')
  const [evLocationCity, setEvLocationCity] = useState('')
  const [evLocationState, setEvLocationState] = useState('')
  const [evIsPrivate, setEvIsPrivate] = useState(true)
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)

  // Event Brief (for AI extraction)
  const [eventBrief, setEventBrief] = useState('')
  const [extracting, setExtracting] = useState(false)

  // Step 2: Objectives
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [objectivesSaved, setObjectivesSaved] = useState(false)

  // Step 3: Guest Pool
  const [guestPoolSource, setGuestPoolSource] = useState<string | null>(null)

  // Step 4: Collaboration
  const [inviteEmails, setInviteEmails] = useState<string[]>([''])

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStep)
  const isLastStep = currentStepIndex === STEPS.length - 1

  async function handleExtractBrief() {
    if (!eventId || !eventBrief.trim() || eventBrief.trim().length < 10) return
    setExtracting(true)
    setError(null)
    try {
      const res = await fetch(`/api/events/${eventId}/extract-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief_text: eventBrief }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Extraction failed')

      if (data.objectives && data.objectives.length > 0) {
        setObjectives(
          data.objectives.map((o: any, i: number) => ({
            objective_text: o.objective_text,
            weight: o.weight || 1.0,
            criteria_config: {},
            sort_order: i,
          }))
        )
        setObjectivesSaved(false)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract from brief')
    } finally {
      setExtracting(false)
    }
  }

  function goBack() {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].key)
      setError(null)
    }
  }

  async function goNext() {
    setError(null)

    // Step 1: Create the event
    if (currentStep === 'basics') {
      if (!evName.trim()) {
        setError('Event title is required')
        return
      }
      if (!evStartDate) {
        setError('Start date is required')
        return
      }

      setSaving(true)
      try {
        const startIso = datetimeLocalToISO(evStartDate, evStartTime, evTimezone)
        const endIso = evEndDate.trim() ? datetimeLocalToISO(evEndDate, evEndTime, evTimezone) : null

        const locationObj: Record<string, string | undefined> = {
          venue_name: evLocationVenue.trim() || undefined,
          city: evLocationCity.trim() || undefined,
          state_province: evLocationState.trim() || undefined,
          country: 'USA',
        }
        const hasLocation = Object.values(locationObj).some(v => v)

        const payload = {
          event: {
            title: evName.trim(),
            location: hasLocation ? locationObj : null,
            start_date: startIso,
            end_date: endIso,
            timezone: evTimezone,
            is_private: evIsPrivate,
            approve_mode: 'MANUAL' as ApproveMode,
            status: 'DRAFT' as EventStatus,
          },
        }

        const res = await fetch('/api/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to create event')

        setEventId(String(json.event_id))

        // Pre-fill objectives from format template
        if (evFormat && evFormat !== 'custom') {
          const template = FORMAT_TEMPLATES[evFormat]
          setObjectives(
            template.objectives.map((text, i) => ({
              objective_text: text,
              weight: 1.0,
              criteria_config: {},
              sort_order: i,
            }))
          )
        }

        setCurrentStep('objectives')
      } catch (err: any) {
        setError(err.message || 'Failed to create event')
      } finally {
        setSaving(false)
      }
      return
    }

    // Step 2: Save objectives (optional)
    if (currentStep === 'objectives' && eventId) {
      const validObjectives = objectives.filter(o => o.objective_text.trim())
      if (validObjectives.length > 0 && !objectivesSaved) {
        setSaving(true)
        try {
          const res = await fetch(`/api/events/${eventId}/objectives`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              objectives: validObjectives.map((o, i) => ({ ...o, sort_order: i })),
            }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to save objectives')
          }
          setObjectivesSaved(true)
        } catch (err: any) {
          setError(err.message || 'Failed to save objectives')
          setSaving(false)
          return
        } finally {
          setSaving(false)
        }
      }
      setCurrentStep('guest-pool')
      return
    }

    // Step 3: Guest pool (skip forward)
    if (currentStep === 'guest-pool') {
      setCurrentStep('collaboration')
      return
    }

    // Step 4: Finish
    if (currentStep === 'collaboration' && eventId) {
      onSuccess(eventId)
      router.push(`/dashboard/${eventId}/overview`)
    }
  }

  function handleFinish() {
    if (eventId) {
      onSuccess(eventId)
      router.push(`/dashboard/${eventId}/overview`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-card shadow-panel w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border shrink-0">
          <h2 className="font-display text-xl font-semibold text-brand-charcoal">Create Event</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-ui-tertiary hover:text-brand-charcoal rounded-lg hover:bg-brand-cream transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-ui-border bg-brand-cream/50 shrink-0">
          {STEPS.map((step, idx) => {
            const isActive = idx === currentStepIndex
            const isComplete = idx < currentStepIndex
            return (
              <div key={step.key} className="flex items-center gap-2">
                {idx > 0 && <div className="w-8 h-px bg-ui-border" />}
                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${isComplete
                        ? 'bg-emerald-500 text-white'
                        : isActive
                          ? 'bg-brand-terracotta text-white'
                          : 'bg-brand-cream text-ui-tertiary border border-ui-border'
                      }
                    `}
                  >
                    {isComplete ? <Check size={14} /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap hidden sm:inline ${
                      isActive ? 'text-brand-charcoal' : 'text-ui-tertiary'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Step 1: Basics */}
          {currentStep === 'basics' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">Event Basics</h3>
                <p className="text-sm text-ui-tertiary">Tell us about your event so the AI can help curate the perfect guest list.</p>
              </div>

              {/* Format Selector */}
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-2">Event Format</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(FORMAT_TEMPLATES) as [EventFormat, typeof FORMAT_TEMPLATES[EventFormat]][]).map(([key, fmt]) => (
                    <button
                      key={key}
                      onClick={() => setEvFormat(key)}
                      className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                        evFormat === key
                          ? 'border-brand-terracotta bg-brand-terracotta/5 text-brand-charcoal'
                          : 'border-ui-border bg-white text-ui-secondary hover:border-brand-terracotta/30'
                      }`}
                    >
                      <div className="text-sm font-semibold">{fmt.label}</div>
                      <div className="text-xs text-ui-tertiary mt-0.5">{fmt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                  Event Title <span className="text-red-600">*</span>
                </label>
                <input
                  value={evName}
                  onChange={(e) => setEvName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  placeholder="e.g., Q2 Executive Dinner - NYC"
                />
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">
                    Start Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={evStartDate}
                    placeholder="MM/DD/YYYY"
                    onClick={() => startDateRef.current?.showPicker()}
                    readOnly
                    className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal cursor-pointer focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                  <input ref={startDateRef} type="date" className="hidden" onChange={(e) => setEvStartDate(isoDateToUS(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">Start Time</label>
                  <select
                    value={evStartTime}
                    onChange={(e) => setEvStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  >
                    {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">End Date</label>
                  <input
                    type="text"
                    value={evEndDate}
                    placeholder="MM/DD/YYYY"
                    onClick={() => endDateRef.current?.showPicker()}
                    readOnly
                    className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal cursor-pointer focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                  <input ref={endDateRef} type="date" className="hidden" onChange={(e) => setEvEndDate(isoDateToUS(e.target.value))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-brand-charcoal mb-1">End Time</label>
                  <select
                    value={evEndTime}
                    onChange={(e) => setEvEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  >
                    {generateTimeOptions().map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-1">Timezone</label>
                <select
                  value={evTimezone}
                  onChange={(e) => setEvTimezone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                >
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-semibold text-brand-charcoal mb-2">Location</label>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={evLocationVenue}
                    onChange={(e) => setEvLocationVenue(e.target.value)}
                    placeholder="Venue name"
                    className="px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                  <input
                    value={evLocationCity}
                    onChange={(e) => setEvLocationCity(e.target.value)}
                    placeholder="City"
                    className="px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                  <input
                    value={evLocationState}
                    onChange={(e) => setEvLocationState(e.target.value)}
                    placeholder="State (e.g. NY)"
                    className="px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                  />
                </div>
              </div>

              {/* Private */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={evIsPrivate}
                  onChange={(e) => setEvIsPrivate(e.target.checked)}
                  className="w-4 h-4 text-brand-terracotta border-ui-border rounded focus:ring-brand-terracotta"
                />
                <span className="text-sm font-medium text-ui-secondary">Private event (invite-only)</span>
              </label>
            </div>
          )}

          {/* Step 2: Objectives */}
          {currentStep === 'objectives' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">Event Objectives</h3>
                <p className="text-sm text-ui-tertiary">
                  What kind of guests matter for this event? The AI will score contacts against these criteria.
                </p>
              </div>

              {/* Event Brief — AI extraction */}
              <div className="bg-brand-cream/50 rounded-lg border border-ui-border p-4 space-y-3">
                <label className="block text-sm font-semibold text-brand-charcoal">
                  Event Brief <span className="text-xs font-normal text-ui-tertiary">(optional)</span>
                </label>
                <textarea
                  value={eventBrief}
                  onChange={(e) => setEventBrief(e.target.value)}
                  placeholder="Paste your event brief, planning doc, or describe your ideal guest list. The AI will extract objectives from it..."
                  rows={4}
                  className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none bg-white"
                />
                <button
                  onClick={handleExtractBrief}
                  disabled={extracting || !eventBrief.trim() || eventBrief.trim().length < 10}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-pill transition-colors disabled:opacity-50"
                >
                  {extracting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Extract from Brief
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-3">
                {objectives.map((obj, index) => (
                  <div key={index} className="flex items-start gap-3 p-4 bg-brand-cream/50 rounded-lg border border-ui-border">
                    <div className="text-ui-tertiary mt-2 cursor-grab">
                      <GripVertical size={16} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={obj.objective_text}
                        onChange={(e) => {
                          const next = [...objectives]
                          next[index] = { ...next[index], objective_text: e.target.value }
                          setObjectives(next)
                          setObjectivesSaved(false)
                        }}
                        placeholder="Describe what makes a guest ideal..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none bg-white"
                      />
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-ui-tertiary">Weight</label>
                        <input
                          type="range"
                          min={0.1}
                          max={5}
                          step={0.1}
                          value={obj.weight}
                          onChange={(e) => {
                            const next = [...objectives]
                            next[index] = { ...next[index], weight: parseFloat(e.target.value) }
                            setObjectives(next)
                            setObjectivesSaved(false)
                          }}
                          className="w-24 accent-brand-terracotta"
                        />
                        <span className="text-xs font-mono text-ui-secondary">{obj.weight.toFixed(1)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setObjectives(objectives.filter((_, i) => i !== index))
                        setObjectivesSaved(false)
                      }}
                      className="p-1.5 text-ui-tertiary hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setObjectives([
                    ...objectives,
                    { objective_text: '', weight: 1.0, criteria_config: {}, sort_order: objectives.length },
                  ])
                  setObjectivesSaved(false)
                }}
                className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-ui-border rounded-lg text-sm font-medium text-ui-tertiary hover:border-brand-terracotta hover:text-brand-terracotta transition-colors"
              >
                <Plus size={16} />
                Add Objective
              </button>
            </div>
          )}

          {/* Step 3: Guest Pool */}
          {currentStep === 'guest-pool' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">Guest Pool Source</h3>
                <p className="text-sm text-ui-tertiary">
                  Where should we pull contacts from? You can skip this and add guests later.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { key: 'csv', icon: Upload, label: 'Upload CSV', description: 'Import contacts from a spreadsheet' },
                  { key: 'crm', icon: Database, label: 'Import from CRM', description: 'Connect to Airtable, Notion, or HubSpot' },
                  { key: 'past-event', icon: History, label: 'Import from Past Event', description: 'Copy contacts from a previous event' },
                  { key: 'network', icon: UsersIcon, label: 'Start from Moots Network', description: 'Use your existing People Database' },
                ].map(option => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.key}
                      onClick={() => setGuestPoolSource(option.key)}
                      className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                        guestPoolSource === option.key
                          ? 'border-brand-terracotta bg-brand-terracotta/5'
                          : 'border-ui-border bg-white hover:border-brand-terracotta/30'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        guestPoolSource === option.key ? 'bg-brand-terracotta/10' : 'bg-brand-cream'
                      }`}>
                        <Icon size={18} className={guestPoolSource === option.key ? 'text-brand-terracotta' : 'text-ui-tertiary'} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-brand-charcoal">{option.label}</div>
                        <div className="text-xs text-ui-tertiary mt-0.5">{option.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <p className="text-xs text-ui-tertiary text-center">
                You can always add more contacts after creating the event.
              </p>
            </div>
          )}

          {/* Step 4: Collaboration */}
          {currentStep === 'collaboration' && (
            <div className="space-y-5">
              <div>
                <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-1">Invite Team Members</h3>
                <p className="text-sm text-ui-tertiary">
                  Add collaborators who can help curate the guest list. You can skip this step.
                </p>
              </div>

              <div className="space-y-3">
                {inviteEmails.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const next = [...inviteEmails]
                        next[idx] = e.target.value
                        setInviteEmails(next)
                      }}
                      placeholder="team@company.com"
                      className="flex-1 px-3 py-2.5 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
                    />
                    {inviteEmails.length > 1 && (
                      <button
                        onClick={() => setInviteEmails(inviteEmails.filter((_, i) => i !== idx))}
                        className="p-2 text-ui-tertiary hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setInviteEmails([...inviteEmails, ''])}
                  className="flex items-center gap-1.5 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
                >
                  <Plus size={14} />
                  Add another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ui-border shrink-0 bg-brand-cream/30">
          <div>
            {currentStepIndex > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ui-secondary hover:text-brand-charcoal transition-colors"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {STEPS[currentStepIndex]?.optional && (
              <button
                onClick={() => {
                  if (isLastStep) {
                    handleFinish()
                  } else {
                    setCurrentStep(STEPS[currentStepIndex + 1].key)
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal transition-colors"
              >
                Skip
              </button>
            )}
            <button
              onClick={isLastStep ? handleFinish : goNext}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill shadow-cta transition-colors disabled:opacity-50"
            >
              {saving ? (
                'Saving...'
              ) : isLastStep ? (
                <>
                  <Check size={14} />
                  Finish
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

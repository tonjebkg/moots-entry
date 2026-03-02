'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Calendar,
  Clock,
  ImagePlus,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'
import { EditableField } from './EditableField'

/* ─── Shared data from creation wizard ─── */

const FORMAT_OPTIONS = [
  { value: 'curated-dinner', label: 'Curated Dinner' },
  { value: 'branded-house', label: 'Branded House' },
  { value: 'annual-retreat', label: 'Annual Retreat' },
  { value: 'custom', label: 'Custom' },
]

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

const TIME_OPTIONS = generateTimeOptions()

/* ─── Types ─── */

export interface EventPartner {
  id: string
  companyName: string
  role: 'Sponsor' | 'Partner' | 'Co-host' | 'Venue'
  tier: 'Primary' | 'Gold' | 'Silver'
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
}

export interface EventDetailsData {
  name: string
  type: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  timezone: string
  venueName: string
  city: string
  state: string
  capacity: string
  hostingCompany: string
  dressCode: string
  description: string
  image: string
  isPrivate: boolean
}

interface EventDetailsCardProps {
  eventData: EventDetailsData
  onUpdate: (key: string, value: string) => void
  teamMembers?: TeamMember[]
}

/* ─── Date Picker ─── */

function DatePickerField({
  value,
  onSave,
  placeholder = 'Select date',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
}) {
  // value is stored as YYYY-MM-DD for the input
  const displayValue = value
    ? (() => {
        const parts = value.split('-')
        if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`
        return value
      })()
    : ''

  return (
    <div className="relative">
      <div
        className={`text-sm leading-relaxed cursor-pointer py-px border-b border-dashed border-transparent hover:border-ui-border transition-colors flex items-center gap-1.5 pointer-events-none ${
          displayValue ? 'text-brand-charcoal' : 'text-ui-tertiary'
        }`}
      >
        <Calendar size={13} className="text-ui-tertiary shrink-0" />
        {displayValue || placeholder}
      </div>
      <input
        type="date"
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        style={{ colorScheme: 'light' }}
      />
    </div>
  )
}

/* ─── Time Dropdown ─── */

function TimeDropdownField({
  value,
  onSave,
  placeholder = 'Select time',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`text-sm leading-relaxed cursor-pointer py-px border-b border-dashed border-transparent hover:border-ui-border transition-colors flex items-center gap-1.5 bg-transparent border-none font-sans ${
          value ? 'text-brand-charcoal' : 'text-ui-tertiary'
        }`}
      >
        <Clock size={13} className="text-ui-tertiary shrink-0" />
        {value || placeholder}
        <ChevronDown size={11} className="text-ui-tertiary" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 bg-white border border-ui-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-[130px]">
          {TIME_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => {
                onSave(t)
                setOpen(false)
              }}
              className={`w-full text-left text-sm px-3 py-1.5 hover:bg-brand-cream transition-colors font-sans border-none bg-transparent cursor-pointer ${
                t === value ? 'text-brand-terracotta font-semibold bg-brand-terracotta/5' : 'text-brand-charcoal'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Select Dropdown ─── */

function SelectField({
  value,
  options,
  onSave,
  placeholder,
}: {
  value: string
  options: { value: string; label: string }[]
  onSave: (v: string) => void
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className={`text-sm leading-relaxed cursor-pointer py-0.5 bg-transparent border-b border-dashed border-transparent hover:border-ui-border transition-colors font-sans focus:outline-none focus:border-brand-terracotta w-full ${
        value ? 'text-brand-charcoal' : 'text-ui-tertiary'
      }`}
    >
      <option value="" disabled>
        {placeholder || 'Select...'}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/* ─── Format Chips ─── */

function FormatChips({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FORMAT_OPTIONS.map((f) => (
        <button
          key={f.value}
          onClick={() => onSave(f.value)}
          className={`text-[13px] font-semibold px-2.5 py-1 rounded-full border transition-all font-sans cursor-pointer ${
            value === f.value
              ? 'bg-brand-terracotta text-white border-brand-terracotta'
              : 'bg-white text-brand-charcoal border-ui-border hover:border-brand-terracotta/40'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

/* ─── Main Component ─── */

export function EventDetailsCard({
  eventData,
  onUpdate,
  teamMembers = [],
}: EventDetailsCardProps) {
  return (
    <div className="space-y-4">

      {/* Top row: Image + Name/Format */}
      <div className="flex gap-3.5">
        <EventImageUpload image={eventData.image} onImageChange={(v) => onUpdate('image', v)} />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Event Name</div>
          <EditableField value={eventData.name} onSave={(v) => onUpdate('name', v)} placeholder="Event name" />
          <div className="mt-2.5">
            <div className="text-[13px] font-medium text-ui-tertiary mb-1">Format</div>
            <FormatChips value={eventData.type} onSave={(v) => onUpdate('type', v)} />
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div>
        <div className="grid grid-cols-2 gap-3 mb-2.5">
          <div>
            <div className="text-[13px] font-medium text-ui-tertiary mb-1">Start Date</div>
            <DatePickerField
              value={eventData.startDate}
              onSave={(v) => onUpdate('startDate', v)}
              placeholder="Select start date"
            />
          </div>
          <div>
            <div className="text-[13px] font-medium text-ui-tertiary mb-1">Start Time</div>
            <TimeDropdownField
              value={eventData.startTime}
              onSave={(v) => onUpdate('startTime', v)}
              placeholder="Select time"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2.5">
          <div>
            <div className="text-[13px] font-medium text-ui-tertiary mb-1">End Date</div>
            <DatePickerField
              value={eventData.endDate}
              onSave={(v) => onUpdate('endDate', v)}
              placeholder="Select end date"
            />
          </div>
          <div>
            <div className="text-[13px] font-medium text-ui-tertiary mb-1">End Time</div>
            <TimeDropdownField
              value={eventData.endTime}
              onSave={(v) => onUpdate('endTime', v)}
              placeholder="Select time"
            />
          </div>
        </div>
        <div>
          <div className="text-[13px] font-medium text-ui-tertiary mb-1">Timezone</div>
          <SelectField
            value={eventData.timezone}
            options={TIMEZONES.map((tz) => ({
              value: tz,
              label: tz.replace(/_/g, ' ').replace('America/', ''),
            }))}
            onSave={(v) => onUpdate('timezone', v)}
            placeholder="Select timezone"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <div className="text-[13px] font-medium text-ui-tertiary mb-1.5">Location</div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <div className="text-[12px] text-ui-tertiary/70 mb-0.5">Venue</div>
            <EditableField
              value={eventData.venueName}
              onSave={(v) => onUpdate('venueName', v)}
              placeholder="Venue name"
            />
          </div>
          <div>
            <div className="text-[12px] text-ui-tertiary/70 mb-0.5">City</div>
            <EditableField value={eventData.city} onSave={(v) => onUpdate('city', v)} placeholder="City" />
          </div>
          <div>
            <div className="text-[12px] text-ui-tertiary/70 mb-0.5">State</div>
            <EditableField value={eventData.state} onSave={(v) => onUpdate('state', v)} placeholder="State" />
          </div>
        </div>
      </div>

      {/* Other details — 2-column grid, no icons */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Capacity</div>
          <EditableField
            value={eventData.capacity}
            onSave={(v) => onUpdate('capacity', v)}
            placeholder="Number of guests"
          />
        </div>
        <div>
          <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Hosting Company</div>
          <EditableField
            value={eventData.hostingCompany}
            onSave={(v) => onUpdate('hostingCompany', v)}
            placeholder="Company name"
          />
        </div>
        <div>
          <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Dress Code</div>
          <EditableField
            value={eventData.dressCode}
            onSave={(v) => onUpdate('dressCode', v)}
            placeholder="e.g. Black tie, Smart casual"
          />
        </div>
        <div>
          <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Visibility</div>
          <button
            onClick={() => onUpdate('isPrivate', eventData.isPrivate ? '' : 'true')}
            className={`text-sm font-medium cursor-pointer bg-transparent border-none font-sans transition-colors ${
              eventData.isPrivate ? 'text-brand-terracotta' : 'text-ui-tertiary'
            }`}
          >
            {eventData.isPrivate ? 'Invite-only' : 'Public'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <div className="text-[13px] font-medium text-ui-tertiary mb-0.5">Description</div>
        <EditableField
          value={eventData.description}
          onSave={(v) => onUpdate('description', v)}
          placeholder="Describe the event..."
          multiline
        />
      </div>

      {/* Team section */}
      {teamMembers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[13px] font-medium text-ui-tertiary">Team</div>
            <button className="flex items-center gap-1 text-[13px] text-brand-terracotta font-semibold bg-transparent border-none cursor-pointer font-sans hover:underline">
              Manage <ExternalLink size={10} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-1.5 bg-brand-cream rounded-full pl-0.5 pr-2.5 py-0.5">
                <div className="w-6 h-6 rounded-full bg-brand-terracotta/15 flex items-center justify-center text-[10px] font-bold text-brand-terracotta">
                  {m.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <span className="text-[13px] text-brand-charcoal font-medium">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}

/* ─── Event Image Upload ─── */

function EventImageUpload({ image, onImageChange }: { image: string; onImageChange: (v: string) => void }) {
  const [hover, setHover] = useState(false)

  return (
    <label
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`w-[88px] h-[88px] rounded-[10px] shrink-0 cursor-pointer relative overflow-hidden flex items-center justify-center transition-all border ${
        image
          ? 'bg-brand-terracotta border-brand-terracotta/25'
          : 'bg-gradient-to-br from-brand-terracotta/10 via-[#E8D5CC] to-brand-terracotta/10 border-ui-border'
      }`}
    >
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImageChange(URL.createObjectURL(file))
        }}
      />
      {image ? (
        <>
          <div className="text-[28px] font-extrabold text-white/90 tracking-tight">MC</div>
          {hover && (
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white text-[11px] font-semibold">
              Change
            </div>
          )}
        </>
      ) : (
        <div
          className={`flex flex-col items-center gap-0.5 transition-colors ${hover ? 'text-brand-terracotta' : 'text-ui-tertiary'}`}
        >
          <ImagePlus size={22} />
          <span className="text-[11px] font-semibold tracking-[0.02em]">Add image</span>
        </div>
      )}
    </label>
  )
}

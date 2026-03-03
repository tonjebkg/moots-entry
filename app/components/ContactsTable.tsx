'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronUp, ChevronDown, User, Copy, Check } from 'lucide-react'
import { EnrichmentStatusBadge } from './EnrichmentStatusBadge'
import { formatUSDate } from '@/lib/datetime'

interface ContactRow {
  id: string
  full_name: string
  first_name: string | null
  last_name: string | null
  photo_url: string | null
  company: string | null
  title: string | null
  emails: { email: string }[]
  tags: string[]
  enrichment_status: string
  source: string
  created_at: string
  updated_at: string
}

interface ContactsTableProps {
  contacts: ContactRow[]
  selectedIds: Set<string>
  onSelectionChange: (ids: Set<string>) => void
  onContactClick: (contactId: string) => void
  sortField: string
  sortOrder: string
  onSortChange: (field: string) => void
}

const SOURCE_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  CSV_IMPORT: 'CSV Import',
  EVENT_IMPORT: 'Event Import',
  API: 'API',
  ENRICHMENT: 'Enrichment',
  AIRTABLE_IMPORT: 'Airtable',
  NOTION_IMPORT: 'Notion',
  RSVP_SUBMISSION: 'RSVP',
  JOIN_REQUEST: 'Join Request',
  WALK_IN: 'Walk-In',
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-0.5 text-ui-tertiary hover:text-brand-terracotta transition-colors shrink-0"
      title="Copy email"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  )
}

export function ContactsTable({
  contacts,
  selectedIds,
  onSelectionChange,
  onContactClick,
  sortField,
  sortOrder,
  onSortChange,
}: ContactsTableProps) {
  const allSelected = contacts.length > 0 && contacts.every(c => selectedIds.has(c.id))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange(new Set())
    } else {
      onSelectionChange(new Set(contacts.map(c => c.id)))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  function SortIcon({ field }: { field: string }) {
    if (sortField !== field) return null
    return sortOrder === 'asc'
      ? <ChevronUp size={14} className="inline" />
      : <ChevronDown size={14} className="inline" />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ui-border">
            <th className="px-4 py-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-ui-border"
              />
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-ui-tertiary cursor-pointer hover:text-brand-charcoal"
              onClick={() => onSortChange('full_name')}
            >
              Name <SortIcon field="full_name" />
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-ui-tertiary cursor-pointer hover:text-brand-charcoal"
              onClick={() => onSortChange('company')}
            >
              Company <SortIcon field="company" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-ui-tertiary">
              Title
            </th>
            <th className="px-4 py-3 text-left font-semibold text-ui-tertiary">
              Email
            </th>
            <th className="px-4 py-3 text-left font-semibold text-ui-tertiary">
              Tags
            </th>
            <th className="px-4 py-3 text-left font-semibold text-ui-tertiary">
              Source
            </th>
            <th className="px-4 py-3 text-left font-semibold text-ui-tertiary">
              Enrichment
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-ui-tertiary cursor-pointer hover:text-brand-charcoal"
              onClick={() => onSortChange('created_at')}
            >
              Added <SortIcon field="created_at" />
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => {
            const email = contact.emails?.[0]?.email
            return (
              <tr
                key={contact.id}
                className="border-b border-ui-border hover:bg-brand-cream cursor-pointer transition-colors"
                onClick={() => onContactClick(contact.id)}
              >
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(contact.id)}
                    onChange={() => toggleOne(contact.id)}
                    className="rounded border-ui-border"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {contact.photo_url ? (
                      <Image
                        src={contact.photo_url}
                        alt={contact.full_name}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-forest flex items-center justify-center text-white text-xs font-bold">
                        {contact.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onContactClick(contact.id) }}
                      className="font-medium text-brand-charcoal hover:text-brand-terracotta hover:underline transition-colors text-left"
                    >
                      {contact.full_name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-ui-secondary">
                  {contact.company || '—'}
                </td>
                <td className="px-4 py-3 text-ui-secondary">
                  {contact.title || '—'}
                </td>
                <td className="px-4 py-3 text-ui-secondary">
                  <div className="flex items-center">
                    <span className="truncate">{email || '—'}</span>
                    {email && <CopyEmailButton email={email} />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(contact.tags || []).slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="inline-flex px-1.5 py-0.5 bg-brand-cream text-ui-secondary text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {(contact.tags || []).length > 3 && (
                      <span className="text-xs text-ui-tertiary">
                        +{contact.tags.length - 3}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-ui-secondary text-xs rounded-full">
                    {SOURCE_LABELS[contact.source] || contact.source || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <EnrichmentStatusBadge status={contact.enrichment_status} />
                </td>
                <td className="px-4 py-3 text-ui-tertiary text-xs">
                  {formatUSDate(new Date(contact.created_at))}
                </td>
              </tr>
            )
          })}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-12 text-center text-ui-tertiary">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <div>No contacts match your current filters. Try adjusting your search or import new contacts to grow your pool.</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronUp, ChevronDown, User } from 'lucide-react'
import { EnrichmentStatusBadge } from './EnrichmentStatusBadge'

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
          <tr className="border-b border-[#e1e4e8]">
            <th className="px-4 py-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                className="rounded border-[#e1e4e8]"
              />
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-[#6e6e7e] cursor-pointer hover:text-[#1a1a2e]"
              onClick={() => onSortChange('full_name')}
            >
              Name <SortIcon field="full_name" />
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-[#6e6e7e] cursor-pointer hover:text-[#1a1a2e]"
              onClick={() => onSortChange('company')}
            >
              Company <SortIcon field="company" />
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#6e6e7e]">
              Email
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#6e6e7e]">
              Tags
            </th>
            <th className="px-4 py-3 text-left font-semibold text-[#6e6e7e]">
              Enrichment
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-[#6e6e7e] cursor-pointer hover:text-[#1a1a2e]"
              onClick={() => onSortChange('created_at')}
            >
              Added <SortIcon field="created_at" />
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.map(contact => (
            <tr
              key={contact.id}
              className="border-b border-[#e1e4e8] hover:bg-[#f8f9fa] cursor-pointer transition-colors"
              onClick={() => onContactClick(contact.id)}
            >
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(contact.id)}
                  onChange={() => toggleOne(contact.id)}
                  className="rounded border-[#e1e4e8]"
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
                    <div className="w-8 h-8 rounded-full bg-[#0f3460] flex items-center justify-center text-white text-xs font-bold">
                      {contact.full_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-[#1a1a2e]">{contact.full_name}</div>
                    {contact.title && (
                      <div className="text-xs text-[#6e6e7e]">{contact.title}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-[#4a4a5e]">
                {contact.company || '—'}
              </td>
              <td className="px-4 py-3 text-[#4a4a5e]">
                {contact.emails?.[0]?.email || '—'}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {(contact.tags || []).slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="inline-flex px-1.5 py-0.5 bg-[#f0f2f5] text-[#4a4a5e] text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                  {(contact.tags || []).length > 3 && (
                    <span className="text-xs text-[#6e6e7e]">
                      +{contact.tags.length - 3}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <EnrichmentStatusBadge status={contact.enrichment_status} />
              </td>
              <td className="px-4 py-3 text-[#6e6e7e] text-xs">
                {new Date(contact.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {contacts.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-[#6e6e7e]">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <div>No contacts found</div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

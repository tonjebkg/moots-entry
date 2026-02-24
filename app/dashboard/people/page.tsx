'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Upload, Tag, Trash2, X, Users } from 'lucide-react'
import { ContactsTable } from '@/app/components/ContactsTable'
import { ContactImportModal } from '@/app/components/ContactImportModal'
import { ContactDetailPanel } from '@/app/components/ContactDetailPanel'
import { DashboardHeader } from '@/app/components/DashboardHeader'

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

interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

export default function PeoplePage() {
  const router = useRouter()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [enrichmentFilter, setEnrichmentFilter] = useState('')
  const [sortField, setSortField] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showImport, setShowImport] = useState(false)
  const [detailContactId, setDetailContactId] = useState<string | null>(null)
  const [events, setEvents] = useState<{ id: number; title: string }[]>([])

  const fetchContacts = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        sort: sortField,
        order: sortOrder,
      })
      if (searchQuery) params.set('q', searchQuery)
      if (enrichmentFilter) params.set('enrichment_status', enrichmentFilter)

      const res = await fetch(`/api/contacts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data.contacts)
        setPagination(data.pagination)
      }
    } catch (err) {
      console.error('Failed to fetch contacts:', err)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, enrichmentFilter, sortField, sortOrder])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => setEvents((data.events || []).map((e: any) => ({ id: e.id, title: e.title || e.name }))))
      .catch(() => {})
  }, [])

  function handleSortChange(field: string) {
    if (sortField === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} contact(s)?`)) return

    for (const id of selectedIds) {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    }
    setSelectedIds(new Set())
    fetchContacts(pagination.page)
  }

  async function handleBulkEnrich() {
    if (selectedIds.size === 0) return
    try {
      const res = await fetch('/api/contacts/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_ids: Array.from(selectedIds) }),
      })
      if (res.ok) {
        setSelectedIds(new Set())
        fetchContacts(pagination.page)
      }
    } catch (err) {
      console.error('Enrichment failed:', err)
    }
  }

  return (
    <main className="min-h-screen bg-brand-cream">
      {/* Header */}
      <DashboardHeader activeNav="people" />

      <div className="pt-[73px]">
        <div className="max-w-7xl mx-auto p-8 space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold text-brand-charcoal">People Database</h1>
              <p className="text-sm text-ui-tertiary mt-1">
                {pagination.total} contact{pagination.total !== 1 ? 's' : ''} in your workspace
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream"
              >
                <Upload size={16} />
                Import
              </button>
              <button
                onClick={() => router.push('/dashboard/people/new')}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill transition-colors shadow-cta"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, company, title..."
                className="w-full pl-10 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
              />
            </div>
            <select
              value={enrichmentFilter}
              onChange={(e) => setEnrichmentFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Not Enriched</option>
              <option value="COMPLETED">Enriched</option>
              <option value="IN_PROGRESS">Enriching</option>
              <option value="FAILED">Failed</option>
            </select>
            {(searchQuery || enrichmentFilter) && (
              <button
                onClick={() => { setSearchQuery(''); setEnrichmentFilter('') }}
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-brand-terracotta/5 border border-brand-terracotta/20 rounded-lg">
              <span className="text-sm font-medium text-brand-terracotta">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <button
                onClick={handleBulkEnrich}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-terracotta hover:bg-brand-terracotta/10 rounded-lg"
              >
                <Tag size={14} />
                Enrich
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-ui-tertiary">Loading contacts...</div>
            ) : (
              <ContactsTable
                contacts={contacts}
                selectedIds={selectedIds}
                onSelectionChange={setSelectedIds}
                onContactClick={(id) => setDetailContactId(id)}
                sortField={sortField}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            )}
          </div>

          {/* Pagination */}
          {pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-ui-tertiary">
                Page {pagination.page} of {pagination.total_pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchContacts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-ui-border rounded-lg disabled:opacity-50 hover:bg-brand-cream"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchContacts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-3 py-1.5 text-sm border border-ui-border rounded-lg disabled:opacity-50 hover:bg-brand-cream"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <ContactImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchContacts() }}
          events={events}
        />
      )}

      {/* Detail Panel */}
      {detailContactId && (
        <ContactDetailPanel
          contactId={detailContactId}
          onClose={() => setDetailContactId(null)}
          onUpdate={() => fetchContacts(pagination.page)}
          onEnrich={async (id) => {
            try {
              await fetch('/api/contacts/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact_ids: [id] }),
              })
              setDetailContactId(null)
              fetchContacts(pagination.page)
            } catch (err) {
              console.error('Enrichment failed:', err)
            }
          }}
        />
      )}
    </main>
  )
}

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, Plus, Upload, Tag, Trash2, X, Users, Settings, LogOut } from 'lucide-react'
import { ContactsTable } from '@/app/components/ContactsTable'
import { ContactImportModal } from '@/app/components/ContactImportModal'
import { ContactDetailPanel } from '@/app/components/ContactDetailPanel'

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
    <main className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/98 backdrop-blur-sm border-b border-[#e1e4e8] z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-2xl font-bold text-[#1a1a2e]">Moots</Link>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm font-medium text-[#6e6e7e] hover:text-[#1a1a2e]">Events</Link>
              <Link href="/dashboard/people" className="text-sm font-semibold text-[#0f3460]">People</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/settings" className="p-2 text-[#6e6e7e] hover:text-[#0f3460] transition-colors rounded-lg hover:bg-[#f0f2f5]" title="Settings">
              <Settings size={18} />
            </Link>
          </div>
        </div>
      </header>

      <div className="pt-[73px]">
        <div className="max-w-7xl mx-auto p-8 space-y-6">
          {/* Page Title */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1a1a2e]">People Database</h1>
              <p className="text-sm text-[#6e6e7e] mt-1">
                {pagination.total} contact{pagination.total !== 1 ? 's' : ''} in your workspace
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 px-4 py-2 border border-[#e1e4e8] rounded-lg text-sm font-medium text-[#4a4a5e] hover:bg-[#f8f9fa]"
              >
                <Upload size={16} />
                Import
              </button>
              <button
                onClick={() => router.push('/dashboard/people/new')}
                className="flex items-center gap-2 px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Plus size={16} />
                Add Contact
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, company, title..."
                className="w-full pl-10 pr-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460]"
              />
            </div>
            <select
              value={enrichmentFilter}
              onChange={(e) => setEnrichmentFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] focus:outline-none focus:border-[#0f3460]"
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
                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#0f3460] hover:text-[#c5a572]"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-[#0f3460]/5 border border-[#0f3460]/20 rounded-lg">
              <span className="text-sm font-medium text-[#0f3460]">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <button
                onClick={handleBulkEnrich}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#0f3460] hover:bg-[#0f3460]/10 rounded-lg"
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
          <div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-[#6e6e7e]">Loading contacts...</div>
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
              <div className="text-sm text-[#6e6e7e]">
                Page {pagination.page} of {pagination.total_pages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchContacts(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 text-sm border border-[#e1e4e8] rounded-lg disabled:opacity-50 hover:bg-[#f8f9fa]"
                >
                  Previous
                </button>
                <button
                  onClick={() => fetchContacts(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                  className="px-3 py-1.5 text-sm border border-[#e1e4e8] rounded-lg disabled:opacity-50 hover:bg-[#f8f9fa]"
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

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { GuestDetailPanel } from '@/app/components/GuestDetailPanel'
import { DossierPanel } from '@/app/components/DossierPanel'
import { GuestProfile } from '@/types/guest'

type NeonStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'DRAFT'

type Guest = {
  id: string
  event_id: string | number
  owner_id: string
  full_name: string
  email: string
  status: NeonStatus
  plus_ones: number | null
  comments?: string | null
  created_at?: string
}

const STATUS_BG: Record<NeonStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 border border-amber-200',
  APPROVED: 'bg-blue-50 text-blue-700 border border-blue-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  CANCELLED: 'bg-gray-100 text-ui-tertiary border border-gray-200',
  DRAFT: 'bg-gray-100 text-ui-tertiary border border-gray-200',
}

export default function GuestsTabPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)
  const [dossierScores, setDossierScores] = useState<Record<string, { score: number; contact_id: string }>>({})

  // Fetch dossier scores for overlay
  useEffect(() => {
    async function fetchDossierScores() {
      try {
        const res = await fetch(`/api/events/${eventId}/dossiers`)
        if (res.ok) {
          const data = await res.json()
          const scoreMap: Record<string, { score: number; contact_id: string }> = {}
          for (const d of data.dossiers || []) {
            if (d.relevance_score != null) {
              // Map by email or name for matching to join-request guests
              scoreMap[d.full_name?.toLowerCase()] = { score: d.relevance_score, contact_id: d.contact_id }
            }
          }
          setDossierScores(scoreMap)
        }
      } catch {}
    }
    fetchDossierScores()
  }, [eventId])

  useEffect(() => {
    fetchGuests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function fetchGuests() {
    try {
      setLoading(true)
      const res = await fetch(`/api/events/${eventId}/join-requests`)
      if (res.ok) {
        const data = await res.json()
        setGuests(data.join_requests || [])
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(guestId: string, newStatus: NeonStatus, e?: React.MouseEvent) {
    // Stop propagation to prevent row click
    e?.stopPropagation()

    try {
      const res = await fetch(`/api/join-requests/${guestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update status')
      }

      fetchGuests()

      // Update selected guest if it's currently open
      if (selectedGuest && selectedGuest.id === guestId) {
        const guestStatus =
          newStatus === 'APPROVED' ? 'ACCEPTED' :
          newStatus === 'REJECTED' ? 'DECLINED' :
          newStatus === 'CANCELLED' ? 'CANCELLED' : 'CONSIDERING'
        setSelectedGuest({ ...selectedGuest, status: guestStatus })
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  function handleGuestClick(guestId: string) {
    const guest = guests.find(g => g.id === guestId)
    if (guest) {
      // Convert to GuestProfile format
      setSelectedGuest({
        id: guest.id,
        event_id: parseInt(eventId),
        first_name: guest.full_name?.split(' ')[0] || '',
        last_name: guest.full_name?.split(' ').slice(1).join(' ') || '',
        email: guest.email,
        company: '',
        tier: 'TIER_2',
        priority: 'NORMAL',
        status: guest.status === 'APPROVED' ? 'ACCEPTED' :
                guest.status === 'REJECTED' ? 'DECLINED' :
                guest.status === 'CANCELLED' ? 'CANCELLED' : 'CONSIDERING',
        expected_plus_ones: guest.plus_ones || 0,
        internal_notes: guest.comments || '',
        created_at: guest.created_at || new Date().toISOString(),
        updated_at: guest.created_at || new Date().toISOString(),
      } as GuestProfile)
    }
  }

  async function handleGuestUpdate(updates: Partial<GuestProfile>) {
    if (!selectedGuest) return

    try {
      const res = await fetch(`/api/join-requests/${selectedGuest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update guest')
      }

      // Refresh data
      fetchGuests()
      setSelectedGuest({ ...selectedGuest, ...updates })
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  const filteredGuests = guests.filter(guest => {
    if (filterStatus && guest.status !== filterStatus) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !guest.full_name.toLowerCase().includes(query) &&
        !guest.email.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    return true
  })

  const stats = {
    pending: guests.filter(g => g.status === 'PENDING').length,
    approved: guests.filter(g => g.status === 'APPROVED').length,
    rejected: guests.filter(g => g.status === 'REJECTED').length,
    total: guests.length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading guests...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-ui-border rounded-card shadow-card p-6">
        <h2 className="font-display text-xl font-semibold text-brand-charcoal mb-2 tracking-tight">
          Guest Management
        </h2>
        <p className="text-sm text-ui-secondary">
          Review and approve RSVP requests. Click any row to view full guest details.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-card shadow-card p-4">
          <div className="text-2xl font-bold text-amber-700 mb-1">
            {stats.pending}
          </div>
          <div className="text-xs font-medium text-ui-tertiary">Pending Review</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-card shadow-card p-4">
          <div className="text-2xl font-bold text-brand-terracotta mb-1">
            {stats.approved}
          </div>
          <div className="text-xs font-medium text-ui-tertiary">Approved</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-card shadow-card p-4">
          <div className="text-2xl font-bold text-red-700 mb-1">
            {stats.rejected}
          </div>
          <div className="text-xs font-medium text-ui-tertiary">Rejected</div>
        </div>
        <div className="bg-brand-cream border border-ui-border rounded-card shadow-card p-4">
          <div className="text-2xl font-bold text-brand-charcoal mb-1">
            {stats.total}
          </div>
          <div className="text-xs font-medium text-ui-tertiary">Total Guests</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {(filterStatus || searchQuery) && (
          <button
            onClick={() => {
              setFilterStatus('')
              setSearchQuery('')
            }}
            className="px-3 py-2 text-sm font-medium text-brand-terracotta hover:text-brand-terracotta/70 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Guests Table */}
      <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream border-b border-ui-border">
            <tr>
              <th className="px-4 py-3 text-center font-semibold text-brand-charcoal w-16">Score</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Email</th>
              <th className="px-4 py-3 text-center font-semibold text-brand-charcoal">Plus Ones</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Requested</th>
              <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border">
            {filteredGuests.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ui-tertiary text-sm">
                  No guests found
                </td>
              </tr>
            ) : (
              filteredGuests.map(guest => (
                <tr
                  key={guest.id}
                  onClick={() => handleGuestClick(guest.id)}
                  className="hover:bg-brand-cream transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3 text-center">
                    {(() => {
                      const match = dossierScores[guest.full_name?.toLowerCase()]
                      if (!match) return <span className="text-xs text-ui-tertiary">—</span>
                      const s = match.score
                      const color = s >= 80 ? 'bg-green-50 text-green-700' : s >= 60 ? 'bg-blue-50 text-blue-700' : s >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDossierContactId(match.contact_id) }}
                          className={`inline-flex px-1.5 py-0.5 text-xs font-bold rounded ${color} hover:opacity-80`}
                          title="View dossier"
                        >
                          {s}
                        </button>
                      )
                    })()}
                  </td>
                  <td className="px-4 py-3 font-medium text-brand-charcoal">{guest.full_name}</td>
                  <td className="px-4 py-3 text-ui-secondary">{guest.email}</td>
                  <td className="px-4 py-3 text-center text-ui-secondary">{guest.plus_ones || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${STATUS_BG[guest.status]}`}>
                      {guest.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ui-tertiary text-xs">
                    {guest.created_at ? new Date(guest.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      {guest.status === 'PENDING' && (
                        <>
                          <button
                            onClick={(e) => handleStatusChange(guest.id, 'APPROVED', e)}
                            className="px-3 py-1 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => handleStatusChange(guest.id, 'REJECTED', e)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {guest.status === 'APPROVED' && (
                        <button
                          onClick={(e) => handleStatusChange(guest.id, 'REJECTED', e)}
                          className="px-3 py-1 text-red-600 hover:text-red-700 text-xs font-semibold transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      {guest.status === 'REJECTED' && (
                        <button
                          onClick={(e) => handleStatusChange(guest.id, 'APPROVED', e)}
                          className="px-3 py-1 text-brand-terracotta hover:text-brand-terracotta/70 text-xs font-semibold transition-colors"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filteredGuests.length > 0 && (
          <div className="px-4 py-3 bg-brand-cream border-t border-ui-border text-xs font-medium text-ui-tertiary">
            Showing {filteredGuests.length} of {guests.length} guest{guests.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Guest Detail Panel */}
      {selectedGuest && (
        <GuestDetailPanel
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onUpdate={handleGuestUpdate}
        />
      )}

      {/* Dossier Panel */}
      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}
    </div>
  )
}

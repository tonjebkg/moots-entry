'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Users, Calendar, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { CapacityGauge } from '@/app/components/CapacityGauge'
import { GuestDetailPanel } from '@/app/components/GuestDetailPanel'
import { GuestProfile } from '@/types/guest'

interface CapacityStatus {
  total_capacity: number
  seats_filled: number
  seats_remaining: number
  over_capacity: boolean
}

interface GuestStats {
  total: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
}

interface RecentGuest {
  id: string
  full_name: string
  email: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  plus_ones: number
  created_at: string
}

export default function OverviewPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [capacity, setCapacity] = useState<CapacityStatus | null>(null)
  const [stats, setStats] = useState<GuestStats | null>(null)
  const [recentGuests, setRecentGuests] = useState<RecentGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null)

  useEffect(() => {
    fetchData()
  }, [eventId])

  async function fetchData() {
    try {
      setLoading(true)

      // Fetch capacity status
      const capacityRes = await fetch(`/api/events/${eventId}/capacity-status`)
      if (capacityRes.ok) {
        const capacityData = await capacityRes.json()
        setCapacity(capacityData)
      }

      // Fetch join requests for stats and recent activity
      const joinReqRes = await fetch(`/api/events/${eventId}/join-requests`)
      if (joinReqRes.ok) {
        const joinReqData = await joinReqRes.json()
        const guests = joinReqData.join_requests ?? []

        // Calculate stats
        const statsData: GuestStats = {
          total: guests.length,
          pending: guests.filter((g: RecentGuest) => g.status === 'PENDING').length,
          approved: guests.filter((g: RecentGuest) => g.status === 'APPROVED').length,
          rejected: guests.filter((g: RecentGuest) => g.status === 'REJECTED').length,
          cancelled: guests.filter((g: RecentGuest) => g.status === 'CANCELLED').length,
        }
        setStats(statsData)

        // Get 10 most recent guests
        const recent = [...guests]
          .sort((a: RecentGuest, b: RecentGuest) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .slice(0, 10)
        setRecentGuests(recent)
      }
    } catch (err) {
      console.error('Failed to fetch overview data:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleGuestClick(guestId: string) {
    const guest = recentGuests.find(g => g.id === guestId)
    if (guest) {
      // Convert to GuestProfile format (simplified for overview)
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
                guest.status === 'REJECTED' ? 'DECLINED' : 'CONSIDERING',
        expected_plus_ones: guest.plus_ones || 0,
        created_at: guest.created_at,
        updated_at: guest.created_at,
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
      fetchData()
      setSelectedGuest({ ...selectedGuest, ...updates })
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading overview...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight mb-2">Event Overview</h1>
        <p className="text-sm text-[#4a4a5e]">Real-time insights and recent guest activity for this event</p>
      </div>

      {/* Capacity Section */}
      {capacity && capacity.total_capacity > 0 && (
        <div className="bg-white border border-[#e1e4e8] rounded-lg p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#1a1a2e] mb-2">Event Capacity</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6e6e7e]">Total capacity:</span>
                  <span className="font-semibold text-[#1a1a2e]">{capacity.total_capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6e6e7e]">Seats filled:</span>
                  <span className="font-semibold text-emerald-700">{capacity.seats_filled}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#6e6e7e]">Remaining:</span>
                  <span className="font-semibold text-[#0f3460]">{capacity.seats_remaining}</span>
                </div>
              </div>
            </div>
            <div className="w-[320px] shrink-0">
              <CapacityGauge
                filled={capacity.seats_filled}
                total={capacity.total_capacity}
              />
            </div>
          </div>
        </div>
      )}

      {/* Guest Stats Grid */}
      {stats && (
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a2e] mb-4">Guest Status</h2>
          <div className="grid grid-cols-5 gap-4">
            {/* Total */}
            <div className="bg-[#f0f2f5] border border-[#e1e4e8] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-[#6e6e7e]" />
                <div className="text-xs font-semibold text-[#6e6e7e] uppercase">Total</div>
              </div>
              <div className="text-2xl font-bold text-[#1a1a2e]">{stats.total}</div>
            </div>

            {/* Pending */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-700" />
                <div className="text-xs font-semibold text-[#6e6e7e] uppercase">Pending</div>
              </div>
              <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            </div>

            {/* Approved */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-emerald-700" />
                <div className="text-xs font-semibold text-[#6e6e7e] uppercase">Approved</div>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.approved}</div>
            </div>

            {/* Rejected */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-700" />
                <div className="text-xs font-semibold text-[#6e6e7e] uppercase">Rejected</div>
              </div>
              <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
            </div>

            {/* Cancelled */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-slate-600" />
                <div className="text-xs font-semibold text-[#6e6e7e] uppercase">Cancelled</div>
              </div>
              <div className="text-2xl font-bold text-slate-700">{stats.cancelled}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Recent Activity</h2>
            <p className="text-sm text-[#6e6e7e] mt-1">Latest join requests for this event</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6e6e7e]">
            <TrendingUp size={16} />
            <span>Showing last 10</span>
          </div>
        </div>

        <div className="bg-white border border-[#e1e4e8] rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#f8f9fa] border-b border-[#e1e4e8]">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">+1s</th>
                <th className="px-4 py-3 text-left font-semibold text-[#1a1a2e]">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e4e8]">
              {recentGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={32} className="text-[#6e6e7e]" />
                      <div className="text-sm text-[#6e6e7e]">No recent activity yet</div>
                    </div>
                  </td>
                </tr>
              ) : (
                recentGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    onClick={() => handleGuestClick(guest.id)}
                    className="hover:bg-[#f8f9fa] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-[#1a1a2e]">{guest.full_name}</td>
                    <td className="px-4 py-3 text-[#4a4a5e]">{guest.email}</td>
                    <td className="px-4 py-3">
                      {guest.status === 'PENDING' && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                          PENDING
                        </span>
                      )}
                      {guest.status === 'APPROVED' && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          APPROVED
                        </span>
                      )}
                      {guest.status === 'REJECTED' && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-red-50 text-red-700 border border-red-200">
                          REJECTED
                        </span>
                      )}
                      {guest.status === 'CANCELLED' && (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-slate-50 text-slate-700 border border-slate-200">
                          CANCELLED
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#4a4a5e]">{guest.plus_ones || 0}</td>
                    <td className="px-4 py-3 text-[#6e6e7e]">
                      {new Date(guest.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest Detail Panel */}
      {selectedGuest && (
        <GuestDetailPanel
          guest={selectedGuest}
          onClose={() => setSelectedGuest(null)}
          onUpdate={handleGuestUpdate}
        />
      )}
    </div>
  )
}

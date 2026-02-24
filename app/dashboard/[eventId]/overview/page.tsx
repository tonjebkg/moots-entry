'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Users, Calendar, CheckCircle, XCircle, Clock, TrendingUp, BarChart3, Target, MessageSquare } from 'lucide-react'
import { CapacityGauge } from '@/app/components/CapacityGauge'
import { GuestDetailPanel } from '@/app/components/GuestDetailPanel'
import { GuestProfile } from '@/types/guest'

interface AnalyticsSummary {
  checked_in: number
  follow_ups_sent: number
  meetings_booked: number
  scored: number
}

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
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null)

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Fetch analytics summary
      try {
        const analyticsRes = await fetch(`/api/events/${eventId}/analytics`)
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json()
          const h = analyticsData.metrics?.headline
          if (h) {
            setAnalyticsSummary({
              checked_in: h.checked_in,
              follow_ups_sent: h.follow_ups_sent,
              meetings_booked: h.meetings_booked,
              scored: h.scored,
            })
          }
        }
      } catch {
        // Analytics summary is optional
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
        <div className="text-ui-tertiary text-sm font-medium">Loading overview...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight mb-2">Event Overview</h1>
        <p className="text-sm text-ui-secondary">Real-time insights and recent guest activity for this event</p>
      </div>

      {/* Capacity Section */}
      {capacity && capacity.total_capacity > 0 && (
        <div className="bg-white border border-ui-border rounded-card shadow-card p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold text-brand-charcoal mb-2">Event Capacity</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ui-tertiary">Total capacity:</span>
                  <span className="font-semibold text-brand-charcoal">{capacity.total_capacity}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ui-tertiary">Seats filled:</span>
                  <span className="font-semibold text-emerald-700">{capacity.seats_filled}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-ui-tertiary">Remaining:</span>
                  <span className="font-semibold text-brand-terracotta">{capacity.seats_remaining}</span>
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
          <h2 className="font-display text-lg font-semibold text-brand-charcoal mb-4">Guest Status</h2>
          <div className="grid grid-cols-5 gap-4">
            {/* Total */}
            <div className="bg-brand-cream border border-ui-border rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-ui-tertiary" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Total</div>
              </div>
              <div className="text-2xl font-bold text-brand-charcoal">{stats.total}</div>
            </div>

            {/* Pending */}
            <div className="bg-amber-50 border border-amber-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Pending</div>
              </div>
              <div className="text-2xl font-bold text-amber-700">{stats.pending}</div>
            </div>

            {/* Approved */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-emerald-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Approved</div>
              </div>
              <div className="text-2xl font-bold text-emerald-700">{stats.approved}</div>
            </div>

            {/* Rejected */}
            <div className="bg-red-50 border border-red-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-red-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Rejected</div>
              </div>
              <div className="text-2xl font-bold text-red-700">{stats.rejected}</div>
            </div>

            {/* Cancelled */}
            <div className="bg-slate-50 border border-slate-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-slate-600" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Cancelled</div>
              </div>
              <div className="text-2xl font-bold text-slate-700">{stats.cancelled}</div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      {analyticsSummary && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-brand-charcoal">Event Intelligence</h2>
            <Link
              href={`/dashboard/${eventId}/analytics`}
              className="text-sm font-semibold text-brand-terracotta hover:underline flex items-center gap-1"
            >
              <BarChart3 size={14} />
              Full Analytics
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target size={16} className="text-blue-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">AI Scored</div>
              </div>
              <div className="text-2xl font-bold text-blue-700">{analyticsSummary.scored}</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-green-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Checked In</div>
              </div>
              <div className="text-2xl font-bold text-green-700">{analyticsSummary.checked_in}</div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={16} className="text-purple-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Follow-ups</div>
              </div>
              <div className="text-2xl font-bold text-purple-700">{analyticsSummary.follow_ups_sent}</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-card shadow-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-amber-700" />
                <div className="text-xs font-semibold text-ui-tertiary uppercase">Meetings</div>
              </div>
              <div className="text-2xl font-bold text-amber-700">{analyticsSummary.meetings_booked}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-brand-charcoal">Recent Activity</h2>
            <p className="text-sm text-ui-tertiary mt-1">Latest join requests for this event</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-ui-tertiary">
            <TrendingUp size={16} />
            <span>Showing last 10</span>
          </div>
        </div>

        <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream border-b border-ui-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">+1s</th>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {recentGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Calendar size={32} className="text-ui-tertiary" />
                      <div className="text-sm text-ui-tertiary">No recent activity yet</div>
                    </div>
                  </td>
                </tr>
              ) : (
                recentGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    onClick={() => handleGuestClick(guest.id)}
                    className="hover:bg-brand-cream transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-medium text-brand-charcoal">{guest.full_name}</td>
                    <td className="px-4 py-3 text-ui-secondary">{guest.email}</td>
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
                    <td className="px-4 py-3 text-ui-secondary">{guest.plus_ones || 0}</td>
                    <td className="px-4 py-3 text-ui-tertiary">
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

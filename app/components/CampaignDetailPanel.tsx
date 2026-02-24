'use client'

import { useEffect, useState } from 'react'
import { CapacityGauge } from './CapacityGauge'
import { GuestPipelineTable } from './GuestPipelineTable'
import { InviteWavePlanner } from './InviteWavePlanner'
import { SendRsvpModal } from './SendRsvpModal'
import { GuestAddEditModal } from './GuestAddEditModal'
import { GuestDetailPanel } from './GuestDetailPanel'
import { UserPlus, Upload } from 'lucide-react'
import { GuestProfile } from '@/types/guest'

interface Campaign {
  id: string
  event_id: number
  name: string
  description: string | null
  status: string
  total_considering: number
  total_invited: number
  total_accepted: number
  total_declined: number
  total_joined: number
}

interface Invitation {
  id: string
  full_name: string
  email: string
  status: 'CONSIDERING' | 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'WAITLIST' | 'BOUNCED' | 'FAILED'
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'WAITLIST'
  priority: 'VIP' | 'HIGH' | 'NORMAL' | 'LOW'
  expected_plus_ones: number
  internal_notes: string | null
  rsvp_email_sent_at: string | null
  rsvp_responded_at: string | null
  join_link_sent_at: string | null
  join_completed_at: string | null
}

interface Counts {
  considering: number
  invited: number
  accepted: number
  declined: number
  waitlist: number
  by_tier: {
    tier_1: number
    tier_2: number
    tier_3: number
    waitlist: number
  }
}

interface CapacityStatus {
  total_capacity: number
  seats_filled: number
  seats_remaining: number
  over_capacity: boolean
}

interface CampaignDetailPanelProps {
  campaignId: string
  eventId: string
  onRefresh?: () => void
}

export function CampaignDetailPanel({ campaignId, eventId, onRefresh }: CampaignDetailPanelProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [capacity, setCapacity] = useState<CapacityStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [rsvpModalConfig, setRsvpModalConfig] = useState<{
    ids?: string[]
    tier?: 'TIER_1' | 'TIER_2' | 'TIER_3'
  }>({})
  const [uploading, setUploading] = useState(false)
  const [showAddGuestModal, setShowAddGuestModal] = useState(false)
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null)
  const [selectedGuest, setSelectedGuest] = useState<GuestProfile | null>(null)

  useEffect(() => {
    fetchData()
  }, [campaignId])

  async function fetchData() {
    try {
      setLoading(true)

      const campaignRes = await fetch(`/api/campaigns/${campaignId}`)
      if (campaignRes.ok) {
        const data = await campaignRes.json()
        setCampaign(data.campaign)

        const capacityRes = await fetch(`/api/events/${data.campaign.event_id}/capacity-status`)
        if (capacityRes.ok) {
          const capacityData = await capacityRes.json()
          setCapacity(capacityData)
        }
      }

      const invitationsRes = await fetch(`/api/campaigns/${campaignId}/invitations`)
      if (invitationsRes.ok) {
        const data = await invitationsRes.json()
        setInvitations(data.invitations)
        setCounts(data.counts)
      }
    } catch (err) {
      console.error('Failed to fetch campaign data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/campaigns/${campaignId}/invitations/upload`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload CSV')
      }

      alert(`Successfully imported ${data.imported} guests. ${data.skipped} skipped.`)
      fetchData()
      onRefresh?.()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleBulkAction(action: string, ids: string[]) {
    if (action === 'send-rsvp') {
      setRsvpModalConfig({ ids })
      setShowRsvpModal(true)
    } else if (action === 'send-join-links') {
      if (!confirm(`Send join links to ${ids.length} guest${ids.length === 1 ? '' : 's'}?`)) {
        return
      }

      try {
        const res = await fetch('/api/invitations/bulk-send-join-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitation_ids: ids }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to send join links')
        }

        alert(`Successfully sent ${data.sent} join links`)
        fetchData()
      } catch (err: any) {
        alert(`Error: ${err.message}`)
      }
    }
  }

  async function handleDeleteInvitation(id: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return
    }

    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete invitation')
      }

      fetchData()
      onRefresh?.()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  function handleEditGuest(guestId: string) {
    setEditingGuestId(guestId)
  }

  function handleGuestModalSuccess() {
    setShowAddGuestModal(false)
    setEditingGuestId(null)
    fetchData()
    onRefresh?.()
  }

  function handleGuestModalCancel() {
    setShowAddGuestModal(false)
    setEditingGuestId(null)
  }

  function handleSendTier(tier: 'TIER_1' | 'TIER_2' | 'TIER_3') {
    setRsvpModalConfig({ tier })
    setShowRsvpModal(true)
  }

  function handleGuestClick(guestId: string) {
    const guest = invitations.find(inv => inv.id === guestId)
    if (guest) {
      // Convert Invitation to GuestProfile format
      setSelectedGuest({
        ...guest,
        event_id: campaign?.event_id || 0,
        campaign_id: campaignId,
        internal_notes: guest.internal_notes || '',
        // Add default values for new fields
        first_name: guest.full_name?.split(' ')[0] || '',
        last_name: guest.full_name?.split(' ').slice(1).join(' ') || '',
        company: '',
        title: '',
        linkedin_url: '',
        phone: '',
        introduction_source: '',
        host_notes: '',
        tags: [],
        enrichment_sources: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as GuestProfile)
    }
  }

  async function handleGuestUpdate(updates: Partial<GuestProfile>) {
    if (!selectedGuest) return

    try {
      const res = await fetch(`/api/invitations/${selectedGuest.id}`, {
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

      // Update selected guest
      setSelectedGuest({ ...selectedGuest, ...updates })
    } catch (err: any) {
      throw new Error(err.message)
    }
  }

  const tierCountsByStatus = {
    considering: { tier_1: 0, tier_2: 0, tier_3: 0, waitlist: 0 },
    invited: { tier_1: 0, tier_2: 0, tier_3: 0, waitlist: 0 },
  }

  invitations.forEach((inv) => {
    const tierKey = inv.tier.toLowerCase().replace('_', '_') as 'tier_1' | 'tier_2' | 'tier_3' | 'waitlist'
    if (inv.status === 'CONSIDERING') {
      tierCountsByStatus.considering[tierKey]++
    } else if (inv.status === 'INVITED') {
      tierCountsByStatus.invited[tierKey]++
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading campaign...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="bg-white border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-700 text-sm font-medium">Campaign not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Campaign Header */}
      <div className="bg-white border border-[#e1e4e8] rounded-lg p-5 shadow-sm">
        <div className="flex items-start justify-between gap-8">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-[#1a1a2e] mb-2 tracking-tight">
              {campaign.name}
            </h2>
            {campaign.description && (
              <p className="text-sm text-[#4a4a5e] leading-relaxed">
                {campaign.description}
              </p>
            )}
          </div>
          {capacity && capacity.total_capacity > 0 && (
            <div className="w-[260px] shrink-0">
              <CapacityGauge
                filled={capacity.seats_filled}
                total={capacity.total_capacity}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Considering', value: campaign.total_considering, color: 'text-[#6e6e7e]', bg: 'bg-[#f0f2f5]', border: 'border-[#e1e4e8]' },
          { label: 'Invited', value: campaign.total_invited, color: 'text-[#0f3460]', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Accepted', value: campaign.total_accepted, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
          { label: 'Declined', value: campaign.total_declined, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100' },
          { label: 'Joined', value: campaign.total_joined, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`${stat.bg} border ${stat.border} rounded-lg p-3`}
          >
            <div className={`text-2xl font-bold mb-0.5 ${stat.color} tracking-tight`}>
              {stat.value}
            </div>
            <div className="text-xs font-semibold text-[#6e6e7e] uppercase tracking-wide">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Side-by-Side: Invitation Waves + Guest List */}
      <div className="flex gap-5 min-h-[600px]">
        {/* Left Sidebar: Invitation Waves */}
        <div className="w-[280px] shrink-0">
          {counts && (
            <InviteWavePlanner
              counts={counts.by_tier}
              consideringCounts={tierCountsByStatus.considering}
              invitedCounts={tierCountsByStatus.invited}
              onSendTier={handleSendTier}
            />
          )}
        </div>

        {/* Right: Guest List */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddGuestModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] active:bg-[#0f3460]/90 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
            >
              <UserPlus size={16} />
              Add Guest
            </button>
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-[#e1e4e8] hover:border-[#0f3460] active:border-[#0f3460] text-[#1a1a2e] text-sm font-semibold rounded-lg cursor-pointer transition-all">
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Guest Pipeline Table */}
          <GuestPipelineTable
            invitations={invitations}
            onRefresh={fetchData}
            onBulkAction={handleBulkAction}
            onUpdateInvitation={(id, updates) => {
              console.log('Update invitation', id, updates)
            }}
            onDeleteInvitation={handleDeleteInvitation}
            onEditGuest={handleGuestClick}
          />
        </div>
      </div>

      {/* Modals */}
      {showRsvpModal && (
        <SendRsvpModal
          campaignId={campaignId}
          selectedIds={rsvpModalConfig.ids}
          tier={rsvpModalConfig.tier}
          onSuccess={() => {
            setShowRsvpModal(false)
            fetchData()
            onRefresh?.()
          }}
          onCancel={() => setShowRsvpModal(false)}
        />
      )}

      {(showAddGuestModal || editingGuestId) && (
        <GuestAddEditModal
          campaignId={campaignId}
          guestId={editingGuestId}
          onSuccess={handleGuestModalSuccess}
          onCancel={handleGuestModalCancel}
        />
      )}

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

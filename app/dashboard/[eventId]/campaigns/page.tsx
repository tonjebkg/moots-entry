'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Plus, Clipboard, ChevronRight } from 'lucide-react'
import { CampaignForm } from '@/app/components/CampaignForm'
import { CampaignDetailPanel } from '@/app/components/CampaignDetailPanel'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  total_considering: number
  total_invited: number
  total_accepted: number
  total_declined: number
  total_joined: number
  created_at: string
}

export default function CampaignsTabPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = params.eventId as string

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    fetchCampaigns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  useEffect(() => {
    const campaignId = searchParams?.get('campaign')
    if (campaignId) {
      setSelectedCampaignId(campaignId)
    }
  }, [searchParams])

  async function fetchCampaigns() {
    try {
      setLoading(true)
      const res = await fetch(`/api/events/${eventId}/campaigns`)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data.campaigns || [])
      }
    } catch (err) {
      console.error('Failed to fetch campaigns:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleSelectCampaign(campaignId: string) {
    setSelectedCampaignId(campaignId)
    const url = new URL(window.location.href)
    url.searchParams.set('campaign', campaignId)
    window.history.pushState({}, '', url)
  }

  async function handleDeleteCampaign(campaignId: string, campaignName: string) {
    if (!confirm(`Delete "${campaignName}"? This will also delete all invitations.`)) {
      return
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete campaign')
      }

      if (selectedCampaignId === campaignId) {
        setSelectedCampaignId(null)
        const url = new URL(window.location.href)
        url.searchParams.delete('campaign')
        window.history.pushState({}, '', url)
      }

      fetchCampaigns()
    } catch (err: any) {
      alert(`Error: ${err.message}`)
    }
  }

  function getStatusColor(status: Campaign['status']) {
    switch (status) {
      case 'DRAFT': return 'bg-brand-cream text-ui-tertiary border border-gray-200'
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      case 'PAUSED': return 'bg-amber-50 text-amber-700 border border-amber-200'
      case 'COMPLETED': return 'bg-blue-50 text-blue-700 border border-blue-200'
      case 'CANCELLED': return 'bg-red-50 text-red-700 border border-red-200'
      default: return 'bg-brand-cream text-ui-tertiary border border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-5 min-h-[calc(100vh-16rem)]">
      {/* Left: Campaign List */}
      <div className="w-[280px] shrink-0 space-y-2">
        <button
          onClick={() => setShowCreateForm(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 active:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill shadow-cta transition-all"
        >
          <Plus size={16} />
          New Campaign
        </button>

        <div className="space-y-2">
          {campaigns.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-brand-cream flex items-center justify-center">
                <Clipboard className="text-ui-tertiary" size={20} />
              </div>
              <p className="text-sm text-ui-secondary leading-relaxed">
                No campaigns yet. Create one to start managing invitations.
              </p>
            </div>
          ) : (
            campaigns.map(campaign => (
              <button
                key={campaign.id}
                onClick={() => handleSelectCampaign(campaign.id)}
                className={`
                  w-full text-left p-3 rounded-lg border transition-all
                  ${selectedCampaignId === campaign.id
                    ? 'bg-white border-brand-terracotta shadow-md'
                    : 'bg-white border-ui-border hover:border-brand-terracotta/70 hover:shadow-sm'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-brand-charcoal text-sm leading-tight">
                    {campaign.name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded shrink-0 ${getStatusColor(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>

                {campaign.description && (
                  <p className="text-xs text-ui-tertiary mb-2 line-clamp-2 leading-relaxed">
                    {campaign.description}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-ui-tertiary mb-0.5 uppercase tracking-wide" style={{ fontSize: '10px' }}>Considering</div>
                    <div className="text-brand-charcoal font-bold">{campaign.total_considering}</div>
                  </div>
                  <div>
                    <div className="text-ui-tertiary mb-0.5 uppercase tracking-wide" style={{ fontSize: '10px' }}>Invited</div>
                    <div className="text-brand-terracotta font-bold">{campaign.total_invited}</div>
                  </div>
                  <div>
                    <div className="text-ui-tertiary mb-0.5 uppercase tracking-wide" style={{ fontSize: '10px' }}>Accepted</div>
                    <div className="text-emerald-700 font-bold">{campaign.total_accepted}</div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Campaign Detail */}
      <div className="flex-1 min-w-0">
        {selectedCampaignId ? (
          <CampaignDetailPanel
            campaignId={selectedCampaignId}
            eventId={eventId}
            onRefresh={fetchCampaigns}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-brand-cream flex items-center justify-center">
                <ChevronRight className="text-ui-tertiary" size={32} />
              </div>
              <h3 className="text-xl font-bold font-display text-brand-charcoal mb-2 tracking-tight">
                Select a campaign
              </h3>
              <p className="text-sm text-ui-tertiary leading-relaxed">
                Choose a campaign from the list to view details and manage guest invitations.
              </p>
            </div>
          </div>
        )}
      </div>

      {showCreateForm && (
        <CampaignForm
          eventId={eventId}
          onSuccess={() => {
            setShowCreateForm(false)
            fetchCampaigns()
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  )
}

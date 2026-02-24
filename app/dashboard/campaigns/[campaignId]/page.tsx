'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CapacityGauge } from '@/app/components/CapacityGauge';
import { GuestPipelineTable } from '@/app/components/GuestPipelineTable';
import { InviteWavePlanner } from '@/app/components/InviteWavePlanner';
import { SendRsvpModal } from '@/app/components/SendRsvpModal';

interface Campaign {
  id: string;
  event_id: number;
  name: string;
  description: string | null;
  status: string;
  total_considering: number;
  total_invited: number;
  total_accepted: number;
  total_declined: number;
  total_joined: number;
}

interface Invitation {
  id: string;
  full_name: string;
  email: string;
  status: 'CONSIDERING' | 'INVITED' | 'ACCEPTED' | 'DECLINED' | 'WAITLIST' | 'BOUNCED' | 'FAILED';
  tier: 'TIER_1' | 'TIER_2' | 'TIER_3' | 'WAITLIST';
  priority: 'VIP' | 'HIGH' | 'NORMAL' | 'LOW';
  expected_plus_ones: number;
  internal_notes: string | null;
  rsvp_email_sent_at: string | null;
  rsvp_responded_at: string | null;
  join_link_sent_at: string | null;
  join_completed_at: string | null;
}

interface Counts {
  considering: number;
  invited: number;
  accepted: number;
  declined: number;
  waitlist: number;
  by_tier: {
    tier_1: number;
    tier_2: number;
    tier_3: number;
    waitlist: number;
  };
}

interface CapacityStatus {
  total_capacity: number;
  seats_filled: number;
  seats_remaining: number;
  over_capacity: boolean;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [capacity, setCapacity] = useState<CapacityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRsvpModal, setShowRsvpModal] = useState(false);
  const [rsvpModalConfig, setRsvpModalConfig] = useState<{
    ids?: string[];
    tier?: 'TIER_1' | 'TIER_2' | 'TIER_3';
  }>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch campaign
      const campaignRes = await fetch(`/api/campaigns/${campaignId}`);
      if (campaignRes.ok) {
        const data = await campaignRes.json();
        setCampaign(data.campaign);

        // Fetch capacity
        const capacityRes = await fetch(`/api/events/${data.campaign.event_id}/capacity-status`);
        if (capacityRes.ok) {
          const capacityData = await capacityRes.json();
          setCapacity(capacityData);
        }
      }

      // Fetch invitations
      const invitationsRes = await fetch(`/api/campaigns/${campaignId}/invitations`);
      if (invitationsRes.ok) {
        const data = await invitationsRes.json();
        setInvitations(data.invitations);
        setCounts(data.counts);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/campaigns/${campaignId}/invitations/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      alert(`Successfully imported ${data.imported} guests. ${data.skipped} skipped.`);
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  }

  async function handleBulkAction(action: string, ids: string[]) {
    if (action === 'send-rsvp') {
      setRsvpModalConfig({ ids });
      setShowRsvpModal(true);
    } else if (action === 'send-join-links') {
      if (!confirm(`Send join links to ${ids.length} guest${ids.length === 1 ? '' : 's'}?`)) {
        return;
      }

      try {
        const res = await fetch('/api/invitations/bulk-send-join-links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ invitation_ids: ids }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to send join links');
        }

        alert(`Successfully sent ${data.sent} join links`);
        fetchData();
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      }
    }
  }

  async function handleDeleteInvitation(id: string) {
    if (!confirm('Are you sure you want to delete this invitation?')) {
      return;
    }

    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete invitation');
      }

      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function handleSendTier(tier: 'TIER_1' | 'TIER_2' | 'TIER_3') {
    setRsvpModalConfig({ tier });
    setShowRsvpModal(true);
  }

  // Calculate tier counts by status
  const tierCountsByStatus = {
    considering: { tier_1: 0, tier_2: 0, tier_3: 0, waitlist: 0 },
    invited: { tier_1: 0, tier_2: 0, tier_3: 0, waitlist: 0 },
  };

  invitations.forEach((inv) => {
    const tierKey = inv.tier.toLowerCase().replace('_', '_') as 'tier_1' | 'tier_2' | 'tier_3' | 'waitlist';
    if (inv.status === 'CONSIDERING') {
      tierCountsByStatus.considering[tierKey]++;
    } else if (inv.status === 'INVITED') {
      tierCountsByStatus.invited[tierKey]++;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse">Loading campaign...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="text-red-600">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/events/${campaign.event_id}/campaigns`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Campaigns
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              {campaign.description && (
                <p className="text-gray-600 mt-2">{campaign.description}</p>
              )}
            </div>

            {capacity && (
              <div className="w-80">
                <CapacityGauge
                  filled={capacity.seats_filled}
                  total={capacity.total_capacity}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-gray-900">{campaign.total_considering}</div>
            <div className="text-sm text-gray-600">Considering</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{campaign.total_invited}</div>
            <div className="text-sm text-gray-600">Invited</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{campaign.total_accepted}</div>
            <div className="text-sm text-gray-600">Accepted</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-red-600">{campaign.total_declined}</div>
            <div className="text-sm text-gray-600">Declined</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{campaign.total_joined}</div>
            <div className="text-sm text-gray-600">Joined App</div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer">
            {uploading ? 'Uploading...' : '📤 Upload CSV'}
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Invite Wave Planner */}
        {counts && (
          <div className="mb-8">
            <InviteWavePlanner
              counts={counts.by_tier}
              consideringCounts={tierCountsByStatus.considering}
              invitedCounts={tierCountsByStatus.invited}
              onSendTier={handleSendTier}
            />
          </div>
        )}

        {/* Guest Pipeline Table */}
        <GuestPipelineTable
          invitations={invitations}
          onRefresh={fetchData}
          onBulkAction={handleBulkAction}
          onUpdateInvitation={(id, updates) => {
            // Handle inline updates if needed
            console.log('Update invitation', id, updates);
          }}
          onDeleteInvitation={handleDeleteInvitation}
        />

        {/* RSVP Modal */}
        {showRsvpModal && (
          <SendRsvpModal
            campaignId={campaignId}
            selectedIds={rsvpModalConfig.ids}
            tier={rsvpModalConfig.tier}
            onSuccess={() => {
              setShowRsvpModal(false);
              fetchData();
            }}
            onCancel={() => setShowRsvpModal(false)}
          />
        )}
      </div>
    </div>
  );
}

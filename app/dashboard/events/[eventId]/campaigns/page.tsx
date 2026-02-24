'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CampaignForm } from '@/app/components/CampaignForm';
import { CompactCapacityGauge } from '@/app/components/CapacityGauge';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  total_considering: number;
  total_invited: number;
  total_accepted: number;
  total_declined: number;
  total_joined: number;
  created_at: string;
}

interface Event {
  id: number;
  title: string;
}

interface CapacityStatus {
  total_capacity: number;
  seats_filled: number;
  seats_remaining: number;
  over_capacity: boolean;
}

export default function CampaignsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [capacity, setCapacity] = useState<CapacityStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch event
      const eventRes = await fetch(`/api/events/${eventId}`);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        setEvent(eventData.event);
      }

      // Fetch campaigns
      const campaignsRes = await fetch(`/api/events/${eventId}/campaigns`);
      if (campaignsRes.ok) {
        const campaignsData = await campaignsRes.json();
        setCampaigns(campaignsData.campaigns);
      }

      // Fetch capacity status
      const capacityRes = await fetch(`/api/events/${eventId}/capacity-status`);
      if (capacityRes.ok) {
        const capacityData = await capacityRes.json();
        setCapacity(capacityData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCampaign(campaignId: string, campaignName: string) {
    if (!confirm(`Are you sure you want to delete "${campaignName}"? This will also delete all invitations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }

      // Refresh campaigns list
      fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  function getStatusColor(status: Campaign['status']) {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PAUSED': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="animate-pulse">Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/${eventId}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Event
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{event?.title || 'Event'}</h1>
              <p className="text-gray-600 mt-2">Manage invitation campaigns and guest lists</p>
            </div>

            {capacity && (
              <div className="bg-white px-4 py-3 rounded-lg shadow">
                <div className="text-xs text-gray-600 mb-1">Event Capacity</div>
                <CompactCapacityGauge
                  filled={capacity.seats_filled}
                  total={capacity.total_capacity}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + New Campaign
          </button>
          <button
            onClick={() => router.push(`/dashboard/events/${eventId}/setup`)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            ⚙️ Capacity Settings
          </button>
        </div>

        {/* Campaigns List */}
        {campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 text-5xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first invitation campaign to start curating your guest list
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Create Campaign
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {campaign.name}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>

                      {campaign.description && (
                        <p className="text-gray-600 text-sm mb-4">{campaign.description}</p>
                      )}

                      {/* Stats */}
                      <div className="flex gap-6 text-sm">
                        <div>
                          <span className="text-gray-500">Considering:</span>
                          <span className="ml-2 font-semibold text-gray-900">{campaign.total_considering}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Invited:</span>
                          <span className="ml-2 font-semibold text-blue-600">{campaign.total_invited}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Accepted:</span>
                          <span className="ml-2 font-semibold text-green-600">{campaign.total_accepted}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Declined:</span>
                          <span className="ml-2 font-semibold text-red-600">{campaign.total_declined}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Joined:</span>
                          <span className="ml-2 font-semibold text-purple-600">{campaign.total_joined}</span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-500 mt-3">
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                      >
                        Manage Guests
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded text-sm"
                        title="Delete campaign"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Campaign Modal */}
        {showCreateForm && (
          <CampaignForm
            eventId={eventId}
            onSuccess={() => {
              setShowCreateForm(false);
              fetchData();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </div>
    </div>
  );
}

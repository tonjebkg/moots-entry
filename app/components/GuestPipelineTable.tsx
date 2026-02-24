'use client';

import { useState } from 'react';
import { Search, Mail, Send, Edit2, Trash2, CheckCircle } from 'lucide-react';

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

interface GuestPipelineTableProps {
  invitations: Invitation[];
  onRefresh: () => void;
  onBulkAction: (action: string, ids: string[]) => void;
  onUpdateInvitation: (id: string, updates: any) => void;
  onDeleteInvitation: (id: string) => void;
  onEditGuest?: (guestId: string) => void;
  onBulkTierChange?: (ids: string[], tier: string) => void;
}

export function GuestPipelineTable({
  invitations,
  onRefresh,
  onBulkAction,
  onUpdateInvitation,
  onDeleteInvitation,
  onEditGuest,
  onBulkTierChange,
}: GuestPipelineTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterTier, setFilterTier] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    if (filterStatus && inv.status !== filterStatus) return false;
    if (filterTier && inv.tier !== filterTier) return false;
    if (filterPriority && inv.priority !== filterPriority) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !inv.full_name.toLowerCase().includes(query) &&
        !inv.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  // Toggle selection
  function toggleSelection(id: string) {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredInvitations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvitations.map((inv) => inv.id)));
    }
  }

  // Badge colors
  function getStatusBadge(status: Invitation['status']) {
    const colors = {
      CONSIDERING: 'bg-gray-100 text-gray-800',
      INVITED: 'bg-blue-100 text-blue-800',
      ACCEPTED: 'bg-green-100 text-green-800',
      DECLINED: 'bg-red-100 text-red-800',
      WAITLIST: 'bg-amber-100 text-amber-800',
      BOUNCED: 'bg-red-100 text-red-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[status]}`}>
        {status}
      </span>
    );
  }

  function getTierBadge(tier: Invitation['tier']) {
    const colors = {
      TIER_1: 'bg-purple-100 text-purple-800',
      TIER_2: 'bg-blue-100 text-blue-800',
      TIER_3: 'bg-gray-100 text-gray-800',
      WAITLIST: 'bg-amber-100 text-amber-800',
    };
    const labels = {
      TIER_1: 'Tier 1',
      TIER_2: 'Tier 2',
      TIER_3: 'Tier 3',
      WAITLIST: 'Waitlist',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[tier]}`}>
        {labels[tier]}
      </span>
    );
  }

  function getPriorityBadge(priority: Invitation['priority']) {
    const colors = {
      VIP: 'bg-purple-100 text-purple-800 font-bold',
      HIGH: 'bg-blue-100 text-blue-800',
      NORMAL: 'bg-gray-100 text-gray-800',
      LOW: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${colors[priority]}`}>
        {priority}
      </span>
    );
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  async function handleTierChange(invitationId: string, newTier: string) {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: newTier }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update tier');
      }

      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handlePriorityChange(invitationId: string, newPriority: string) {
    try {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update priority');
      }

      onRefresh();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg shadow-sm">
      {/* Filters and Search */}
      <div className="p-5 border-b border-ui-border">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ui-tertiary" size={16} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
          >
            <option value="">All Status</option>
            <option value="CONSIDERING">Considering</option>
            <option value="INVITED">Invited</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="WAITLIST">Waitlist</option>
          </select>

          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
          >
            <option value="">All Tiers</option>
            <option value="TIER_1">Tier 1</option>
            <option value="TIER_2">Tier 2</option>
            <option value="TIER_3">Tier 3</option>
            <option value="WAITLIST">Waitlist</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
          >
            <option value="">All Priorities</option>
            <option value="VIP">VIP</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          {(filterStatus || filterTier || filterPriority || searchQuery) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterTier('');
                setFilterPriority('');
                setSearchQuery('');
              }}
              className="px-3 py-2 text-sm font-medium text-ui-tertiary hover:text-brand-terracotta transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-brand-terracotta">
            {selectedIds.size} guest{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onBulkAction('send-rsvp', Array.from(selectedIds))}
              className="px-3 py-1.5 text-sm font-semibold bg-brand-terracotta text-white rounded-md hover:bg-brand-terracotta/90 active:bg-brand-terracotta/80 transition-colors shadow-sm"
            >
              Send RSVP
            </button>
            <button
              onClick={() => onBulkAction('send-join-links', Array.from(selectedIds))}
              className="px-3 py-1.5 text-sm font-semibold bg-purple-600 text-white rounded-md hover:bg-purple-700 active:bg-purple-800 transition-colors shadow-sm"
            >
              Send Join Links
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-brand-cream border-b border-ui-border">
            <tr>
              <th className="px-3 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={
                    filteredInvitations.length > 0 &&
                    selectedIds.size === filteredInvitations.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-ui-border text-brand-terracotta focus:ring-brand-terracotta"
                />
              </th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal">Name</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal">Email</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal">Tier</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal">Priority</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal">Status</th>
              <th className="px-3 py-3 text-center font-semibold text-brand-charcoal">+1s</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal text-xs">RSVP Sent</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal text-xs">Response</th>
              <th className="px-3 py-3 text-left font-semibold text-brand-charcoal text-xs">Join Link</th>
              <th className="px-3 py-3 text-right font-semibold text-brand-charcoal">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ui-border">
            {filteredInvitations.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-12 text-center text-ui-tertiary">
                  No guests found matching filters
                </td>
              </tr>
            ) : (
              filteredInvitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-brand-cream transition-colors cursor-pointer" onClick={() => onEditGuest?.(inv.id)}>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleSelection(inv.id)}
                      className="rounded border-ui-border text-brand-terracotta focus:ring-brand-terracotta"
                    />
                  </td>
                  <td className="px-3 py-3 font-medium text-brand-charcoal">
                    {inv.full_name}
                  </td>
                  <td className="px-3 py-3 text-ui-secondary">{inv.email}</td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inv.tier}
                      onChange={(e) => handleTierChange(inv.id, e.target.value)}
                      className="px-2 py-1 border border-ui-border rounded text-sm bg-white hover:border-brand-terracotta focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                    >
                      <option value="TIER_1">Tier 1</option>
                      <option value="TIER_2">Tier 2</option>
                      <option value="TIER_3">Tier 3</option>
                      <option value="WAITLIST">Waitlist</option>
                    </select>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inv.priority}
                      onChange={(e) => handlePriorityChange(inv.id, e.target.value)}
                      className="px-2 py-1 border border-ui-border rounded text-sm bg-white hover:border-brand-terracotta focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
                    >
                      <option value="VIP">VIP</option>
                      <option value="HIGH">High</option>
                      <option value="NORMAL">Normal</option>
                      <option value="LOW">Low</option>
                    </select>
                  </td>
                  <td className="px-3 py-3">{getStatusBadge(inv.status)}</td>
                  <td className="px-3 py-3 text-center text-ui-secondary">{inv.expected_plus_ones || '—'}</td>
                  <td className="px-3 py-3 text-ui-tertiary text-xs">{formatDate(inv.rsvp_email_sent_at)}</td>
                  <td className="px-3 py-3 text-ui-tertiary text-xs">{formatDate(inv.rsvp_responded_at)}</td>
                  <td className="px-3 py-3 text-xs">
                    {inv.join_completed_at ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle size={14} />
                        Joined
                      </span>
                    ) : inv.join_link_sent_at ? (
                      <span className="text-ui-tertiary">{formatDate(inv.join_link_sent_at)}</span>
                    ) : (
                      <span className="text-ui-tertiary">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onDeleteInvitation(inv.id)}
                      className="text-sm font-medium text-red-600 hover:text-red-700 active:text-red-800 transition-colors"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-brand-cream border-t border-ui-border text-sm font-medium text-ui-tertiary">
        Showing {filteredInvitations.length} of {invitations.length} guest{invitations.length === 1 ? '' : 's'}
      </div>
    </div>
  );
}

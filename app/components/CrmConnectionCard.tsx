'use client';

import { useState } from 'react';
import { RefreshCw, Settings, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

interface CrmConnection {
  id: string;
  provider: string;
  name: string;
  sync_direction: string;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  created_at: string;
  created_by_name?: string;
}

interface CrmConnectionCardProps {
  connection: CrmConnection;
  workspaceId: string;
  onSync: (connectionId: string) => void;
  onDelete: (connectionId: string) => void;
  onFieldMapping: (connectionId: string) => void;
  syncing?: boolean;
}

const providerLogos: Record<string, { name: string; color: string; bg: string }> = {
  SALESFORCE: { name: 'Salesforce', color: 'text-blue-600', bg: 'bg-blue-50' },
  HUBSPOT: { name: 'HubSpot', color: 'text-orange-600', bg: 'bg-orange-50' },
};

export function CrmConnectionCard({
  connection,
  onSync,
  onDelete,
  onFieldMapping,
  syncing,
}: CrmConnectionCardProps) {
  const provider = providerLogos[connection.provider] || { name: connection.provider, color: 'text-gray-600', bg: 'bg-gray-50' };

  const statusIcon = connection.last_sync_status === 'SUCCESS'
    ? <CheckCircle size={14} className="text-emerald-600" />
    : connection.last_sync_status === 'FAILED'
    ? <XCircle size={14} className="text-red-600" />
    : <Clock size={14} className="text-[#6e6e7e]" />;

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${provider.bg} rounded-lg flex items-center justify-center`}>
            <span className={`text-sm font-bold ${provider.color}`}>
              {provider.name.charAt(0)}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-[#1a1a2e]">{connection.name}</h3>
            <p className="text-xs text-[#6e6e7e]">
              {provider.name} · {connection.sync_direction.toLowerCase()}
            </p>
          </div>
        </div>
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
          connection.is_active
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-gray-100 text-gray-500 border border-gray-200'
        }`}>
          {connection.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Last sync */}
      <div className="flex items-center gap-2 mb-4 text-sm text-[#6e6e7e]">
        {statusIcon}
        <span>
          {connection.last_sync_at
            ? `Last sync: ${new Date(connection.last_sync_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : 'Never synced'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-[#e1e4e8]">
        <button
          onClick={() => onSync(connection.id)}
          disabled={syncing || !connection.is_active}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0f3460] bg-[#0f3460]/10 rounded-md hover:bg-[#0f3460]/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          onClick={() => onFieldMapping(connection.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#4a4a5e] bg-[#f0f2f5] rounded-md hover:bg-[#e1e4e8] transition-colors"
        >
          <Settings size={12} />
          Field Mapping
        </button>
        <button
          onClick={() => onDelete(connection.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors ml-auto"
        >
          <Trash2 size={12} />
          Remove
        </button>
      </div>
    </div>
  );
}

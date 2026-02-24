'use client';

import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';

interface UnassignedGuest {
  contact_id: string;
  full_name: string;
  company: string | null;
  relevance_score: number | null;
}

interface SeatingAssignPanelProps {
  unassigned: UnassignedGuest[];
  tableNumbers: number[];
  onAssign: (contactId: string, tableNumber: number) => void;
  loading?: boolean;
}

export function SeatingAssignPanel({ unassigned, tableNumbers, onAssign, loading }: SeatingAssignPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState<number>(tableNumbers[0] || 1);

  const filtered = unassigned.filter(g => {
    const q = search.toLowerCase();
    return g.full_name.toLowerCase().includes(q) ||
      (g.company?.toLowerCase().includes(q) ?? false);
  });

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg shadow-sm">
      <div className="p-4 border-b border-[#e1e4e8]">
        <h3 className="font-semibold text-[#1a1a2e] mb-3">Unassigned Guests ({unassigned.length})</h3>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" />
            <input
              type="text"
              placeholder="Search guests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460] focus:border-transparent"
            />
          </div>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
          >
            {tableNumbers.map(n => (
              <option key={n} value={n}>Table {n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto divide-y divide-[#e1e4e8]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-[#6e6e7e]">
            {unassigned.length === 0 ? 'All guests are assigned!' : 'No matching guests'}
          </div>
        ) : (
          filtered.map(guest => (
            <div
              key={guest.contact_id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[#f8f9fa] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[#1a1a2e] truncate">{guest.full_name}</div>
                <div className="text-xs text-[#6e6e7e] truncate">
                  {guest.company || 'No company'}
                  {guest.relevance_score != null && ` · Score: ${guest.relevance_score}`}
                </div>
              </div>
              <button
                onClick={() => onAssign(guest.contact_id, selectedTable)}
                disabled={loading}
                className="shrink-0 ml-3 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#0f3460] bg-[#0f3460]/10 rounded-md hover:bg-[#0f3460]/20 transition-colors disabled:opacity-50"
              >
                <ArrowRight size={12} />
                Table {selectedTable}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

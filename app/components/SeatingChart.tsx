'use client';

import { Users } from 'lucide-react';

interface TableAssignment {
  contact_id: string;
  full_name: string;
  company: string | null;
  relevance_score: number | null;
  seat_assignment: number | null;
}

interface TableData {
  table_number: number;
  seats: number;
  assignments: TableAssignment[];
}

interface SeatingChartProps {
  tables: TableData[];
  onRemoveGuest?: (contactId: string, tableNumber: number) => void;
}

export function SeatingChart({ tables, onRemoveGuest }: SeatingChartProps) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-[#6e6e7e]">
        <Users size={32} className="mx-auto mb-3 opacity-50" />
        <p className="text-sm">No tables configured. Set up seating format first.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables.map(table => {
        const fillRate = table.seats > 0
          ? Math.round((table.assignments.length / table.seats) * 100)
          : 0;
        const fillColor = fillRate >= 100 ? 'text-red-600' : fillRate >= 80 ? 'text-amber-600' : 'text-emerald-600';

        return (
          <div
            key={table.table_number}
            className="bg-white border border-[#e1e4e8] rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#1a1a2e]">Table {table.table_number}</h3>
              <span className={`text-xs font-semibold ${fillColor}`}>
                {table.assignments.length}/{table.seats} seats
              </span>
            </div>

            <div className="space-y-2">
              {table.assignments.length === 0 ? (
                <p className="text-xs text-[#6e6e7e] italic py-2">No guests assigned</p>
              ) : (
                table.assignments.map(guest => (
                  <div
                    key={guest.contact_id}
                    className="flex items-center justify-between p-2 bg-[#f8f9fa] rounded-md group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[#1a1a2e] truncate">
                        {guest.full_name}
                      </div>
                      {guest.company && (
                        <div className="text-xs text-[#6e6e7e] truncate">{guest.company}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {guest.relevance_score != null && (
                        <span className="text-xs font-semibold text-[#0f3460]">
                          {guest.relevance_score}
                        </span>
                      )}
                      {onRemoveGuest && (
                        <button
                          onClick={() => onRemoveGuest(guest.contact_id, table.table_number)}
                          className="opacity-0 group-hover:opacity-100 text-xs text-red-500 hover:text-red-700 transition-opacity"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

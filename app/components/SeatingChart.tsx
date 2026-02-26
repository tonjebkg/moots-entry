'use client';

import { Users, Info } from 'lucide-react';
import { TagBadge } from './ui/TagBadge';

interface TableAssignment {
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  tags: string[] | null;
  relevance_score: number | null;
  seat_assignment: number | null;
  rationale?: string;
}

interface TableData {
  table_number: number;
  seats: number;
  assignments: TableAssignment[];
}

interface SeatingChartProps {
  tables: TableData[];
  onRemoveGuest?: (contactId: string, tableNumber: number) => void;
  onGuestClick?: (contactId: string) => void;
  onMoveGuest?: (contactId: string, newTable: number) => void;
  allTableNumbers?: number[];
}

function getTagVariant(tag: string): 'terracotta' | 'gold' | 'forest' | 'default' {
  const t = tag.toLowerCase();
  if (t.includes('vip') || t.includes('sponsor')) return 'terracotta';
  if (t.includes('speaker') || t.includes('host')) return 'gold';
  if (t.includes('portfolio') || t.includes('partner')) return 'forest';
  return 'default';
}

export function SeatingChart({ tables, onRemoveGuest, onGuestClick, onMoveGuest, allTableNumbers }: SeatingChartProps) {
  if (tables.length === 0) {
    return (
      <div className="text-center py-12 text-ui-tertiary">
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
            className="bg-white border border-ui-border rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-brand-charcoal">Table {table.table_number}</h3>
              <span className={`text-xs font-semibold ${fillColor}`}>
                {table.assignments.length}/{table.seats} seats
              </span>
            </div>

            <div className="space-y-2">
              {table.assignments.length === 0 ? (
                <p className="text-xs text-ui-tertiary italic py-2">No guests assigned</p>
              ) : (
                table.assignments.map(guest => {
                  const tags = guest.tags || [];
                  const vipTag = tags.find(t => {
                    const tl = t.toLowerCase();
                    return tl.includes('vip') || tl.includes('sponsor') || tl.includes('speaker');
                  });

                  return (
                    <div
                      key={guest.contact_id}
                      className="flex items-center justify-between p-2 bg-brand-cream rounded-md group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {onGuestClick ? (
                            <button
                              onClick={() => onGuestClick(guest.contact_id)}
                              className="text-sm font-medium text-brand-charcoal truncate hover:text-brand-terracotta hover:underline transition-colors text-left"
                            >
                              {guest.full_name}
                            </button>
                          ) : (
                            <div className="text-sm font-medium text-brand-charcoal truncate">
                              {guest.full_name}
                            </div>
                          )}
                          {vipTag && (
                            <TagBadge label={vipTag} variant={getTagVariant(vipTag)} />
                          )}
                        </div>
                        <div className="text-xs text-ui-tertiary truncate">
                          {guest.title && guest.company
                            ? `${guest.title} · ${guest.company}`
                            : guest.company || guest.title || ''
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {guest.relevance_score != null && (
                          <span className="text-xs font-semibold text-brand-terracotta">
                            {guest.relevance_score}
                          </span>
                        )}
                        {guest.rationale && (
                          <span title={guest.rationale} className="cursor-help">
                            <Info size={12} className="text-ui-tertiary hover:text-brand-terracotta transition-colors" />
                          </span>
                        )}
                        {onMoveGuest && allTableNumbers && (
                          <select
                            className="opacity-0 group-hover:opacity-100 text-xs border border-ui-border rounded px-1 py-0.5 bg-white transition-opacity focus:opacity-100"
                            value=""
                            onChange={(e) => {
                              const newTable = parseInt(e.target.value, 10);
                              if (newTable && newTable !== table.table_number) {
                                onMoveGuest(guest.contact_id, newTable);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Move to...</option>
                            {allTableNumbers
                              .filter(n => n !== table.table_number)
                              .map(n => (
                                <option key={n} value={n}>Table {n}</option>
                              ))
                            }
                          </select>
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
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

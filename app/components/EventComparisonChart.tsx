'use client';

import type { EventComparison } from '@/types/phase4';

interface EventComparisonChartProps {
  events: EventComparison[];
}

export function EventComparisonChart({ events }: EventComparisonChartProps) {
  if (events.length < 2) {
    return null;
  }

  const metricKeys: { key: keyof EventComparison['metrics']; label: string; unit: string }[] = [
    { key: 'invited', label: 'Invited', unit: '' },
    { key: 'accepted', label: 'Accepted', unit: '' },
    { key: 'checked_in', label: 'Checked In', unit: '' },
    { key: 'acceptance_rate', label: 'Accept Rate', unit: '%' },
    { key: 'checkin_rate', label: 'Check-in Rate', unit: '%' },
    { key: 'follow_up_rate', label: 'Follow-up Rate', unit: '%' },
  ];

  const colors = ['#B8755E', '#2F4F3F'];

  return (
    <div className="bg-white border border-ui-border rounded-lg p-6 shadow-sm">
      <h3 className="font-semibold text-brand-charcoal mb-4">Event Comparison</h3>

      {/* Legend */}
      <div className="flex gap-4 mb-4">
        {events.map((evt, i) => (
          <div key={evt.event_id} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
            <span className="text-xs font-medium text-ui-secondary">{evt.event_title}</span>
          </div>
        ))}
      </div>

      {/* Comparison bars */}
      <div className="space-y-4">
        {metricKeys.map(({ key, label, unit }) => {
          const values = events.map(e => e.metrics[key]);
          const maxVal = Math.max(...values, 1);

          return (
            <div key={key}>
              <div className="text-xs font-semibold text-ui-tertiary mb-1">{label}</div>
              <div className="space-y-1">
                {events.map((evt, i) => {
                  const val = evt.metrics[key];
                  const width = Math.max((val / maxVal) * 100, 2);
                  return (
                    <div key={evt.event_id} className="flex items-center gap-2">
                      <div className="flex-1 h-6 bg-brand-cream rounded overflow-hidden">
                        <div
                          className="h-full rounded flex items-center px-2 transition-all duration-300"
                          style={{ width: `${width}%`, backgroundColor: colors[i] }}
                        >
                          <span className="text-xs font-bold text-white">{val}{unit}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

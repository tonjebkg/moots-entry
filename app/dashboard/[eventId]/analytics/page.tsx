'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Download, BarChart3 } from 'lucide-react';
import { AnalyticsFunnel } from '@/app/components/AnalyticsFunnel';
import { AnalyticsMetricsGrid } from '@/app/components/AnalyticsMetricsGrid';
import { TeamPerformanceTable } from '@/app/components/TeamPerformanceTable';
import { EventComparisonChart } from '@/app/components/EventComparisonChart';
import type { AnalyticsMetrics, TeamPerformance, EventComparison } from '@/types/phase4';

export default function AnalyticsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [team, setTeam] = useState<TeamPerformance[]>([]);
  const [comparison, setComparison] = useState<EventComparison[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/analytics`);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setMetrics(data.metrics);
      setTeam(data.team_performance || []);
      setComparison(data.comparison);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleExport() {
    window.open(`/api/events/${eventId}/analytics/export?format=${exportFormat}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading analytics...</div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="p-8">
        <div className="text-red-600 text-sm">{error || 'Failed to load analytics'}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-brand-charcoal tracking-tight mb-1">Analytics & ROI</h1>
          <p className="text-sm text-ui-secondary">Event performance metrics, funnel analysis, and team stats</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'csv' | 'json')}
            className="px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-terracotta border border-brand-terracotta rounded-lg hover:bg-brand-terracotta/5 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <AnalyticsMetricsGrid metrics={metrics.headline} />

      {/* Funnel + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AnalyticsFunnel stages={metrics.funnel} />
        </div>
        <div className="bg-white rounded-card shadow-card p-6">
          <h3 className="font-semibold text-brand-charcoal mb-4">Score Distribution</h3>
          <div className="space-y-3">
            {metrics.score_distribution.map(bucket => {
              const maxCount = Math.max(...metrics.score_distribution.map(b => b.count), 1);
              const width = Math.max((bucket.count / maxCount) * 100, 2);
              const color = bucket.range === '76-100' ? '#059669' :
                bucket.range === '51-75' ? '#B8755E' :
                bucket.range === '26-50' ? '#f59e0b' : '#ef4444';
              return (
                <div key={bucket.range}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-ui-tertiary">{bucket.range}</span>
                    <span className="text-ui-secondary">{bucket.count}</span>
                  </div>
                  <div className="h-4 bg-brand-cream rounded overflow-hidden">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: `${width}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Campaign Summary */}
      {metrics.campaign_summary.length > 0 && (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-ui-border">
            <h3 className="font-semibold text-brand-charcoal">Campaign Performance</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-brand-cream border-b border-ui-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-brand-charcoal">Campaign</th>
                <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Invited</th>
                <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Accepted</th>
                <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Declined</th>
                <th className="px-4 py-3 text-right font-semibold text-brand-charcoal">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {metrics.campaign_summary.map(c => (
                <tr key={c.campaign_id} className="hover:bg-brand-cream transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-charcoal">{c.campaign_name}</td>
                  <td className="px-4 py-3 text-right text-ui-secondary">{c.total_invited}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{c.total_accepted}</td>
                  <td className="px-4 py-3 text-right text-red-600">{c.total_declined}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded ${
                      c.acceptance_rate >= 70 ? 'bg-emerald-50 text-emerald-700' :
                      c.acceptance_rate >= 40 ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {c.acceptance_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Team Performance */}
      <TeamPerformanceTable team={team} />

      {/* Event Comparison */}
      {comparison && <EventComparisonChart events={comparison} />}
    </div>
  );
}

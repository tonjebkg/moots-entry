'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Download, Loader2, Search, X } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  ip_address: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityTypeFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (actionFilter) params.set('action', actionFilter);
      if (entityTypeFilter) params.set('entity_type', entityTypeFilter);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(data.pagination);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    const params = new URLSearchParams();
    if (actionFilter) params.set('action', actionFilter);
    if (entityTypeFilter) params.set('entity_type', entityTypeFilter);
    window.open(`/api/audit-logs/export?${params}`, '_blank');
  }

  function clearFilters() {
    setActionFilter('');
    setEntityTypeFilter('');
    setPage(1);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  function getActionColor(action: string): string {
    if (action.startsWith('auth.')) return 'bg-blue-50 text-blue-700';
    if (action.includes('created') || action.includes('signup')) return 'bg-emerald-50 text-emerald-700';
    if (action.includes('deleted') || action.includes('removed')) return 'bg-red-50 text-red-700';
    if (action.includes('updated') || action.includes('switched')) return 'bg-amber-50 text-amber-700';
    return 'bg-gray-100 text-[#6e6e7e]';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
          <ScrollText size={20} />
          Audit Log
        </h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#0f3460] hover:bg-[#f0f2f5] rounded-lg transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e6e7e]" size={14} />
          <input
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1); }}
            placeholder="Filter by action (e.g., auth.login)"
            className="w-full pl-9 pr-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460]"
          />
        </div>
        <input
          value={entityTypeFilter}
          onChange={e => { setEntityTypeFilter(e.target.value); setPage(1); }}
          placeholder="Entity type"
          className="w-40 px-3 py-2 bg-white border border-[#e1e4e8] rounded-lg text-sm text-[#1a1a2e] placeholder-[#6e6e7e] focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460]"
        />
        {(actionFilter || entityTypeFilter) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#0f3460] hover:text-[#c5a572] transition-colors"
          >
            <X size={14} />
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 size={20} className="animate-spin text-[#6e6e7e]" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-sm text-[#6e6e7e]">
            No audit log entries found
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#e1e4e8] bg-[#f8f9fa]">
                <th className="text-left px-4 py-3 font-medium text-[#6e6e7e]">Time</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e7e]">Actor</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e7e]">Action</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e7e]">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-[#6e6e7e]">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e4e8]">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-[#f8f9fa]">
                  <td className="px-4 py-3 text-[#6e6e7e] whitespace-nowrap">{formatDate(log.created_at)}</td>
                  <td className="px-4 py-3 text-[#1a1a2e]">{log.actor_email || 'system'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6e6e7e]">
                    {log.entity_type}
                    {log.entity_id && <span className="text-xs ml-1">({log.entity_id.slice(0, 8)}...)</span>}
                  </td>
                  <td className="px-4 py-3 text-[#6e6e7e] font-mono text-xs">{log.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#6e6e7e]">
            {pagination.total} entries, page {pagination.page} of {pagination.total_pages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 border border-[#e1e4e8] rounded-lg text-[#1a1a2e] hover:bg-[#f0f2f5] disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= pagination.total_pages}
              className="px-3 py-1.5 border border-[#e1e4e8] rounded-lg text-[#1a1a2e] hover:bg-[#f0f2f5] disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

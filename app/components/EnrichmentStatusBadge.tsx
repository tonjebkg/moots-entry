'use client'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Not Enriched', className: 'bg-gray-100 text-[#6e6e7e] border-gray-200' },
  IN_PROGRESS: { label: 'Enriching...', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Enriched', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  FAILED: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200' },
  STALE: { label: 'Stale', className: 'bg-amber-50 text-amber-700 border-amber-200' },
}

interface EnrichmentStatusBadgeProps {
  status: string
}

export function EnrichmentStatusBadge({ status }: EnrichmentStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${config.className}`}>
      {config.label}
    </span>
  )
}

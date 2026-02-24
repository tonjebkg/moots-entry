'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ScoringJobProgressProps {
  jobId: string
  type: 'scoring' | 'enrichment'
  onComplete: () => void
}

interface JobStatus {
  status: string
  total_contacts: number
  completed_count: number
  failed_count: number
  progress: number
  error_message: string | null
}

export function ScoringJobProgress({ jobId, type, onComplete }: ScoringJobProgressProps) {
  const [job, setJob] = useState<JobStatus | null>(null)

  useEffect(() => {
    const endpoint = type === 'scoring'
      ? `/api/scoring-jobs/${jobId}`
      : `/api/enrichment-jobs/${jobId}`

    const interval = setInterval(async () => {
      try {
        const res = await fetch(endpoint)
        if (res.ok) {
          const data = await res.json()
          setJob(data)

          if (data.status === 'COMPLETED' || data.status === 'FAILED') {
            clearInterval(interval)
            setTimeout(onComplete, 1000)
          }
        }
      } catch {}
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, type, onComplete])

  if (!job) {
    return (
      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span className="text-sm text-blue-700">Starting {type}...</span>
      </div>
    )
  }

  const isRunning = job.status === 'PENDING' || job.status === 'IN_PROGRESS'
  const isFailed = job.status === 'FAILED'
  const isComplete = job.status === 'COMPLETED'

  return (
    <div className={`p-4 rounded-lg border ${
      isFailed ? 'bg-red-50 border-red-200' :
      isComplete ? 'bg-emerald-50 border-emerald-200' :
      'bg-blue-50 border-blue-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRunning && <Loader2 size={14} className="animate-spin text-blue-600" />}
          <span className={`text-sm font-medium ${
            isFailed ? 'text-red-700' : isComplete ? 'text-emerald-700' : 'text-blue-700'
          }`}>
            {isComplete ? `${type === 'scoring' ? 'Scoring' : 'Enrichment'} complete` :
             isFailed ? `${type === 'scoring' ? 'Scoring' : 'Enrichment'} failed` :
             `${type === 'scoring' ? 'Scoring' : 'Enriching'} contacts...`}
          </span>
        </div>
        <span className="text-xs text-[#6e6e7e]">
          {job.completed_count}/{job.total_contacts}
          {job.failed_count > 0 && ` (${job.failed_count} failed)`}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
          style={{ width: `${job.progress}%` }}
        />
      </div>

      {job.error_message && (
        <p className="text-xs text-red-600 mt-2">{job.error_message}</p>
      )}
    </div>
  )
}

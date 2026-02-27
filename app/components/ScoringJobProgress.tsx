'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { AgentThinking, THINKING_STEPS } from './ui/AgentThinking'
import { AgentAvatar } from './ui/AgentAvatar'

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
            setTimeout(onComplete, 1500)
          }
        }
      } catch {}
    }, 2000)

    return () => clearInterval(interval)
  }, [jobId, type, onComplete])

  if (!job) {
    return (
      <div className="flex items-center gap-3 p-4 bg-brand-cream border border-ui-border rounded-lg">
        <AgentAvatar size="sm" />
        <AgentThinking
          steps={type === 'scoring'
            ? THINKING_STEPS.scoring()
            : THINKING_STEPS.enrichment()
          }
          intervalMs={2500}
        />
      </div>
    )
  }

  const isRunning = job.status === 'PENDING' || job.status === 'IN_PROGRESS'
  const isFailed = job.status === 'FAILED'
  const isComplete = job.status === 'COMPLETED'

  const steps = type === 'scoring'
    ? THINKING_STEPS.scoring(job.total_contacts)
    : THINKING_STEPS.enrichment(job.total_contacts)

  return (
    <div className={`p-4 rounded-lg border ${
      isFailed ? 'bg-red-50 border-red-200' :
      isComplete ? 'bg-emerald-50 border-emerald-200' :
      'bg-brand-cream border-ui-border'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <AgentAvatar size="sm" />
          {isRunning && (
            <AgentThinking steps={steps} intervalMs={3000} />
          )}
          {isComplete && (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">
                {type === 'scoring'
                  ? `Scored ${job.completed_count} contacts`
                  : `Enriched ${job.completed_count} profiles`}
                {job.failed_count > 0 && ` · ${job.failed_count} need attention`}
              </span>
            </div>
          )}
          {isFailed && (
            <span className="text-sm font-medium text-red-700">
              {type === 'scoring' ? 'Scoring' : 'Enrichment'} encountered errors
            </span>
          )}
        </div>
        <span className="text-xs text-ui-tertiary font-medium">
          {job.completed_count}/{job.total_contacts}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden mt-1">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-500' : isComplete ? 'bg-emerald-500' : 'bg-brand-terracotta'
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

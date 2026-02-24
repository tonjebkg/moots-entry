interface ScoreBarProps {
  score: number
  maxScore?: number
  width?: number
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-brand-forest'
  if (score >= 60) return 'bg-brand-terracotta'
  if (score >= 40) return 'bg-brand-gold'
  return 'bg-ui-tertiary'
}

export function ScoreBar({ score, maxScore = 100, width = 80 }: ScoreBarProps) {
  const pct = Math.min(100, (score / maxScore) * 100)

  return (
    <div className="flex items-center gap-2">
      <div className="bg-brand-cream rounded-full overflow-hidden" style={{ width, height: 6 }}>
        <div
          className={`h-full rounded-full transition-all ${getScoreColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-brand-charcoal tabular-nums w-6 text-right">{score}</span>
    </div>
  )
}

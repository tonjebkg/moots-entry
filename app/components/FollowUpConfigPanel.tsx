'use client'

import { useState } from 'react'
import { Sparkles, Send } from 'lucide-react'

interface FollowUpConfigPanelProps {
  eventId: string
  onTriggered: () => void
}

export function FollowUpConfigPanel({ eventId, onTriggered }: FollowUpConfigPanelProps) {
  const [autoGenerate, setAutoGenerate] = useState(true)
  const [subjectTemplate, setSubjectTemplate] = useState('')
  const [contentTemplate, setContentTemplate] = useState('')
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null)

  async function handleTrigger() {
    setError('')
    setResult(null)
    setTriggering(true)
    try {
      const res = await fetch(`/api/events/${eventId}/follow-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_generate: autoGenerate,
          subject_template: subjectTemplate || undefined,
          content_template: contentTemplate || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      const data = await res.json()
      setResult(data)
      onTriggered()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTriggering(false)
    }
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg p-6">
      <h3 className="text-sm font-semibold text-brand-charcoal mb-4">Generate Follow-ups</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          Created {result.created} follow-ups. {result.skipped > 0 ? `${result.skipped} already existed.` : ''}
        </div>
      )}

      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoGenerate}
            onChange={(e) => setAutoGenerate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-ui-secondary">
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-brand-terracotta" />
            AI-personalize each follow-up
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">Subject Template (optional)</label>
          <input
            type="text"
            value={subjectTemplate}
            onChange={(e) => setSubjectTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            placeholder="AI will generate if left empty"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">Content Template (optional)</label>
          <textarea
            value={contentTemplate}
            onChange={(e) => setContentTemplate(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none"
            placeholder="AI will personalize based on guest profile if left empty"
          />
        </div>

        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {triggering ? (
            <>
              <Sparkles className="w-4 h-4 animate-pulse" />
              Generating...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Generate Follow-ups for All Scored Contacts
            </>
          )}
        </button>

        <p className="text-xs text-ui-tertiary">
          This will create follow-up drafts for all scored contacts. You can review and send them individually.
        </p>
      </div>
    </div>
  )
}

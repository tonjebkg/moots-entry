'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

interface BroadcastComposerProps {
  eventId: string
  onSent: () => void
}

export function BroadcastComposer({ eventId, onSent }: BroadcastComposerProps) {
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSaveDraft() {
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
      setSubject('')
      setContent('')
      onSent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSendNow() {
    setError('')
    setSending(true)
    try {
      // Create and immediately send
      const createRes = await fetch(`/api/events/${eventId}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content }),
      })
      if (!createRes.ok) throw new Error((await createRes.json()).error || 'Failed to create')
      const broadcast = await createRes.json()

      const sendRes = await fetch(`/api/events/${eventId}/broadcast/${broadcast.id}/send`, {
        method: 'POST',
      })
      if (!sendRes.ok) throw new Error((await sendRes.json()).error || 'Failed to send')

      setSubject('')
      setContent('')
      onSent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg p-6">
      <h3 className="text-sm font-semibold text-brand-charcoal mb-4">Compose Broadcast</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
            placeholder="Important update about..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-charcoal mb-1">Message</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none"
            placeholder="Write your message to all confirmed guests..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ui-tertiary">
            Sent to all confirmed/accepted guests via email.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving || !subject || !content}
              className="px-4 py-2 text-sm font-medium text-ui-secondary border border-ui-border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              onClick={handleSendNow}
              disabled={sending || !subject || !content}
              className="flex items-center gap-2 px-4 py-2 bg-brand-forest hover:bg-brand-forest/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

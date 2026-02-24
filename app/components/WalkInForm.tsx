'use client'

import { useState } from 'react'
import { X, UserPlus } from 'lucide-react'

interface WalkInFormProps {
  eventId: string
  onClose: () => void
  onSuccess: () => void
}

export function WalkInForm({ eventId, onClose, onSuccess }: WalkInFormProps) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    company: '',
    title: '',
    phone: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/events/${eventId}/checkin/walk-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email || null,
          company: form.company || null,
          title: form.title || null,
          phone: form.phone || null,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register walk-in')
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e1e4e8]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#B8755E]" />
            <h3 className="text-lg font-semibold text-[#1a1a2e]">Walk-in Registration</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#6e6e7e]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
              placeholder="jane@company.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
                placeholder="Acme Inc"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
                placeholder="VP Engineering"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
              placeholder="+1 555 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E] resize-none"
              placeholder="How they heard about the event..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-[#6e6e7e] hover:text-[#1a1a2e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !form.full_name}
              className="px-6 py-2 bg-[#B8755E] hover:bg-[#a06650] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? 'Registering...' : 'Register Walk-in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

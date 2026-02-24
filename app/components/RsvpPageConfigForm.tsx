'use client'

import { useState } from 'react'
import type { RsvpPage } from '@/types/phase3'

interface RsvpPageConfigFormProps {
  eventId: string
  page: RsvpPage | null
  onSave: () => void
}

export function RsvpPageConfigForm({ eventId, page, onSave }: RsvpPageConfigFormProps) {
  const [form, setForm] = useState({
    slug: page?.slug || '',
    headline: page?.headline || "You're Invited",
    description: page?.description || '',
    accent_color: page?.accent_color || '#B8755E',
    show_location: page?.show_location ?? true,
    show_date: page?.show_date ?? true,
    show_capacity: page?.show_capacity ?? false,
    access_code: page?.access_code || '',
    max_submissions: page?.max_submissions || '',
    is_active: page?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      const method = page ? 'PATCH' : 'POST'
      const body: Record<string, unknown> = {
        slug: form.slug,
        headline: form.headline,
        description: form.description || null,
        accent_color: form.accent_color,
        show_location: form.show_location,
        show_date: form.show_date,
        show_capacity: form.show_capacity,
        access_code: form.access_code || null,
        max_submissions: form.max_submissions ? parseInt(String(form.max_submissions)) : null,
      }

      if (page) {
        body.is_active = form.is_active
      }

      const res = await fetch(`/api/events/${eventId}/rsvp-page`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      onSave()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
          URL Slug *
        </label>
        <div className="flex items-center gap-1">
          <span className="text-sm text-[#6e6e7e]">/e/</span>
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            className="flex-1 px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
            placeholder="my-event-2025"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Headline</label>
        <input
          type="text"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E] resize-none"
          placeholder="Tell guests about this event..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Accent Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="w-10 h-10 rounded border border-[#e1e4e8] cursor-pointer"
            />
            <input
              type="text"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="flex-1 px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Max Submissions</label>
          <input
            type="number"
            value={form.max_submissions}
            onChange={(e) => setForm({ ...form, max_submissions: e.target.value })}
            className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
            placeholder="Unlimited"
            min="1"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Access Code (optional)</label>
        <input
          type="text"
          value={form.access_code}
          onChange={(e) => setForm({ ...form, access_code: e.target.value })}
          className="w-full px-3 py-2 border border-[#e1e4e8] rounded-lg text-sm focus:outline-none focus:border-[#B8755E] focus:ring-1 focus:ring-[#B8755E]"
          placeholder="Leave empty for public access"
        />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.show_date} onChange={(e) => setForm({ ...form, show_date: e.target.checked })} className="rounded border-gray-300" />
          <span className="text-sm text-[#4a4a5e]">Show event date</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.show_location} onChange={(e) => setForm({ ...form, show_location: e.target.checked })} className="rounded border-gray-300" />
          <span className="text-sm text-[#4a4a5e]">Show event location</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.show_capacity} onChange={(e) => setForm({ ...form, show_capacity: e.target.checked })} className="rounded border-gray-300" />
          <span className="text-sm text-[#4a4a5e]">Show remaining capacity</span>
        </label>
        {page && (
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded border-gray-300" />
            <span className="text-sm text-[#4a4a5e]">Page is active (accepting submissions)</span>
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={saving || !form.slug}
        className="w-full py-2.5 bg-[#2F4F3F] hover:bg-[#1a3a2a] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : page ? 'Update RSVP Page' : 'Create RSVP Page'}
      </button>
    </form>
  )
}

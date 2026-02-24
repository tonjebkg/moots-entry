'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, MapPin, Check } from 'lucide-react'

interface RsvpPageData {
  id: string
  slug: string
  headline: string
  description: string | null
  hero_image_url: string | null
  accent_color: string
  show_location: boolean
  show_date: boolean
  show_capacity: boolean
  custom_fields: { id: string; label: string; type: string; required: boolean; options?: string[]; placeholder?: string }[]
  has_access_code: boolean
  event_title: string
  event_description: string | null
  start_time: string | null
  end_time: string | null
  timezone: string | null
  location: any
  is_full: boolean
}

export default function PublicRsvpPage() {
  const params = useParams()
  const slug = params.slug as string
  const [pageData, setPageData] = useState<RsvpPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    company: '',
    title: '',
    phone: '',
    plus_ones: 0,
    notes: '',
    access_code: '',
    custom_responses: {} as Record<string, unknown>,
  })

  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(`/api/public/rsvp/${slug}`)
        if (res.ok) {
          setPageData(await res.json())
        } else {
          const data = await res.json()
          setError(data.error || 'Page not found')
        }
      } catch {
        setError('Failed to load page')
      } finally {
        setLoading(false)
      }
    }
    fetchPage()
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pageData) return
    setFormError('')
    setSubmitting(true)

    try {
      const res = await fetch(`/api/public/rsvp/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          email: form.email,
          company: form.company || null,
          title: form.title || null,
          phone: form.phone || null,
          plus_ones: form.plus_ones,
          notes: form.notes || null,
          access_code: form.access_code || undefined,
          custom_responses: form.custom_responses,
        }),
      })

      if (res.ok) {
        setSubmitted(true)
      } else {
        const data = await res.json()
        setFormError(data.error || 'Submission failed')
      }
    } catch {
      setFormError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#6e6e7e] text-sm">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2">Page Not Found</h1>
          <p className="text-[#6e6e7e]">{error}</p>
        </div>
      </div>
    )
  }

  if (!pageData) return null

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-[#e1e4e8] p-10 text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: pageData.accent_color + '20' }}>
            <Check className="w-8 h-8" style={{ color: pageData.accent_color }} />
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            You&apos;re In!
          </h1>
          <p className="text-[#4a4a5e]">
            Your RSVP for <strong>{pageData.event_title}</strong> has been received. Check your email for confirmation.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12">
      <div className="max-w-lg w-full">
        {pageData.hero_image_url && (
          <img
            src={pageData.hero_image_url}
            alt=""
            className="w-full h-48 object-cover rounded-t-2xl"
          />
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-[#e1e4e8] p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              {pageData.headline}
            </h1>
            <p className="text-lg text-[#4a4a5e] font-medium">{pageData.event_title}</p>
            {pageData.description && (
              <p className="text-sm text-[#6e6e7e] mt-2">{pageData.description}</p>
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-2 mb-8">
            {pageData.show_date && pageData.start_time && (
              <div className="flex items-center gap-3 text-sm text-[#4a4a5e]">
                <Calendar className="w-4 h-4 text-[#6e6e7e]" />
                <span>{new Date(pageData.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
            )}
            {pageData.show_location && pageData.location && (
              <div className="flex items-center gap-3 text-sm text-[#4a4a5e]">
                <MapPin className="w-4 h-4 text-[#6e6e7e]" />
                <span>{typeof pageData.location === 'object' ? pageData.location.venue_name || pageData.location.address : pageData.location}</span>
              </div>
            )}
          </div>

          {pageData.is_full ? (
            <div className="text-center py-8">
              <p className="text-lg font-medium text-[#1a1a2e]">This event is at capacity</p>
              <p className="text-sm text-[#6e6e7e] mt-1">RSVPs are no longer being accepted.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              {pageData.has_access_code && (
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Access Code *</label>
                  <input
                    type="text"
                    required
                    value={form.access_code}
                    onChange={(e) => setForm({ ...form, access_code: e.target.value })}
                    className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': pageData.accent_color } as any}
                    placeholder="Enter access code"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': pageData.accent_color } as any}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': pageData.accent_color } as any}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Company</label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': pageData.accent_color } as any}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ '--tw-ring-color': pageData.accent_color } as any}
                  />
                </div>
              </div>

              {/* Custom Fields */}
              {pageData.custom_fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-[#1a1a2e] mb-1">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'text' && (
                    <input
                      type="text"
                      required={field.required}
                      value={(form.custom_responses[field.id] as string) || ''}
                      onChange={(e) => setForm({ ...form, custom_responses: { ...form.custom_responses, [field.id]: e.target.value } })}
                      className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': pageData.accent_color } as any}
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      required={field.required}
                      value={(form.custom_responses[field.id] as string) || ''}
                      onChange={(e) => setForm({ ...form, custom_responses: { ...form.custom_responses, [field.id]: e.target.value } })}
                      rows={3}
                      className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                      style={{ '--tw-ring-color': pageData.accent_color } as any}
                      placeholder={field.placeholder}
                    />
                  )}
                  {field.type === 'select' && (
                    <select
                      required={field.required}
                      value={(form.custom_responses[field.id] as string) || ''}
                      onChange={(e) => setForm({ ...form, custom_responses: { ...form.custom_responses, [field.id]: e.target.value } })}
                      className="w-full px-4 py-3 border border-[#e1e4e8] rounded-xl text-sm focus:outline-none focus:ring-2"
                      style={{ '--tw-ring-color': pageData.accent_color } as any}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        checked={!!form.custom_responses[field.id]}
                        onChange={(e) => setForm({ ...form, custom_responses: { ...form.custom_responses, [field.id]: e.target.checked } })}
                        className="rounded"
                      />
                      <span className="text-sm text-[#4a4a5e]">{field.placeholder || field.label}</span>
                    </label>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 text-white text-sm font-semibold rounded-xl transition-opacity disabled:opacity-50"
                style={{ backgroundColor: pageData.accent_color }}
              >
                {submitting ? 'Submitting...' : 'RSVP Now'}
              </button>
            </form>
          )}

          <div className="mt-8 text-center">
            <p className="text-xs text-[#6e6e7e]">Powered by <strong>Moots</strong></p>
          </div>
        </div>
      </div>
    </div>
  )
}

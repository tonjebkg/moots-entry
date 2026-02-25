'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Save, UserPlus } from 'lucide-react'
import { DashboardHeader } from '@/app/components/DashboardHeader'

export default function NewContactPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    company: '',
    title: '',
    role_seniority: '',
    industry: '',
    linkedin_url: '',
    tags: '',
    internal_notes: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.first_name.trim() && !form.last_name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const fullName = [form.first_name, form.last_name].filter(Boolean).join(' ')
      const emails = form.email ? [{ email: form.email, label: 'work' }] : []
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []

      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          first_name: form.first_name || undefined,
          last_name: form.last_name || undefined,
          emails,
          phones: [],
          board_affiliations: [],
          company: form.company || undefined,
          title: form.title || undefined,
          role_seniority: form.role_seniority || undefined,
          industry: form.industry || undefined,
          linkedin_url: form.linkedin_url || undefined,
          tags,
          internal_notes: form.internal_notes || undefined,
          source: 'MANUAL',
        }),
      })

      if (res.ok) {
        router.push('/dashboard/people')
      } else {
        const data = await res.json()
        if (res.status === 409) {
          setError(`Duplicate contact: ${data.duplicate?.full_name || 'already exists'}`)
        } else {
          setError(data.error || 'Failed to create contact')
        }
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta placeholder:text-ui-tertiary/60'
  const labelClass = 'block text-xs font-semibold text-ui-tertiary uppercase tracking-wide mb-1.5'

  return (
    <main className="min-h-screen bg-brand-cream">
      <DashboardHeader activeNav="people" />
      <div className="pt-[73px]">
        <div className="max-w-2xl mx-auto p-8">
          <Link
            href="/dashboard/people"
            className="inline-flex items-center gap-1.5 text-sm text-ui-tertiary hover:text-brand-terracotta transition-colors mb-6 font-medium"
          >
            <ChevronLeft size={16} />
            Back to People
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-lg bg-brand-terracotta/10 flex items-center justify-center">
              <UserPlus size={20} className="text-brand-terracotta" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-brand-charcoal">Add Contact</h1>
              <p className="text-sm text-ui-tertiary">Add a new contact to your People Database</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="bg-white rounded-card shadow-card border border-ui-border p-6 space-y-4">
              <h3 className="font-display text-sm font-semibold text-brand-charcoal">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>First Name</label>
                  <input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="Jonathan" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Last Name</label>
                  <input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Reeves" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="jonathan@reevescapital.com" className={inputClass} />
              </div>
            </div>

            {/* Professional */}
            <div className="bg-white rounded-card shadow-card border border-ui-border p-6 space-y-4">
              <h3 className="font-display text-sm font-semibold text-brand-charcoal">Professional Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company</label>
                  <input value={form.company} onChange={e => update('company', e.target.value)} placeholder="Reeves Capital" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Title</label>
                  <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Founder & Chairman" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Seniority</label>
                  <select value={form.role_seniority} onChange={e => update('role_seniority', e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    <option value="C-Suite">C-Suite</option>
                    <option value="CEO">CEO</option>
                    <option value="Partner">Partner</option>
                    <option value="VP">VP</option>
                    <option value="Director">Director</option>
                    <option value="Manager">Manager</option>
                    <option value="Individual Contributor">Individual Contributor</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Industry</label>
                  <input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="Private Equity" className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input value={form.linkedin_url} onChange={e => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/jonathanreeves" className={inputClass} />
              </div>
            </div>

            {/* Tags & Notes */}
            <div className="bg-white rounded-card shadow-card border border-ui-border p-6 space-y-4">
              <h3 className="font-display text-sm font-semibold text-brand-charcoal">Tags & Notes</h3>
              <div>
                <label className={labelClass}>Tags (comma-separated)</label>
                <input value={form.tags} onChange={e => update('tags', e.target.value)} placeholder="PE, VIP, Founder" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Internal Notes</label>
                <textarea value={form.internal_notes} onChange={e => update('internal_notes', e.target.value)} placeholder="Any context about this contact..." rows={3} className={inputClass + ' resize-none'} />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/people" className="px-4 py-2.5 text-sm font-medium text-ui-secondary hover:text-brand-charcoal">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill shadow-cta transition-colors disabled:opacity-50"
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Contact'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

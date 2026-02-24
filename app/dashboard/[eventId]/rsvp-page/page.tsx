'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { RsvpPageConfigForm } from '@/app/components/RsvpPageConfigForm'
import { RsvpPagePreview } from '@/app/components/RsvpPagePreview'
import { EmbedCodeGenerator } from '@/app/components/EmbedCodeGenerator'
import type { RsvpPage } from '@/types/phase3'

export default function RsvpPageAdmin() {
  const params = useParams()
  const eventId = params.eventId as string
  const [page, setPage] = useState<RsvpPage | null>(null)
  const [loading, setLoading] = useState(true)

  async function fetchPage() {
    try {
      const res = await fetch(`/api/events/${eventId}/rsvp-page`)
      if (res.ok) {
        const data = await res.json()
        setPage(data.page)
      }
    } catch (err) {
      console.error('Failed to fetch RSVP page:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage()
  }, [eventId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-[#1a1a2e] tracking-tight">RSVP Page</h2>
        <p className="text-sm text-[#4a4a5e] mt-1">
          Create a public landing page where guests can RSVP to your event.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config Form */}
        <div className="bg-white border border-[#e1e4e8] rounded-lg p-6">
          <h3 className="text-sm font-semibold text-[#1a1a2e] mb-4">
            {page ? 'Edit Configuration' : 'Create RSVP Page'}
          </h3>
          <RsvpPageConfigForm
            eventId={eventId}
            page={page}
            onSave={fetchPage}
          />
        </div>

        {/* Preview + Embed */}
        <div className="space-y-6">
          {page && (
            <>
              <RsvpPagePreview page={page} />
              <EmbedCodeGenerator slug={page.slug} />

              {/* Submission Stats */}
              <div className="bg-white border border-[#e1e4e8] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[#1a1a2e] mb-3">Submissions</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="text-2xl font-bold text-green-700">{page.submission_count || 0}</div>
                    <div className="text-xs font-medium text-[#6e6e7e]">Total RSVPs</div>
                  </div>
                  <div className="bg-gray-50 border border-[#e1e4e8] rounded-lg p-3">
                    <div className="text-2xl font-bold text-[#1a1a2e]">
                      {page.max_submissions || '∞'}
                    </div>
                    <div className="text-xs font-medium text-[#6e6e7e]">Capacity</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${page.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs text-[#6e6e7e]">{page.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

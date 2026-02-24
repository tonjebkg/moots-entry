'use client'

import Image from 'next/image'
import type { RsvpPage } from '@/types/phase3'

interface RsvpPagePreviewProps {
  page: RsvpPage
}

export function RsvpPagePreview({ page }: RsvpPagePreviewProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ui-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-charcoal">Preview</h3>
        <a
          href={`/e/${page.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#B8755E] hover:underline"
        >
          Open in new tab
        </a>
      </div>
      <div className="p-6" style={{ backgroundColor: '#FAF9F7' }}>
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-ui-border p-8 text-center">
          {page.hero_image_url && (
            <Image src={page.hero_image_url} alt="" width={400} height={160} className="w-full h-40 object-cover rounded-lg mb-6" unoptimized />
          )}
          <h1 className="text-2xl font-bold text-brand-charcoal mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {page.headline}
          </h1>
          {page.description && (
            <p className="text-sm text-ui-secondary mb-6">{page.description}</p>
          )}
          <div className="space-y-3 text-left">
            <div className="h-10 bg-gray-50 rounded-lg border border-ui-border" />
            <div className="h-10 bg-gray-50 rounded-lg border border-ui-border" />
            <div className="h-10 bg-gray-50 rounded-lg border border-ui-border" />
          </div>
          <button
            className="w-full mt-6 py-3 text-white text-sm font-semibold rounded-lg"
            style={{ backgroundColor: page.accent_color }}
          >
            RSVP Now
          </button>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-ui-border bg-brand-cream">
        <div className="text-xs text-ui-tertiary">
          Public URL: <code className="bg-brand-cream px-1.5 py-0.5 rounded">{baseUrl}/e/{page.slug}</code>
        </div>
      </div>
    </div>
  )
}

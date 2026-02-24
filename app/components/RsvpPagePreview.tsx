'use client'

import type { RsvpPage } from '@/types/phase3'

interface RsvpPagePreviewProps {
  page: RsvpPage
}

export function RsvpPagePreview({ page }: RsvpPagePreviewProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="bg-white border border-[#e1e4e8] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#e1e4e8] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#1a1a2e]">Preview</h3>
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
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-[#e1e4e8] p-8 text-center">
          {page.hero_image_url && (
            <img src={page.hero_image_url} alt="" className="w-full h-40 object-cover rounded-lg mb-6" />
          )}
          <h1 className="text-2xl font-bold text-[#1a1a2e] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            {page.headline}
          </h1>
          {page.description && (
            <p className="text-sm text-[#4a4a5e] mb-6">{page.description}</p>
          )}
          <div className="space-y-3 text-left">
            <div className="h-10 bg-gray-50 rounded-lg border border-[#e1e4e8]" />
            <div className="h-10 bg-gray-50 rounded-lg border border-[#e1e4e8]" />
            <div className="h-10 bg-gray-50 rounded-lg border border-[#e1e4e8]" />
          </div>
          <button
            className="w-full mt-6 py-3 text-white text-sm font-semibold rounded-lg"
            style={{ backgroundColor: page.accent_color }}
          >
            RSVP Now
          </button>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[#e1e4e8] bg-[#f8f9fa]">
        <div className="text-xs text-[#6e6e7e]">
          Public URL: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{baseUrl}/e/{page.slug}</code>
        </div>
      </div>
    </div>
  )
}

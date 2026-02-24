'use client'

import { useState } from 'react'
import { Copy, Check, Link, Code } from 'lucide-react'

interface EmbedCodeGeneratorProps {
  slug: string
}

export function EmbedCodeGenerator({ slug }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const directUrl = `${baseUrl}/e/${slug}`
  const iframeCode = `<iframe src="${directUrl}" width="100%" height="700" frameborder="0" style="border:none;border-radius:12px;"></iframe>`

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-ui-border">
        <h3 className="text-sm font-semibold text-brand-charcoal">Share & Embed</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Direct Link */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link className="w-3.5 h-3.5 text-ui-tertiary" />
            <span className="text-xs font-medium text-ui-tertiary uppercase tracking-wide">Direct Link</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 border border-ui-border rounded-lg text-xs text-ui-secondary truncate">
              {directUrl}
            </code>
            <button
              onClick={() => copyToClipboard(directUrl, 'link')}
              className="px-3 py-2 border border-ui-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied === 'link' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-ui-tertiary" />
              )}
            </button>
          </div>
        </div>

        {/* Iframe Embed */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Code className="w-3.5 h-3.5 text-ui-tertiary" />
            <span className="text-xs font-medium text-ui-tertiary uppercase tracking-wide">Iframe Embed</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-gray-50 border border-ui-border rounded-lg text-xs text-ui-secondary truncate">
              {iframeCode}
            </code>
            <button
              onClick={() => copyToClipboard(iframeCode, 'iframe')}
              className="px-3 py-2 border border-ui-border rounded-lg hover:bg-gray-50 transition-colors"
            >
              {copied === 'iframe' ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-ui-tertiary" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

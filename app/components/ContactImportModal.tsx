'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, ArrowRight } from 'lucide-react'

interface ContactImportModalProps {
  onClose: () => void
  onSuccess: () => void
  events?: { id: number; title: string }[]
}

export function ContactImportModal({ onClose, onSuccess, events = [] }: ContactImportModalProps) {
  const [tab, setTab] = useState<'csv' | 'event'>('csv')
  const [file, setFile] = useState<File | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors?: unknown[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleCsvUpload() {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/contacts/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      setResult(data)
      setTimeout(() => onSuccess(), 1500)
    } catch (err: any) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleEventImport() {
    if (!selectedEventId) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/contacts/import-from-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: selectedEventId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Import failed')
        return
      }

      setResult(data)
      setTimeout(() => onSuccess(), 1500)
    } catch (err: any) {
      setError(err.message || 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-ui-border">
            <h2 className="text-lg font-semibold text-brand-charcoal">Import Contacts</h2>
            <button onClick={onClose} className="text-ui-tertiary hover:text-brand-charcoal">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-ui-border">
            <button
              onClick={() => setTab('csv')}
              className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 ${
                tab === 'csv' ? 'border-brand-terracotta text-brand-terracotta' : 'border-transparent text-ui-tertiary'
              }`}
            >
              <Upload size={14} className="inline mr-1.5" />
              CSV Upload
            </button>
            <button
              onClick={() => setTab('event')}
              className={`flex-1 px-4 py-3 text-sm font-semibold border-b-2 ${
                tab === 'event' ? 'border-brand-terracotta text-brand-terracotta' : 'border-transparent text-ui-tertiary'
              }`}
            >
              <ArrowRight size={14} className="inline mr-1.5" />
              From Event
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {result ? (
              <div className="text-center py-4">
                <div className="text-emerald-600 font-semibold text-lg mb-2">
                  Import Complete
                </div>
                <div className="text-sm text-ui-secondary">
                  {result.imported} imported, {result.skipped} skipped
                </div>
              </div>
            ) : tab === 'csv' ? (
              <>
                <div
                  className="border-2 border-dashed border-ui-border rounded-lg p-8 text-center cursor-pointer hover:border-brand-terracotta transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <FileText size={32} className="mx-auto mb-2 text-ui-tertiary" />
                  <div className="text-sm text-ui-secondary">
                    {file ? file.name : 'Click to select CSV file'}
                  </div>
                  <div className="text-xs text-ui-tertiary mt-1">
                    Required columns: full_name, email
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-brand-charcoal">Select Event</label>
                  <select
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-ui-border rounded-lg text-sm focus:outline-none focus:border-brand-terracotta"
                  >
                    <option value="">Choose an event...</option>
                    {events.map(e => (
                      <option key={e.id} value={e.id}>{e.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-ui-tertiary">
                    Import guests from campaign invitations into your People Database.
                  </p>
                </div>
                {error && <div className="text-sm text-red-600">{error}</div>}
              </>
            )}
          </div>

          {/* Footer */}
          {!result && (
            <div className="flex gap-3 p-6 border-t border-ui-border">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-ui-border rounded-lg text-sm font-medium text-ui-secondary hover:bg-brand-cream"
              >
                Cancel
              </button>
              <button
                onClick={tab === 'csv' ? handleCsvUpload : handleEventImport}
                disabled={loading || (tab === 'csv' ? !file : !selectedEventId)}
                className="flex-1 px-4 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Importing...' : 'Import'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

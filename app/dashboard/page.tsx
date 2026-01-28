'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardHomePage() {
  const router = useRouter()
  const [eventId, setEventId] = useState('')

  function handleNavigate(e: React.FormEvent) {
    e.preventDefault()
    if (eventId.trim()) {
      router.push(`/dashboard/${eventId.trim()}`)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto space-y-8 pt-16">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold">Moots Dashboard</h1>
          <p className="text-slate-400">
            Event operations dashboard - manage join requests, update event details, and track attendance.
          </p>
        </header>

        <section className="space-y-4">
          <div className="p-6 border border-slate-800 rounded-lg bg-slate-900/30 space-y-4">
            <h2 className="text-xl font-semibold">Navigate to an event</h2>
            <form onSubmit={handleNavigate} className="flex gap-3">
              <input
                type="text"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                placeholder="Enter event ID"
                className="flex-1 px-4 py-2 rounded border border-slate-700 bg-transparent focus:outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                className="px-6 py-2 rounded border border-slate-700 hover:bg-slate-800 transition-colors"
              >
                Go
              </button>
            </form>
            <p className="text-sm text-slate-500">
              Or navigate directly to: <code className="text-slate-300">/dashboard/[eventId]</code>
            </p>
          </div>

          <div className="p-6 border border-slate-800 rounded-lg bg-slate-900/30 space-y-3">
            <h2 className="text-xl font-semibold">Quick Links</h2>
            <ul className="space-y-2 text-slate-400">
              <li>
                • View event dashboard: <code className="text-slate-300">/dashboard/[eventId]</code>
              </li>
              <li>
                • Check-in interface: <code className="text-slate-300">/checkin/[eventId]</code>
              </li>
              <li>
                • QR scanner: <code className="text-slate-300">/checkin/[eventId]/scan</code>
              </li>
            </ul>
          </div>

          <div className="p-6 border border-slate-800 rounded-lg bg-slate-900/30 space-y-3">
            <h2 className="text-xl font-semibold">API Endpoints</h2>
            <ul className="space-y-2 text-sm text-slate-400 font-mono">
              <li>• GET /api/events/[eventId]</li>
              <li>• GET /api/events/[eventId]/join-requests</li>
              <li>• PATCH /api/join-requests/[id]</li>
              <li>• POST /api/events/create</li>
            </ul>
          </div>
        </section>

        <footer className="text-center text-sm text-slate-500 pt-8">
          <p>Moots Dashboard • Neon-backed event operations</p>
        </footer>
      </div>
    </main>
  )
}

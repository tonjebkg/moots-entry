'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function CheckinTabPage() {
  const params = useParams()
  const eventId = params.eventId as string

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Check-in Dashboard</h2>
        <p className="text-slate-400 mt-1">Manage event check-ins and view attendee status</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
        <div className="text-slate-400 text-5xl mb-4">✓</div>
        <h3 className="text-xl font-semibold text-slate-100 mb-3">Check-in Mode</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          For full check-in functionality, use the dedicated kiosk mode interface.
        </p>
        <Link
          href={`/checkin/${eventId}`}
          target="_blank"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          Open Kiosk Mode →
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">0</div>
            <div className="text-sm text-slate-400 mt-1">Checked In Today</div>
          </div>
          <div className="p-4 bg-slate-800 rounded-lg">
            <div className="text-2xl font-bold text-slate-100">0</div>
            <div className="text-sm text-slate-400 mt-1">Total Expected</div>
          </div>
        </div>
      </div>

      <div className="text-sm text-slate-500">
        Note: This is a preview of the check-in dashboard. For actual check-in operations,
        use the kiosk mode link above which provides a full-screen, touch-optimized interface.
      </div>
    </div>
  )
}

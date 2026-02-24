'use client'

import { useParams } from 'next/navigation'
import { CheckinDashboard } from '@/app/components/CheckinDashboard'

export default function CheckinTabPage() {
  const params = useParams()
  const eventId = params.eventId as string

  return <CheckinDashboard eventId={eventId} />
}

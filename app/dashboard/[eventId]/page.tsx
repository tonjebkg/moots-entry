import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ eventId: string }>
}

export default async function EventPage({ params }: PageProps) {
  const { eventId } = await params
  redirect(`/dashboard/${eventId}/overview`)
}

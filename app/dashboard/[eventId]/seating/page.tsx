import { redirect } from 'next/navigation'

type PageProps = {
  params: Promise<{ eventId: string }>
}

export default async function SeatingRedirectPage({ params }: PageProps) {
  const { eventId } = await params
  redirect(`/dashboard/${eventId}/day-of`)
}

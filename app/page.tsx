import Link from 'next/link'
import { listEvents } from '@/app/actions/events'
import CreateEventForm from '@/app/components/CreateEventForm'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const events = await listEvents()

  return (
    <main className="min-h-screen text-white">
      {/* Create new event */}
      <section className="mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-4xl font-semibold">
          Create an event. Start check-in. See results.
        </h1>
        <p className="mb-6 text-slate-400">
          No login for this MVP. Create an event below — it will appear on this page and link directly to its dashboard.
        </p>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-5">
          <CreateEventForm />
        </div>
      </section>

      {/* Recent events */}
      <section className="mx-auto max-w-5xl p-6">
        <h2 className="mb-3 text-xl font-semibold">Recent events</h2>

        {events.length === 0 ? (
          <p className="text-slate-400">
            No events yet. Create your first one above.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <article
                key={e.id}
                className="rounded-lg border border-slate-800 bg-black/30 p-4"
              >
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  {/* Title + Info */}
                  <div className="min-w-0">
                    <h3
                      className="line-clamp-2 text-base font-medium"
                      title={e.name}
                    >
                      {e.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 truncate">
                      {e.city ?? '—'} •{' '}
                      {e.starts_at
                        ? new Date(e.starts_at).toLocaleString()
                        : 'Date TBA'}{' '}
                      • {e.timezone ?? '—'}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Cap {e.capacity ?? 0}
                    </p>
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/dashboard/${e.id}`}
                    className="shrink-0 whitespace-nowrap rounded border px-3 py-1.5 text-sm hover:bg-slate-900"
                  >
                    Open
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

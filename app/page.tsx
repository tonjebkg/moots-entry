import CreateEventForm from '@/app/components/CreateEventForm';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

async function listEvents() {
  // Server-side fetch of recent events
  const { data } = await supabase
    .from('events')
    .select('id,name,city,starts_at,timezone,capacity')
    .order('created_at', { ascending: false })
    .limit(12);
  return data ?? [];
}

export default async function Home() {
  const events = await listEvents();

  return (
    <main className="min-h-screen text-white">
      <section className="mx-auto max-w-4xl p-6">
        <h1 className="mb-2 text-4xl font-semibold">Create an event. Start check-in. See results.</h1>
        <p className="mb-6 text-slate-400">
          No login for this MVP. Create an event below — it will appear on this page and link directly to its dashboard.
        </p>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-5">
          <CreateEventForm />
        </div>
      </section>

      {/* Recent events */}
      <section className="mx-auto max-w-5xl p-6">
        <h2 className="mb-3 text-lg font-semibold">Recent events</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-white/60">No events yet. Create your first one above.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e: any) => (
              <article
                key={e.id}
                className="rounded-lg border border-slate-800 bg-black/20 p-4"
              >
                {/* header: title + CTA that never wraps */}
                <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                  <h3 className="min-w-0 line-clamp-2 text-base font-medium" title={e.name}>
                    {e.name}
                  </h3>
                  <Link
                    href={`/dashboard/${e.id}`}
                    className="shrink-0 whitespace-nowrap rounded border px-3 py-1.5 text-sm hover:bg-slate-900"
                  >
                    Open
                  </Link>
                </div>

                <p className="mt-1 text-xs text-white/60 truncate">
                  {(e.city || '—')}{' · '}
                  {e.starts_at ? new Date(e.starts_at).toLocaleString() : 'Date TBA'}{' · '}
                  {e.timezone || '—'}
                </p>
                <p className="mt-1 text-xs text-white/60">
                  {typeof e.capacity === 'number' ? `Cap ${e.capacity}` : ''}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

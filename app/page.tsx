// app/page.tsx
import Link from 'next/link';
import { Inter } from 'next/font/google';
import { createEvent, listEvents } from './actions/events';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Moots Entry — MVP',
  description: 'Create an event, check in guests, scan badges, see live dashboard.',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] p-5 ${className}`}>
      {children}
    </div>
  );
}

export default async function Home() {
  const events = await listEvents();

  return (
    <main className={`${inter.className} min-h-screen bg-black text-white`}>
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white" />
            <span className="text-lg font-semibold tracking-tight">
              Moots <span className="text-white/60">Entry</span>
            </span>
          </div>
          <Link href="https://moots.ai" className="text-sm text-white/60 hover:text-white transition">
            Help
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
          Create an event. Start check-in. See results.
        </h1>
        <p className="mt-4 text-white/70 max-w-2xl">
          No login for this MVP. Create an event below — it will appear on this page and link
          directly to its dashboard.
        </p>

        {/* Create Event */}
        <Card className="mt-8">
          <h2 className="text-lg font-semibold">Create a new event</h2>
          <form action={createEvent} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm text-white/70">Event name *</label>
              <input
                name="name"
                required
                placeholder="YC Health & Longevity Lunch"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">City</label>
              <input
                name="city"
                placeholder="San Francisco"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">Starts at</label>
              <input
                type="datetime-local"
                name="starts_at"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">Capacity</label>
              <input
                type="number"
                name="capacity"
                min={0}
                placeholder="130"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70">Timezone</label>
              <input
                name="timezone"
                placeholder="America/Los_Angeles"
                defaultValue="America/Los_Angeles"
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/20"
              />
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full sm:w-auto rounded-xl bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
              >
                Create event
              </button>
            </div>
          </form>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/entry" className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.04] transition">
            <div className="text-base font-semibold">Entry Desk</div>
            <p className="mt-1 text-sm text-white/60">Walk-ins & VIPs.</p>
          </Link>
          <Link href="/test" className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.04] transition">
            <div className="text-base font-semibold">Test Page</div>
            <p className="mt-1 text-sm text-white/60">Internal sandbox.</p>
          </Link>
        </div>

        {/* Latest Events */}
        <h2 className="mt-10 text-lg font-semibold">Recent events</h2>
        {events.length === 0 ? (
          <p className="mt-3 text-white/60">No events yet. Create your first one above.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/${e.id}`}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.04] transition"
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">{e.name}</div>
                  <div className="text-xs text-white/50">Open dashboard →</div>
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {e.city ? `${e.city} • ` : ''}{e.timezone || '—'}
                </div>
                <div className="mt-1 text-sm text-white/60">
                  {e.starts_at ? new Date(e.starts_at).toLocaleString() : 'Date TBA'}
                  {typeof e.capacity === 'number' ? ` • Cap ${e.capacity}` : ''}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/50">
          © {new Date().getFullYear()} Moots. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

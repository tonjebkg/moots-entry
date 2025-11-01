// app/page.tsx
import Link from "next/link";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Moots Entry — Event Check-in & Scanning",
  description:
    "Ultra-fast guest check-in, badge/QR scanning, and a simple dashboard for hosts.",
};

type Action = {
  title: string;
  href: string;
  kbd?: string;
  desc: string;
};

const EVENT_ID = "moots-ai-test"; // change to your real event id

const actions: Action[] = [
  {
    title: "Open Check-in",
    href: `/checkin/${EVENT_ID}`,
    kbd: "C",
    desc: "Search guests, mark as arrived, print badges.",
  },
  {
    title: "Scan Badges / QR",
    href: `/checkin/${EVENT_ID}/scan`,
    kbd: "S",
    desc: "Use camera to scan attendee QR codes.",
  },
  {
    title: "Entry Desk",
    href: "/entry",
    kbd: "E",
    desc: "Fast manual entry for walk-ins & VIPs.",
  },
  {
    title: "Event Dashboard",
    href: `/dashboard/${EVENT_ID}`,
    kbd: "D",
    desc: "Live totals, capacity, arrivals timeline.",
  },
];

export default function Home() {
  return (
    <main className={`${inter.className} min-h-screen bg-black text-white`}>
      {/* Top Bar */}
      <header className="border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white" />
            <span className="text-lg font-semibold tracking-tight">
              Moots <span className="text-white/60">Entry</span>
            </span>
          </div>
          <Link
            href="https://moots.ai"
            className="text-sm text-white/60 hover:text-white transition"
          >
            Need help?
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="py-16 md:py-20">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Check-in that feels instant.<br className="hidden md:block" />
            Scanning that never slows the line.
          </h1>
          <p className="mt-4 text-white/70 max-w-2xl">
            Bring guests in fast, capture who arrived, and keep the room moving.
            Your team sees live counts, capacity, and scans in one place.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/checkin/${EVENT_ID}`}
              className="rounded-xl bg-white text-black px-5 py-3 text-sm font-medium hover:bg-white/90 transition"
            >
              Start Check-in
            </Link>
            <Link
              href={`/dashboard/${EVENT_ID}`}
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-medium hover:bg-white/5 transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Action Grid */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {actions.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:border-white/20 hover:bg-white/[0.04] transition"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{a.title}</h3>
                {a.kbd ? (
                  <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 text-xs text-white/60 group-hover:border-white/20">
                    {a.kbd}
                  </kbd>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-white/60">{a.desc}</p>
            </Link>
          ))}
        </div>

        {/* Event summary (static example; wire to your data later) */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-sm text-white/60">Event</div>
              <div className="font-medium">Moots AI Test</div>
            </div>
            <div>
              <div className="text-sm text-white/60">City</div>
              <div className="font-medium">New York</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Capacity</div>
              <div className="font-medium">130</div>
            </div>
            <div>
              <div className="text-sm text-white/60">Timezone</div>
              <div className="font-medium">America/Los_Angeles</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-white/50">
          © {new Date().getFullYear()} Moots. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

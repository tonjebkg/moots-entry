'use client'

import CreateEventForm from '@/app/components/CreateEventForm'

export default function EntryPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Create an event</h1>
      </header>

      <section className="rounded-xl border border-slate-800 bg-black/40 p-5">
        <CreateEventForm />
      </section>
    </main>
  )
}
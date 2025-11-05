'use client';

import { useState } from 'react';
import { createEvent } from '@/app/actions/events';

export default function CreateEventForm() {
  const [pending, setPending] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  return (
    <form
      className="space-y-4"
      action={async (formData) => {
        setPending(true);
        if (csvFile) formData.set('guest_csv', csvFile); // pass file along
        try {
          await createEvent(formData); // server action already redirects to dashboard
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-slate-400">Event name *</span>
          <input name="name" required className="mt-1 w-full rounded border bg-transparent p-2" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">City</span>
          <input name="city" className="mt-1 w-full rounded border bg-transparent p-2" />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Starts at</span>
          <input
            name="starts_at"
            placeholder="dd/mm/yyyy, --:--"
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Timezone</span>
          <input
            name="timezone"
            defaultValue="America/Los_Angeles"
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">Capacity</span>
          <input
            name="capacity"
            type="number"
            min={0}
            defaultValue={120}
            className="mt-1 w-full rounded border bg-transparent p-2"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Event link (Luma, Eventbrite, etc.)</span>
          <input name="event_link" className="mt-1 w-full rounded border bg-transparent p-2" />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-slate-400">Host name</span>
          <input name="host_name" className="mt-1 w-full rounded border bg-transparent p-2" />
        </label>
        <label className="block">
          <span className="text-sm text-slate-400">Host website / link</span>
          <input name="host_link" className="mt-1 w-full rounded border bg-transparent p-2" />
        </label>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm text-slate-400">Event image (optional)</span>
          <input name="image_file" type="file" accept="image/*" className="mt-1 w-full" />
        </label>

        <label className="block">
          <span className="text-sm text-slate-400">
            Guest list (.csv or .txt)
          </span>
          <input
            type="file"
            accept=".csv,.txt"
            className="mt-1 w-full"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
          />
          <span className="mt-1 block text-xs text-slate-500">
            Required columns: <code>full_name</code> (or <code>name/Full Name</code>) and{' '}
            <code>email</code>. We auto-detect headers and ignore empty rows.
          </span>
        </label>
      </div>

      <button
        disabled={pending}
        className="rounded border px-4 py-2 hover:bg-slate-900 disabled:opacity-60"
      >
        {pending ? 'Creating…' : 'Create event'}
      </button>
    </form>
  );
}

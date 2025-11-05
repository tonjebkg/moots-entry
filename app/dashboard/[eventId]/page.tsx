'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

type Status = 'invited' | 'confirmed' | 'waitlist' | 'cancelled' | 'checked_in';

type Guest = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  status: Status;
  plus_ones: number | null;
};

type EventRow = {
  id: string;
  name: string;
  city: string | null;
  starts_at: string;
  timezone: string | null;
  capacity: number | null;
};

const STATUS_LABEL: Record<Status, string> = {
  invited: 'Invited',
  confirmed: 'Confirmed',
  waitlist: 'Waitlist',
  cancelled: 'Cancelled',
  checked_in: 'Checked-in',
};

const STATUS_BG: Record<Status, string> = {
  invited: 'bg-slate-700 text-slate-100',
  confirmed: 'bg-blue-700 text-white',
  waitlist: 'bg-amber-700 text-white',
  cancelled: 'bg-red-700 text-white',
  checked_in: 'bg-green-700 text-white',
};

export default function DashboardPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'plus_ones'>('name');

  useEffect(() => {
    if (!eventId) return;
    (async () => {
      const { data: ev } = await supabase
        .from('events')
        .select('id,name,city,starts_at,timezone,capacity')
        .eq('id', eventId)
        .single();
      setEvent(ev);

      const { data: gs } = await supabase
        .from('guests')
        .select('id,event_id,full_name,email,status,plus_ones')
        .eq('event_id', eventId);
      setGuests(gs ?? []);
    })();
  }, [eventId]);

  // ---- Derived totals (including plus ones)
  const totals = useMemo(() => {
    const base = {
      invited: 0,
      confirmed: 0,
      waitlist: 0,
      cancelled: 0,
      checked_in: 0,
    };

    for (const g of guests) {
      const plus = typeof g.plus_ones === 'number' ? Math.max(0, g.plus_ones) : 0;
      base[g.status] += 1 + plus;
    }

    const confirmedHeadcount = base.confirmed;
    const checkedInHeadcount = base.checked_in;

    return {
      ...base,
      all: guests.length,
      confirmedHeadcount,
      checkedInHeadcount,
    };
  }, [guests]);

  // ---- Sorting logic
  const sortedGuests = useMemo(() => {
    const copy = [...guests];
    switch (sortKey) {
      case 'status':
        return copy.sort((a, b) =>
          STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status])
        );
      case 'plus_ones':
        return copy.sort(
          (a, b) => (b.plus_ones ?? 0) - (a.plus_ones ?? 0)
        );
      default:
        return copy.sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        );
    }
  }, [guests, sortKey]);

  async function handleStatusChange(g: Guest, next: Status) {
    const { error } = await supabase
      .from('guests')
      .update({ status: next })
      .eq('id', g.id);
    if (error) setMessage('Failed to update status');
    else
      setGuests((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, status: next } : x))
      );
  }

  async function handlePlusOnes(g: Guest, delta: 1 | -1) {
    const next = Math.max(0, (g.plus_ones ?? 0) + delta);
    const { error } = await supabase
      .from('guests')
      .update({ plus_ones: next })
      .eq('id', g.id);
    if (error) setMessage('Failed to update plus-ones');
    else
      setGuests((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, plus_ones: next } : x))
      );
  }

  if (!event) return <main className="p-6 text-white">Loading...</main>;

  return (
    <main className="p-6 text-white max-w-6xl mx-auto space-y-6">
      {/* HEADER */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold leading-tight truncate" title={event.name}>
            {event.name}
          </h1>
          <p className="text-sm text-slate-400 truncate">
            {event.city ?? '—'} ·{' '}
            {new Date(event.starts_at).toLocaleString()} ·{' '}
            {event.timezone ?? '—'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900"
          >
            New Event
          </Link>
          <label className="whitespace-nowrap px-4 py-2 rounded border cursor-pointer hover:bg-slate-900">
            Re-upload CSV
            <input type="file" accept=".csv,.txt" className="hidden" />
          </label>
          <Link
            href={`/checkin/${event.id}`}
            className="whitespace-nowrap px-4 py-2 rounded border hover:bg-slate-900"
          >
            Check-in
          </Link>
        </div>
      </header>

      {/* SUMMARY */}
      <section>
        <div className="flex items-center gap-6 text-sm">
          <div>Capacity: <span className="font-medium">{event.capacity ?? 0}</span></div>
          <div>Confirmed headcount: <span className="font-medium">{totals.confirmedHeadcount}</span></div>
          <div>Checked-in headcount: <span className="font-medium">{totals.checkedInHeadcount}</span></div>
        </div>

        <div className="flex items-center gap-3 text-sm mt-3">
          <span className="text-slate-400">Totals —</span>
          {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
            <span key={s} className={`px-2 py-1 rounded ${STATUS_BG[s]}`}>
              {STATUS_LABEL[s]} <b className="ml-1">{totals[s]}</b>
            </span>
          ))}
          <span className="px-2 py-1 rounded bg-slate-700 text-slate-100">
            all: <b className="ml-1">{totals.all}</b>
          </span>
        </div>
      </section>

      {/* TABLE CONTROLS */}
      <section className="flex gap-3 items-center">
        <input
          placeholder="Full name"
          className="w-64 p-2 rounded border bg-transparent"
        />
        <input
          placeholder="Email"
          className="w-72 p-2 rounded border bg-transparent"
        />
        <button className="px-3 py-2 rounded bg-white/10 hover:bg-white/20 border">
          Add guest
        </button>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as any)}
          className="p-2 rounded border bg-transparent"
        >
          <option value="name">Sort: name</option>
          <option value="status">Sort: status</option>
          <option value="plus_ones">Sort: plus-ones</option>
        </select>
      </section>

      {/* GUESTS TABLE */}
      <section className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Plus-ones</th>
            </tr>
          </thead>
          <tbody>
            {sortedGuests.map((g) => (
              <tr key={g.id} className="border-t border-slate-800">
                <td className="p-2">{g.full_name}</td>
                <td className="p-2">{g.email}</td>
                <td className="p-2">
                  <select
                    value={g.status}
                    onChange={(e) => handleStatusChange(g, e.target.value as Status)}
                    className={`px-2 py-1 rounded border bg-transparent ${STATUS_BG[g.status]}`}
                  >
                    {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <div className="inline-flex items-center gap-2">
                    <button
                      className="px-2 py-1 rounded border hover:bg-slate-900"
                      onClick={() => handlePlusOnes(g, -1)}
                    >
                      −
                    </button>
                    <span>{g.plus_ones ?? 0}</span>
                    <button
                      className="px-2 py-1 rounded border hover:bg-slate-900"
                      onClick={() => handlePlusOnes(g, +1)}
                    >
                      ＋
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {message && (
        <p className="text-center text-sm text-amber-300">{message}</p>
      )}
    </main>
  );
}


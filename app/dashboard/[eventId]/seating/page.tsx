'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CapacityGauge } from '@/app/components/CapacityGauge';

type SeatingFormat = 'STANDING' | 'SEATED' | 'MIXED';

interface TableConfig {
  number: number;
  seats: number;
}

interface Event {
  id: number;
  title: string;
  total_capacity: number | null;
  seating_format: SeatingFormat;
  tables_config: { tables: TableConfig[] } | null;
}

export default function EventSetupPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [totalCapacity, setTotalCapacity] = useState<number>(0);
  const [seatingFormat, setSeatingFormat] = useState<SeatingFormat>('STANDING');
  const [tables, setTables] = useState<TableConfig[]>([]);

  // Load event data
  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  async function fetchEvent() {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}`);
      if (!res.ok) throw new Error('Failed to fetch event');

      const data = await res.json();
      setEvent(data.event);

      setTotalCapacity(data.event.total_capacity || 0);
      setSeatingFormat(data.event.seating_format || 'STANDING');
      setTables(data.event.tables_config?.tables || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        total_capacity: totalCapacity,
        seating_format: seatingFormat,
      };

      if (seatingFormat === 'SEATED' && tables.length > 0) {
        payload.tables_config = { tables };
      }

      const res = await fetch(`/api/events/${eventId}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update capacity');
      }

      // Refresh event data
      await fetchEvent();
      alert('Capacity settings saved successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function addTable() {
    const newTableNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) + 1 : 1;
    setTables([...tables, { number: newTableNumber, seats: 8 }]);
  }

  function updateTable(index: number, field: 'number' | 'seats', value: number) {
    const updated = [...tables];
    updated[index][field] = value;
    setTables(updated);
  }

  function removeTable(index: number) {
    setTables(tables.filter((_, i) => i !== index));
  }

  // Calculate total seats from tables
  const totalTableSeats = tables.reduce((sum, t) => sum + t.seats, 0);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8">
        <div className="text-red-600">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard/${eventId}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Event
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-gray-600 mt-2">Configure event capacity and seating</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Capacity Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Event Capacity</h2>

          <div className="space-y-6">
            {/* Total Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Capacity
              </label>
              <input
                type="number"
                min="0"
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter maximum number of attendees"
              />
              <p className="text-sm text-gray-500 mt-1">
                Maximum number of people who can attend this event
              </p>
            </div>

            {/* Seating Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seating Format
              </label>
              <div className="flex gap-4">
                {(['STANDING', 'SEATED', 'MIXED'] as SeatingFormat[]).map((format) => (
                  <label key={format} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="seating-format"
                      value={format}
                      checked={seatingFormat === format}
                      onChange={(e) => setSeatingFormat(e.target.value as SeatingFormat)}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">{format.toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Table Configuration (only for SEATED) */}
            {seatingFormat === 'SEATED' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Table Configuration
                  </label>
                  <button
                    onClick={addTable}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Table
                  </button>
                </div>

                {tables.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No tables configured yet</p>
                ) : (
                  <div className="space-y-2">
                    {tables.map((table, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Table #</label>
                          <input
                            type="number"
                            min="1"
                            value={table.number}
                            onChange={(e) => updateTable(index, 'number', Number(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-600 mb-1">Seats</label>
                          <input
                            type="number"
                            min="1"
                            value={table.seats}
                            onChange={(e) => updateTable(index, 'seats', Number(e.target.value))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        </div>
                        <button
                          onClick={() => removeTable(index)}
                          className="mt-5 text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <div className="text-sm text-gray-600 mt-2">
                      Total table seats: <strong>{totalTableSeats}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Current Capacity Status */}
        {totalCapacity > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Status</h2>
            <CapacityGauge filled={0} total={totalCapacity} />
            <p className="text-sm text-gray-500 mt-3">
              No guests have been invited yet. Capacity tracking will update as you send invitations.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
          >
            {saving ? 'Saving...' : 'Save Capacity Settings'}
          </button>
          <button
            onClick={() => router.push(`/dashboard/${eventId}`)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

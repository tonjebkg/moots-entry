'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Sparkles, RotateCw, Settings } from 'lucide-react';
import { SeatingChart } from '@/app/components/SeatingChart';
import { SeatingAssignPanel } from '@/app/components/SeatingAssignPanel';
import { IntroductionPairings } from '@/app/components/IntroductionPairings';

type SeatingFormat = 'STANDING' | 'SEATED' | 'MIXED';
type Strategy = 'MIXED_INTERESTS' | 'SIMILAR_INTERESTS' | 'SCORE_BALANCED';

interface TableConfig {
  number: number;
  seats: number;
}

interface Assignment {
  invitation_id: string;
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  table_assignment: number | null;
  seat_assignment: number | null;
  status: string;
  relevance_score: number | null;
}

interface Pairing {
  id: string;
  contact_a_name?: string;
  contact_a_company?: string;
  contact_b_name?: string;
  contact_b_company?: string;
  reason: string;
  mutual_interest: string | null;
  priority: number;
}

export default function SeatingPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pairings, setPairings] = useState<Pairing[]>([]);
  const [tables, setTables] = useState<TableConfig[]>([]);
  const [seatingFormat, setSeatingFormat] = useState<SeatingFormat>('STANDING');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingIntros, setGeneratingIntros] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>('MIXED_INTERESTS');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'introductions'>('chart');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch event for table config
      const eventRes = await fetch(`/api/events/${eventId}`);
      if (eventRes.ok) {
        const eventData = await eventRes.json();
        const evt = eventData.event;
        setSeatingFormat(evt.seating_format || 'STANDING');
        setTables(evt.tables_config?.tables || []);
      }

      // Fetch current assignments
      const assignRes = await fetch(`/api/events/${eventId}/seating`);
      if (assignRes.ok) {
        const assignData = await assignRes.json();
        setAssignments(assignData.assignments || []);
      }

      // Fetch pairings
      const pairRes = await fetch(`/api/events/${eventId}/seating/introductions`);
      if (pairRes.ok) {
        const pairData = await pairRes.json();
        setPairings(pairData.pairings || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Group assignments by table
  const tableData = tables.map(t => ({
    table_number: t.number,
    seats: t.seats,
    assignments: assignments
      .filter(a => a.table_assignment === t.number)
      .map(a => ({
        contact_id: a.contact_id,
        full_name: a.full_name,
        company: a.company,
        relevance_score: a.relevance_score,
        seat_assignment: a.seat_assignment,
      })),
  }));

  const unassigned = assignments
    .filter(a => a.table_assignment == null)
    .map(a => ({
      contact_id: a.contact_id,
      full_name: a.full_name,
      company: a.company,
      relevance_score: a.relevance_score,
    }));

  async function handleAssign(contactId: string, tableNumber: number) {
    try {
      const res = await fetch(`/api/events/${eventId}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, table_number: tableNumber }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to assign');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleRemoveGuest(contactId: string) {
    try {
      // Assign to null table (remove assignment)
      const res = await fetch(`/api/events/${eventId}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, table_number: 0 }),
      });
      if (res.ok) await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleGenerateSuggestions() {
    try {
      setGenerating(true);
      setError(null);
      const res = await fetch(`/api/events/${eventId}/seating/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate suggestions');
      }
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateIntroductions() {
    try {
      setGeneratingIntros(true);
      setError(null);
      const res = await fetch(`/api/events/${eventId}/seating/introductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_pairings: 20 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate pairings');
      }
      const data = await res.json();
      setPairings(prev => [...data.pairings.map((p: any, i: number) => ({ ...p, id: `new-${i}` })), ...prev]);
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingIntros(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-[#6e6e7e] text-sm font-medium">Loading seating...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] tracking-tight mb-1">Seating Management</h1>
          <p className="text-sm text-[#4a4a5e]">
            {seatingFormat === 'STANDING'
              ? 'Standing format — no table assignments needed'
              : `${tables.length} tables · ${assignments.length} confirmed guests · ${unassigned.length} unassigned`}
          </p>
        </div>
        {seatingFormat !== 'STANDING' && (
          <div className="flex items-center gap-3">
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
              className="px-3 py-2 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0f3460]"
            >
              <option value="MIXED_INTERESTS">Mixed Interests</option>
              <option value="SIMILAR_INTERESTS">Similar Interests</option>
              <option value="SCORE_BALANCED">Score Balanced</option>
            </select>
            <button
              onClick={handleGenerateSuggestions}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0f3460] rounded-lg hover:bg-[#0a2540] transition-colors disabled:opacity-50"
            >
              {generating ? <RotateCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generating ? 'Generating...' : 'AI Suggest'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-800 font-medium">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f0f2f5] rounded-lg p-1">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'chart'
              ? 'bg-white text-[#1a1a2e] shadow-sm'
              : 'text-[#6e6e7e] hover:text-[#1a1a2e]'
          }`}
        >
          Seating Chart
        </button>
        <button
          onClick={() => setActiveTab('introductions')}
          className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === 'introductions'
              ? 'bg-white text-[#1a1a2e] shadow-sm'
              : 'text-[#6e6e7e] hover:text-[#1a1a2e]'
          }`}
        >
          Introduction Pairings ({pairings.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'chart' ? (
        seatingFormat === 'STANDING' ? (
          <div className="bg-white border border-[#e1e4e8] rounded-lg p-8 text-center">
            <Settings size={32} className="mx-auto mb-3 text-[#6e6e7e] opacity-50" />
            <p className="text-sm text-[#6e6e7e]">
              This event uses a standing format. Switch to &quot;Seated&quot; or &quot;Mixed&quot; format in event settings to enable table assignments.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SeatingChart
                tables={tableData}
                onRemoveGuest={handleRemoveGuest}
              />
            </div>
            <div>
              <SeatingAssignPanel
                unassigned={unassigned}
                tableNumbers={tables.map(t => t.number)}
                onAssign={handleAssign}
              />
            </div>
          </div>
        )
      ) : (
        <IntroductionPairings
          pairings={pairings}
          onGenerate={handleGenerateIntroductions}
          generating={generatingIntros}
        />
      )}
    </div>
  );
}

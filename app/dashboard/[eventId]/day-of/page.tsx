'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Sparkles, RotateCw, UserCheck, Grid3X3, ArrowLeftRight, Info, Settings, Plus, Trash2, Save } from 'lucide-react'
import { CheckinDashboard } from '@/app/components/CheckinDashboard'
import { SeatingChart } from '@/app/components/SeatingChart'
import { SeatingAssignPanel } from '@/app/components/SeatingAssignPanel'
import { IntroductionPairings } from '@/app/components/IntroductionPairings'
import { DossierPanel } from '@/app/components/DossierPanel'
import { AgentThinking, THINKING_STEPS } from '@/app/components/ui/AgentThinking'
import { MoveAnalysisToast } from '@/app/components/ui/MoveAnalysisToast'

type SubTab = 'checkin' | 'seating' | 'introductions'
type SeatingFormat = 'STANDING' | 'SEATED' | 'MIXED'
type Strategy = 'MIXED_INTERESTS' | 'SIMILAR_INTERESTS' | 'SCORE_BALANCED'

interface TableConfig {
  number: number
  seats: number
}

interface Assignment {
  invitation_id: string
  contact_id: string
  full_name: string
  company: string | null
  title: string | null
  tags: string[] | null
  table_assignment: number | null
  seat_assignment: number | null
  status: string
  relevance_score: number | null
  guest_role?: string | null
  guest_priority?: string | null
  assigned_team_member?: string | null
}

interface Pairing {
  id: string
  contact_a_name?: string
  contact_a_company?: string
  contact_b_name?: string
  contact_b_company?: string
  reason: string
  mutual_interest: string | null
  priority: number
}

interface SuggestionLogEntry {
  contact_id: string
  full_name: string
  table_number: number
  rationale: string
  confidence: number
}

export default function DayOfPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [activeTab, setActiveTab] = useState<SubTab>('checkin')

  // Seating state
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [pairings, setPairings] = useState<Pairing[]>([])
  const [tables, setTables] = useState<TableConfig[]>([])
  const [seatingFormat, setSeatingFormat] = useState<SeatingFormat>('STANDING')
  const [seatingLoading, setSeatingLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingIntros, setGeneratingIntros] = useState(false)
  const [strategy, setStrategy] = useState<Strategy>('MIXED_INTERESTS')
  const [error, setError] = useState<string | null>(null)

  // Dossier panel
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)

  // Table management
  const [showTableManager, setShowTableManager] = useState(false)
  const [editTables, setEditTables] = useState<TableConfig[]>([])
  const [savingTables, setSavingTables] = useState(false)

  // AI reasoning log
  const [lastSuggestionLog, setLastSuggestionLog] = useState<SuggestionLogEntry[] | null>(null)
  const [showReasoningLog, setShowReasoningLog] = useState(false)

  // Seating rationale map
  const [rationaleMap, setRationaleMap] = useState<Record<string, string>>({})

  // Move analysis toast
  const [moveAnalysis, setMoveAnalysis] = useState<{ text: string; suggestion: string | null } | null>(null)

  const fetchSeatingData = useCallback(async () => {
    try {
      setSeatingLoading(true)
      const eventRes = await fetch(`/api/events/${eventId}`)
      if (eventRes.ok) {
        const evt = await eventRes.json()
        setSeatingFormat(evt.seating_format || 'STANDING')
        setTables(evt.tables_config?.tables || [])
      }

      const assignRes = await fetch(`/api/events/${eventId}/seating`)
      if (assignRes.ok) {
        const assignData = await assignRes.json()
        setAssignments(assignData.assignments || [])
      }

      const pairRes = await fetch(`/api/events/${eventId}/seating/introductions`)
      if (pairRes.ok) {
        const pairData = await pairRes.json()
        setPairings(pairData.pairings || [])
      }

      // Fetch seating rationale
      try {
        const ratRes = await fetch(`/api/events/${eventId}/seating/rationale`)
        if (ratRes.ok) {
          const ratData = await ratRes.json()
          setRationaleMap(ratData.rationale || {})
        }
      } catch {
        // rationale endpoint may not exist yet, ignore
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSeatingLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    if (activeTab === 'seating' || activeTab === 'introductions') {
      fetchSeatingData()
    }
  }, [activeTab, fetchSeatingData])

  // Seating data transforms
  const tableData = tables.map(t => ({
    table_number: t.number,
    seats: t.seats,
    assignments: assignments
      .filter(a => a.table_assignment === t.number)
      .map(a => ({
        contact_id: a.contact_id,
        full_name: a.full_name,
        company: a.company,
        title: a.title,
        tags: a.tags,
        relevance_score: a.relevance_score,
        seat_assignment: a.seat_assignment,
        rationale: rationaleMap[a.contact_id] || undefined,
        guest_role: a.guest_role,
        guest_priority: a.guest_priority,
        assigned_team_member: a.assigned_team_member,
      })),
  }))

  const unassigned = assignments
    .filter(a => a.table_assignment == null)
    .map(a => ({
      contact_id: a.contact_id,
      full_name: a.full_name,
      company: a.company,
      relevance_score: a.relevance_score,
    }))

  async function handleAssign(contactId: string, tableNumber: number) {
    try {
      const res = await fetch(`/api/events/${eventId}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, table_number: tableNumber }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to assign')
      }
      await fetchSeatingData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleRemoveGuest(contactId: string) {
    try {
      const res = await fetch(`/api/events/${eventId}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: contactId, table_number: 0 }),
      })
      if (res.ok) await fetchSeatingData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleMoveGuest(contactId: string, newTable: number) {
    // Track the current table before the move
    const currentAssignment = assignments.find(a => a.contact_id === contactId)
    const fromTable = currentAssignment?.table_assignment ?? 0

    await handleAssign(contactId, newTable)

    // Fire-and-forget: request move analysis from agent
    fetch(`/api/events/${eventId}/seating/analyze-move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_id: contactId, from_table: fromTable, to_table: newTable }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.analysis) {
          setMoveAnalysis({ text: data.analysis, suggestion: data.suggestion || null })
        }
      })
      .catch(() => { /* non-critical */ })
  }

  async function handleGenerateSuggestions() {
    try {
      setGenerating(true)
      setError(null)
      const res = await fetch(`/api/events/${eventId}/seating/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate suggestions')
      }
      const data = await res.json()
      // Store AI reasoning log
      if (data.assignments) {
        const enriched = data.assignments.map((a: any) => {
          const match = assignments.find(x => x.contact_id === a.contact_id)
          return {
            contact_id: a.contact_id,
            full_name: match?.full_name || a.contact_id,
            table_number: a.table_number,
            rationale: a.rationale || '',
            confidence: a.confidence || 0,
          }
        })
        setLastSuggestionLog(enriched)
      }
      await fetchSeatingData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleGenerateIntroductions() {
    try {
      setGeneratingIntros(true)
      setError(null)
      const res = await fetch(`/api/events/${eventId}/seating/introductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_pairings: 20 }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate pairings')
      }
      const data = await res.json()
      setPairings(prev => [...data.pairings.map((p: any, i: number) => ({ ...p, id: `new-${i}` })), ...prev])
      await fetchSeatingData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingIntros(false)
    }
  }

  // Table management
  function openTableManager() {
    setEditTables([...tables])
    setShowTableManager(true)
  }

  function addTable() {
    const maxNum = editTables.length > 0 ? Math.max(...editTables.map(t => t.number)) : 0
    setEditTables([...editTables, { number: maxNum + 1, seats: 8 }])
  }

  function removeTable(idx: number) {
    setEditTables(editTables.filter((_, i) => i !== idx))
  }

  function updateTableSeats(idx: number, seats: number) {
    setEditTables(editTables.map((t, i) => i === idx ? { ...t, seats: Math.max(1, seats) } : t))
  }

  async function saveTableConfig() {
    try {
      setSavingTables(true)
      const res = await fetch(`/api/events/${eventId}/capacity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables_config: { tables: editTables } }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save table config')
      }
      setTables(editTables)
      setShowTableManager(false)
      await fetchSeatingData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSavingTables(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-charcoal tracking-tight mb-1">Event Day</h1>
          <p className="text-sm text-ui-secondary">
            Manage check-in, seating arrangements, and introduction pairings
          </p>
        </div>
      </div>

      {/* Sub-tab Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
          <button
            onClick={() => setActiveTab('checkin')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'checkin'
                ? 'bg-white text-brand-charcoal shadow-sm'
                : 'text-ui-tertiary hover:text-brand-charcoal'
            }`}
          >
            <UserCheck size={15} />
            Check-in
          </button>
          <button
            onClick={() => setActiveTab('seating')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'seating'
                ? 'bg-white text-brand-charcoal shadow-sm'
                : 'text-ui-tertiary hover:text-brand-charcoal'
            }`}
          >
            <Grid3X3 size={15} />
            Seating
          </button>
          <button
            onClick={() => setActiveTab('introductions')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
              activeTab === 'introductions'
                ? 'bg-white text-brand-charcoal shadow-sm'
                : 'text-ui-tertiary hover:text-brand-charcoal'
            }`}
          >
            <ArrowLeftRight size={15} />
            Introductions
          </button>
        </div>

        {/* Seating actions */}
        {activeTab === 'seating' && seatingFormat !== 'STANDING' && (
          <div className="flex items-center gap-3">
            <button
              onClick={openTableManager}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-ui-tertiary hover:text-brand-charcoal border border-ui-border rounded-lg transition-colors"
            >
              <Settings size={14} />
              Manage Tables
            </button>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
              className="px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-terracotta"
            >
              <option value="MIXED_INTERESTS">Mixed Interests</option>
              <option value="SIMILAR_INTERESTS">Similar Interests</option>
              <option value="SCORE_BALANCED">Score Balanced</option>
            </select>
            <button
              onClick={handleGenerateSuggestions}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50"
            >
              {generating ? null : <><Sparkles size={14} /> AI Suggest</>}
            </button>
            {generating && (
              <AgentThinking steps={THINKING_STEPS.seating} intervalMs={3000} />
            )}
          </div>
        )}

        {/* Introduction actions */}
        {activeTab === 'introductions' && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateIntroductions}
              disabled={generatingIntros}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-terracotta rounded-lg hover:bg-brand-terracotta/90 transition-colors disabled:opacity-50"
            >
              {generatingIntros ? null : <><Sparkles size={14} /> Generate Pairings</>}
            </button>
            {generatingIntros && (
              <AgentThinking steps={THINKING_STEPS.introductions} intervalMs={3000} />
            )}
          </div>
        )}
      </div>

      {/* Check-in Content */}
      {activeTab === 'checkin' && (
        <CheckinDashboard eventId={eventId} />
      )}

      {/* Seating Content */}
      {activeTab === 'seating' && (
        <>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-800 font-medium">×</button>
            </div>
          )}

          {/* Move Analysis Toast */}
          {moveAnalysis && (
            <MoveAnalysisToast
              analysis={moveAnalysis.text}
              suggestion={moveAnalysis.suggestion}
              onDismiss={() => setMoveAnalysis(null)}
            />
          )}

          {/* Table Management Panel */}
          {showTableManager && (
            <div className="bg-white border border-ui-border rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-brand-charcoal">Manage Tables</h3>
                <button
                  onClick={() => setShowTableManager(false)}
                  className="text-ui-tertiary hover:text-brand-charcoal text-sm"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                {editTables.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-brand-charcoal w-20">Table {t.number}</span>
                    <input
                      type="number"
                      min={1}
                      value={t.seats}
                      onChange={(e) => updateTableSeats(idx, parseInt(e.target.value, 10) || 1)}
                      className="w-20 px-2 py-1.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta"
                    />
                    <span className="text-xs text-ui-tertiary">seats</span>
                    <button
                      onClick={() => removeTable(idx)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={addTable}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-terracotta border border-brand-terracotta rounded-lg hover:bg-brand-terracotta/5 transition-colors"
                >
                  <Plus size={12} />
                  Add Table
                </button>
                <button
                  onClick={saveTableConfig}
                  disabled={savingTables}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-brand-forest rounded-lg hover:bg-brand-forest/90 transition-colors disabled:opacity-50"
                >
                  <Save size={12} />
                  {savingTables ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}

          {seatingLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-ui-tertiary text-sm font-medium">Loading seating...</div>
            </div>
          ) : seatingFormat === 'STANDING' ? (
            <div className="bg-white rounded-card shadow-card p-8 text-center">
              <Info size={32} className="mx-auto mb-3 text-ui-tertiary opacity-50" />
              <p className="text-sm text-ui-tertiary mb-4">
                This event uses a standing format. Table assignments are not applicable for standing events.
              </p>
              <button
                onClick={() => setActiveTab('introductions')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-brand-terracotta hover:bg-brand-terracotta/5 border border-brand-terracotta rounded-lg transition-colors"
              >
                <ArrowLeftRight size={14} />
                View Introduction Pairings instead
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SeatingChart
                  tables={tableData}
                  onRemoveGuest={handleRemoveGuest}
                  onGuestClick={setDossierContactId}
                  onMoveGuest={handleMoveGuest}
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
          )}

          {/* AI Reasoning Log */}
          {lastSuggestionLog && lastSuggestionLog.length > 0 && (
            <div className="bg-white border border-ui-border rounded-lg overflow-hidden">
              <button
                onClick={() => setShowReasoningLog(!showReasoningLog)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-brand-cream transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-brand-terracotta" />
                  <h3 className="text-sm font-semibold text-brand-charcoal">
                    AI Reasoning ({lastSuggestionLog.length} assignments)
                  </h3>
                </div>
                <span className="text-xs text-ui-tertiary">{showReasoningLog ? 'Hide' : 'Show'}</span>
              </button>
              {showReasoningLog && (
                <div className="border-t border-ui-border divide-y divide-ui-border">
                  {lastSuggestionLog.map((entry, idx) => (
                    <div key={idx} className="px-4 py-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-brand-charcoal">{entry.full_name}</span>
                        <span className="text-xs text-ui-tertiary">
                          Table {entry.table_number} · {Math.round(entry.confidence * 100)}% confidence
                        </span>
                      </div>
                      {entry.rationale && (
                        <p className="text-xs text-ui-secondary mt-0.5">{entry.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Introductions Content */}
      {activeTab === 'introductions' && (
        <>
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
              <button onClick={() => setError(null)} className="ml-3 text-red-500 hover:text-red-800 font-medium">×</button>
            </div>
          )}

          {seatingLoading ? (
            <div className="flex items-center justify-center py-32">
              <div className="text-ui-tertiary text-sm font-medium">Loading introductions...</div>
            </div>
          ) : (
            <IntroductionPairings
              pairings={pairings}
              generating={generatingIntros}
              onGuestClick={setDossierContactId}
              availableGuests={assignments.map(a => ({
                contact_id: a.contact_id,
                full_name: a.full_name,
                company: a.company,
              }))}
              onCreateManual={async (contactAId, contactBId, reason) => {
                const res = await fetch(`/api/events/${eventId}/seating/introductions`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contact_a_id: contactAId, contact_b_id: contactBId, reason }),
                })
                if (!res.ok) {
                  const data = await res.json()
                  throw new Error(data.error || 'Failed to create pairing')
                }
                await fetchSeatingData()
              }}
            />
          )}
        </>
      )}

      {/* Dossier Panel */}
      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}
    </div>
  )
}

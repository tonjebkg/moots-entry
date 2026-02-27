'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Save, Target, Sparkles, CheckCircle, Loader2 } from 'lucide-react'

interface Objective {
  id?: string
  objective_text: string
  weight: number
  criteria_config: Record<string, unknown>
  sort_order: number
  ai_interpretation?: string | null
  ai_questions?: string[] | null
  qualifying_count?: number
}

interface ObjectivesEditorProps {
  eventId: string
  objectives: Objective[]
  onSave: (objectives: Objective[]) => Promise<void>
  hasScoredContacts?: boolean
}

const PLACEHOLDER_EXAMPLES = [
  'Exited founders with $50M+ net worth',
  'Brand decision-makers with $10M+ media budgets',
  'C-suite executives at enterprise SaaS companies',
  'Institutional LPs actively increasing PE allocations',
  'Centers of influence with HNW client networks',
  'Creative agency leads with Cannes credentials',
]

export function ObjectivesEditor({ eventId, objectives: initial, onSave, hasScoredContacts }: ObjectivesEditorProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initial)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndex, setSavedIndex] = useState<number | null>(null)
  // Track the "clean" text per objective to detect dirty state
  const cleanTexts = useRef<Map<number, string>>(
    new Map(initial.map((o, i) => [i, o.objective_text]))
  )

  function addObjective() {
    const nextIndex = objectives.length
    cleanTexts.current.set(nextIndex, '')
    setObjectives([
      ...objectives,
      {
        objective_text: '',
        weight: 1.0,
        criteria_config: {},
        sort_order: objectives.length,
      },
    ])
  }

  function updateObjective(index: number, updates: Partial<Objective>) {
    const next = [...objectives]
    next[index] = { ...next[index], ...updates }
    setObjectives(next)
    setSavedIndex(null)
  }

  function removeObjective(index: number) {
    setObjectives(objectives.filter((_, i) => i !== index))
    // Rebuild clean texts map
    const newMap = new Map<number, string>()
    objectives.forEach((o, i) => {
      if (i < index) newMap.set(i, cleanTexts.current.get(i) || o.objective_text)
      else if (i > index) newMap.set(i - 1, cleanTexts.current.get(i) || o.objective_text)
    })
    cleanTexts.current = newMap
  }

  function isDirty(index: number): boolean {
    const clean = cleanTexts.current.get(index) ?? ''
    return objectives[index]?.objective_text !== clean
  }

  async function handleSaveObjective(index: number) {
    const valid = objectives.filter(o => o.objective_text.trim())
    if (valid.length === 0) return

    setSavingIndex(index)
    try {
      const equalWeight = 1.0
      await onSave(valid.map((o, i) => ({ ...o, weight: equalWeight, sort_order: i })))
      // Mark all as clean after save
      objectives.forEach((o, i) => cleanTexts.current.set(i, o.objective_text))
      setSavedIndex(index)
      setTimeout(() => setSavedIndex(null), 3000)
    } catch (err) {
      console.error('Failed to save objective:', err)
    } finally {
      setSavingIndex(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Add Objective — at the top */}
      <div className="flex items-center gap-3">
        <button
          onClick={addObjective}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-brand-forest text-brand-forest rounded-pill text-sm font-semibold hover:bg-brand-forest hover:text-white transition-colors"
        >
          <Plus size={16} />
          Add Objective
        </button>
        {savedIndex !== null && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fade-in">
            <CheckCircle size={14} />
            Saved
            <Link
              href={`/dashboard/${eventId}/guest-intelligence`}
              className="text-sm font-semibold text-brand-terracotta hover:underline ml-2"
            >
              Score Contacts Now →
            </Link>
          </span>
        )}
      </div>

      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.map((obj, index) => {
          const dirty = isDirty(index)
          const isSaving = savingIndex === index
          const justSaved = savedIndex === index

          return (
            <div key={index} className="p-5 bg-white rounded-card shadow-card border border-ui-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-forest/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-brand-forest">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={obj.objective_text}
                    onChange={(e) => updateObjective(index, { objective_text: e.target.value })}
                    placeholder={PLACEHOLDER_EXAMPLES[index % PLACEHOLDER_EXAMPLES.length]}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none placeholder:text-ui-tertiary/60"
                  />
                  <p className="text-xs text-ui-tertiary mt-1.5">
                    Describe who you want at this event in plain language. Moots handles the scoring.
                  </p>
                  {obj.ai_interpretation && (
                    <div className="mt-3 p-3 bg-brand-cream rounded-lg border border-brand-forest/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={12} className="text-brand-terracotta" />
                        <span className="text-xs font-semibold text-brand-forest uppercase tracking-wider">AI Interpretation</span>
                      </div>
                      <p className="text-sm text-ui-secondary leading-relaxed italic">{obj.ai_interpretation}</p>
                      <p className="text-xs font-semibold mt-2">
                        {(obj.qualifying_count ?? 0) > 0 ? (
                          <span className="text-brand-terracotta">
                            {obj.qualifying_count} contacts currently qualify based on this objective
                          </span>
                        ) : hasScoredContacts ? (
                          <span className="text-ui-tertiary">
                            No contacts matched this objective
                          </span>
                        ) : (
                          <span className="text-ui-tertiary">
                            Score contacts to see how many qualify
                          </span>
                        )}
                      </p>
                      {obj.ai_questions && obj.ai_questions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-brand-forest/10">
                          <span className="text-xs font-semibold text-brand-charcoal">To refine scoring, consider:</span>
                          <ul className="mt-1.5 space-y-1">
                            {obj.ai_questions.map((q, qi) => (
                              <li key={qi} className="flex items-start gap-2 text-xs text-ui-secondary">
                                <span className="text-brand-terracotta mt-0.5 shrink-0">?</span>
                                <span>{q}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Per-objective Save button */}
                  {dirty && obj.objective_text.trim() && (
                    <button
                      onClick={() => handleSaveObjective(index)}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                  {justSaved && !dirty && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle size={12} />
                      Saved
                    </span>
                  )}
                  <button
                    onClick={() => removeObjective(index)}
                    className="p-1.5 text-ui-tertiary hover:text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {objectives.length === 0 && (
        <div className="text-center py-12 bg-white rounded-card shadow-card border border-ui-border">
          <Target size={32} className="mx-auto mb-3 text-brand-forest/40" />
          <h3 className="font-display text-lg font-semibold text-brand-charcoal mb-2">No objectives defined</h3>
          <p className="text-sm text-ui-tertiary max-w-md mx-auto mb-1">
            Tell the AI what kind of guests matter for this event using natural language.
          </p>
          <p className="text-xs text-ui-tertiary italic">
            e.g. &ldquo;{PLACEHOLDER_EXAMPLES[0]}&rdquo; or &ldquo;{PLACEHOLDER_EXAMPLES[1]}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Target, Sparkles, CheckCircle, Loader2, Check, Save, ArrowRight } from 'lucide-react'

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
  onAddRef?: (addFn: () => void) => void
}

const PLACEHOLDER_EXAMPLES = [
  'Exited founders with $50M+ net worth',
  'Brand decision-makers with $10M+ media budgets',
  'C-suite executives at enterprise SaaS companies',
  'Institutional LPs actively increasing PE allocations',
  'Centers of influence with HNW client networks',
  'Creative agency leads with Cannes credentials',
]

export function ObjectivesEditor({ eventId, objectives: initial, onSave, hasScoredContacts, onAddRef }: ObjectivesEditorProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initial)
  const [savedIndex, setSavedIndex] = useState<number | null>(null)
  const [appliedSuggestions, setAppliedSuggestions] = useState<Map<number, Set<number>>>(new Map())
  const [rescoringIndex, setRescoringIndex] = useState<number | null>(null)
  const [autoSaving, setAutoSaving] = useState(false)
  // Track the "clean" text per objective to detect dirty state
  const cleanTexts = useRef<Map<number, string>>(
    new Map(initial.map((o, i) => [i, o.objective_text]))
  )
  // Ref to always access latest objectives
  const objectivesRef = useRef(objectives)
  useEffect(() => { objectivesRef.current = objectives }, [objectives])

  /** Transform an AI question into a directive statement (safety net for legacy data) */
  function questionToDirective(q: string): string {
    let text = q.trim()
    // Remove leading "?" prefix
    if (text.startsWith('?')) text = text.slice(1).trim()
    // Remove trailing "?"
    text = text.replace(/\?$/, '').trim()
    // Strip question patterns → directives
    text = text.replace(/^should\s+(?:I|we)\s+/i, '')
    text = text.replace(/^do\s+you\s+want\s+(?:me\s+)?to\s+/i, '')
    // "Are there specific X..." → "Focus on X..."
    text = text.replace(/^are\s+there\s+(?:specific\s+)?/i, 'Focus on ')
    // "Is there a minimum X..." → "Set minimum X..."
    text = text.replace(/^is\s+there\s+a\s+minimum\s+/i, 'Set minimum ')
    // "When you say X, should I..." → strip prefix
    text = text.replace(/^when\s+you\s+say\s+[^,]+,\s*/i, '')
    text = text.replace(/^should\s+(?:I|we)\s+/i, '')
    // Capitalize first letter
    if (text.length > 0) {
      text = text.charAt(0).toUpperCase() + text.slice(1)
    }
    return text
  }

  /** Format directive for chip display (no trailing period) */
  function directiveForDisplay(q: string): string {
    return questionToDirective(q).replace(/\.$/, '')
  }

  async function applySuggestion(objIndex: number, questionIndex: number, questionText: string) {
    const directive = questionToDirective(questionText)
    const currentText = objectives[objIndex].objective_text.trim()
    const newText = currentText ? `${currentText} ${directive}` : directive

    // Update the objective text
    const next = [...objectives]
    next[objIndex] = { ...next[objIndex], objective_text: newText }
    setObjectives(next)

    // Mark suggestion as applied
    setAppliedSuggestions(prev => {
      const copy = new Map(prev)
      const set = new Set(copy.get(objIndex) || [])
      set.add(questionIndex)
      copy.set(objIndex, set)
      return copy
    })

    // Auto-save + re-score
    setRescoringIndex(objIndex)
    try {
      const valid = next.filter(o => o.objective_text.trim())
      if (valid.length === 0) return
      const equalWeight = 1.0
      await onSave(valid.map((o, i) => ({ ...o, weight: equalWeight, sort_order: i })))
      // Mark all as clean after save
      next.forEach((o, i) => cleanTexts.current.set(i, o.objective_text))
      setSavedIndex(objIndex)
      setTimeout(() => setSavedIndex(null), 3000)
    } catch (err) {
      console.error('Failed to apply suggestion:', err)
    } finally {
      setRescoringIndex(null)
    }
  }

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

  // Expose addObjective to parent so button can be rendered in the page heading
  useEffect(() => {
    onAddRef?.(addObjective)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAddRef])

  function updateObjective(index: number, updates: Partial<Objective>) {
    const next = [...objectives]
    next[index] = { ...next[index], ...updates }
    setObjectives(next)
    setSavedIndex(null)
  }

  async function handleManualSave(index: number) {
    const current = objectivesRef.current
    const valid = current.filter(o => o.objective_text.trim())
    if (valid.length === 0) return
    setAutoSaving(true)
    try {
      const equalWeight = 1.0
      await onSave(valid.map((o, i) => ({ ...o, weight: equalWeight, sort_order: i })))
      current.forEach((o, i) => cleanTexts.current.set(i, o.objective_text))
      setSavedIndex(index)
      setTimeout(() => setSavedIndex(null), 3000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setAutoSaving(false)
    }
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


  return (
    <div className="space-y-4">
      {savedIndex !== null && (
        <div className="flex items-center gap-3">
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
        </div>
      )}

      {/* Objectives List — newest first */}
      <div className="space-y-3">
        {[...objectives].map((obj, idx) => ({ obj, originalIndex: idx })).reverse().map(({ obj, originalIndex }) => {
          const dirty = isDirty(originalIndex)
          const justSaved = savedIndex === originalIndex

          return (
            <div key={originalIndex} className="p-5 bg-white rounded-card shadow-card border border-ui-border">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-brand-forest/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-sm font-bold text-brand-forest">{originalIndex + 1}</span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={obj.objective_text}
                    onChange={(e) => updateObjective(originalIndex, { objective_text: e.target.value })}
                    placeholder={PLACEHOLDER_EXAMPLES[originalIndex % PLACEHOLDER_EXAMPLES.length]}
                    rows={2}
                    className="w-full px-3 py-2.5 text-base border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta resize-none placeholder:text-ui-tertiary/60"
                  />
                  <p className="text-sm text-ui-secondary mt-1.5">
                    Describe your ideal guest in plain language. Moots scores everyone against this.
                  </p>
                  {obj.ai_interpretation && (
                    <div className="mt-3 p-3 bg-brand-cream rounded-lg border border-brand-forest/10">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={13} className="text-brand-terracotta" />
                        <span className="text-[13px] font-semibold text-brand-forest uppercase tracking-wider">AI Interpretation</span>
                      </div>
                      <p className="text-base text-ui-secondary leading-relaxed">{obj.ai_interpretation}</p>
                      <p className="text-sm font-semibold mt-2">
                        {(obj.qualifying_count ?? 0) > 0 ? (
                          obj.id ? (
                            <Link
                              href={`/dashboard/${eventId}/guest-intelligence?objective=${obj.id}`}
                              className="text-brand-terracotta hover:underline cursor-pointer"
                            >
                              {obj.qualifying_count} contacts currently qualify based on this criterion
                            </Link>
                          ) : (
                            <span className="text-brand-terracotta">
                              {obj.qualifying_count} contacts currently qualify based on this criterion
                            </span>
                          )
                        ) : hasScoredContacts ? (
                          <span className="text-ui-tertiary">
                            No contacts matched this criterion
                          </span>
                        ) : (
                          <span className="text-ui-tertiary">
                            Score contacts to see how many qualify
                          </span>
                        )}
                      </p>
                      {obj.ai_questions && obj.ai_questions.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-brand-forest/10">
                          <span className="text-sm font-semibold text-brand-charcoal">To refine scoring, consider:</span>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {obj.ai_questions.map((q, qi) => {
                              const isApplied = appliedSuggestions.get(originalIndex)?.has(qi)
                              if (isApplied) {
                                return (
                                  <span
                                    key={qi}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full"
                                  >
                                    <Check size={13} />
                                    Applied
                                  </span>
                                )
                              }
                              return (
                                <button
                                  key={qi}
                                  onClick={() => applySuggestion(originalIndex, qi, q)}
                                  disabled={rescoringIndex === originalIndex}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-charcoal bg-white border border-ui-border rounded-full hover:border-brand-terracotta hover:text-brand-terracotta hover:bg-brand-terracotta/5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <span>{directiveForDisplay(q)}</span>
                                  <ArrowRight size={13} className="shrink-0 text-brand-terracotta" />
                                </button>
                              )
                            })}
                          </div>
                          {rescoringIndex === originalIndex && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-brand-terracotta">
                              <Loader2 size={14} className="animate-spin" />
                              Re-scoring contacts...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {dirty && obj.objective_text.trim() && !autoSaving && (
                    <button
                      onClick={() => handleManualSave(originalIndex)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-forest text-white text-sm font-semibold rounded-md hover:bg-brand-forest/90 transition-colors"
                    >
                      <Save size={14} />
                      Save
                    </button>
                  )}
                  {autoSaving && (
                    <span className="flex items-center gap-1 text-xs text-ui-tertiary font-medium">
                      <Loader2 size={12} className="animate-spin" />
                      Saving...
                    </span>
                  )}
                  {justSaved && !dirty && !autoSaving && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium animate-fade-in">
                      <CheckCircle size={12} />
                      Saved
                    </span>
                  )}
                  <button
                    onClick={() => removeObjective(originalIndex)}
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
          <p className="text-base text-ui-tertiary max-w-md mx-auto mb-1">
            Tell the AI what kind of guests matter for this event using natural language.
          </p>
          <p className="text-sm text-ui-tertiary italic">
            e.g. &ldquo;{PLACEHOLDER_EXAMPLES[0]}&rdquo; or &ldquo;{PLACEHOLDER_EXAMPLES[1]}&rdquo;
          </p>
        </div>
      )}
    </div>
  )
}

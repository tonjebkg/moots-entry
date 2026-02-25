'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, Target } from 'lucide-react'

interface Objective {
  id?: string
  objective_text: string
  weight: number
  criteria_config: Record<string, unknown>
  sort_order: number
}

interface ObjectivesEditorProps {
  eventId: string
  objectives: Objective[]
  onSave: (objectives: Objective[]) => Promise<void>
}

const PLACEHOLDER_EXAMPLES = [
  'Exited founders with $50M+ net worth',
  'Brand decision-makers with $10M+ media budgets',
  'C-suite executives at enterprise SaaS companies',
  'Institutional LPs actively increasing PE allocations',
  'Centers of influence with HNW client networks',
  'Creative agency leads with Cannes credentials',
]

export function ObjectivesEditor({ eventId, objectives: initial, onSave }: ObjectivesEditorProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function addObjective() {
    const usedCount = objectives.length
    setObjectives([
      ...objectives,
      {
        objective_text: '',
        weight: 1.0,
        criteria_config: {},
        sort_order: objectives.length,
      },
    ])
    setSaved(false)
  }

  function updateObjective(index: number, updates: Partial<Objective>) {
    const next = [...objectives]
    next[index] = { ...next[index], ...updates }
    setObjectives(next)
    setSaved(false)
  }

  function removeObjective(index: number) {
    setObjectives(objectives.filter((_, i) => i !== index))
    setSaved(false)
  }

  async function handleSave() {
    const valid = objectives.filter(o => o.objective_text.trim())
    if (valid.length === 0) return

    setSaving(true)
    try {
      // Auto-assign equal weights
      const equalWeight = 1.0
      await onSave(valid.map((o, i) => ({ ...o, weight: equalWeight, sort_order: i })))
      setSaved(true)
    } catch (err) {
      console.error('Failed to save objectives:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.map((obj, index) => (
          <div key={index} className="flex items-start gap-3 p-5 bg-white rounded-card shadow-card border border-ui-border">
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
            </div>
            <button
              onClick={() => removeObjective(index)}
              className="p-1.5 text-ui-tertiary hover:text-red-600 hover:bg-red-50 rounded shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={addObjective}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-dashed border-ui-border rounded-lg text-sm font-medium text-ui-tertiary hover:border-brand-terracotta hover:text-brand-terracotta transition-colors"
        >
          <Plus size={16} />
          Add Objective
        </button>
        <div className="flex-1" />
        {saved && (
          <span className="text-sm text-emerald-600 font-medium">Saved</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || objectives.filter(o => o.objective_text.trim()).length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-sm font-semibold rounded-pill shadow-cta transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Objectives'}
        </button>
      </div>
    </div>
  )
}

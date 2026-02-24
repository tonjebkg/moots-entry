'use client'

import { useState } from 'react'
import { Plus, Trash2, GripVertical, Save } from 'lucide-react'

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

export function ObjectivesEditor({ eventId, objectives: initial, onSave }: ObjectivesEditorProps) {
  const [objectives, setObjectives] = useState<Objective[]>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function addObjective() {
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
      await onSave(valid.map((o, i) => ({ ...o, sort_order: i })))
      setSaved(true)
    } catch (err) {
      console.error('Failed to save objectives:', err)
    } finally {
      setSaving(false)
    }
  }

  const totalWeight = objectives.reduce((sum, o) => sum + o.weight, 0)

  return (
    <div className="space-y-4">
      {/* Objectives List */}
      <div className="space-y-3">
        {objectives.map((obj, index) => (
          <div key={index} className="flex items-start gap-3 p-4 bg-white border border-[#e1e4e8] rounded-lg">
            <div className="text-[#6e6e7e] mt-2 cursor-grab">
              <GripVertical size={16} />
            </div>
            <div className="flex-1 space-y-3">
              <textarea
                value={obj.objective_text}
                onChange={(e) => updateObjective(index, { objective_text: e.target.value })}
                placeholder="Describe what makes a guest ideal for this event..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-[#e1e4e8] rounded-lg focus:outline-none focus:border-[#0f3460] focus:ring-1 focus:ring-[#0f3460] resize-none"
              />
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-[#6e6e7e]">Weight</label>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={obj.weight}
                    onChange={(e) => updateObjective(index, { weight: parseFloat(e.target.value) })}
                    className="w-24 accent-[#0f3460]"
                  />
                  <span className="text-xs font-mono text-[#4a4a5e] w-8">
                    {obj.weight.toFixed(1)}
                  </span>
                </div>
                {totalWeight > 0 && (
                  <span className="text-xs text-[#6e6e7e]">
                    {Math.round((obj.weight / totalWeight) * 100)}% of total
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => removeObjective(index)}
              className="p-1.5 text-[#6e6e7e] hover:text-red-600 hover:bg-red-50 rounded"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {objectives.length === 0 && (
        <div className="text-center py-8 text-[#6e6e7e]">
          <p className="mb-2">No objectives defined yet.</p>
          <p className="text-sm">Objectives tell the AI what kind of guests matter for this event.</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={addObjective}
          className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-[#e1e4e8] rounded-lg text-sm font-medium text-[#6e6e7e] hover:border-[#0f3460] hover:text-[#0f3460]"
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
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0f3460] hover:bg-[#c5a572] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? 'Saving...' : 'Save Objectives'}
        </button>
      </div>
    </div>
  )
}

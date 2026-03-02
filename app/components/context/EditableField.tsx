'use client'

import { useState, useEffect } from 'react'

interface EditableFieldProps {
  value: string
  onSave: (value: string) => void
  placeholder?: string
  multiline?: boolean
}

export function EditableField({ value, onSave, placeholder = 'Click to add...', multiline = false }: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => setDraft(value), [value])

  const save = () => {
    onSave(draft)
    setEditing(false)
  }
  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        className={`text-sm leading-relaxed cursor-pointer py-px border-b border-dashed border-transparent hover:border-ui-border transition-colors ${
          value ? 'text-brand-charcoal' : 'text-ui-tertiary'
        }`}
      >
        {value || placeholder}
      </div>
    )
  }

  if (multiline) {
    return (
      <div className="flex gap-1 items-center">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') cancel()
          }}
          onBlur={save}
          rows={3}
          className="flex-1 text-sm px-2 py-1 border-[1.5px] border-brand-terracotta rounded-[5px] bg-white text-brand-charcoal resize-vertical font-sans focus:outline-none"
        />
      </div>
    )
  }

  return (
    <div className="flex gap-1 items-center">
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') cancel()
        }}
        onBlur={save}
        className="flex-1 text-sm px-2 py-1 border-[1.5px] border-brand-terracotta rounded-[5px] bg-white text-brand-charcoal font-sans focus:outline-none"
      />
    </div>
  )
}

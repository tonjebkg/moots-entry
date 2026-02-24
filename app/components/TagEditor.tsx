'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus } from 'lucide-react'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  readOnly?: boolean
}

export function TagEditor({ tags, onChange, suggestions = [], readOnly = false }: TagEditorProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
    setShowSuggestions(false)
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addTag(input)
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const filteredSuggestions = suggestions
    .filter(s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 5)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-cream text-ui-secondary text-xs font-medium rounded-full"
          >
            {tag}
            {!readOnly && (
              <button onClick={() => removeTag(tag)} className="text-ui-tertiary hover:text-red-500">
                <X size={12} />
              </button>
            )}
          </span>
        ))}
      </div>
      {!readOnly && (
        <div className="relative">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setShowSuggestions(true)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Add tag..."
            className="w-full px-3 py-1.5 text-sm border border-ui-border rounded-lg focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ui-border rounded-lg shadow-lg z-10">
              {filteredSuggestions.map(s => (
                <button
                  key={s}
                  onMouseDown={() => addTag(s)}
                  className="w-full text-left px-3 py-1.5 text-sm text-ui-secondary hover:bg-brand-cream"
                >
                  <Plus size={12} className="inline mr-1" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

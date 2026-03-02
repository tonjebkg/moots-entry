'use client'

import { useState, useRef, type DragEvent } from 'react'
import { Upload, FileText, Globe, Plus, Trash2, Sparkles, Loader2, Check } from 'lucide-react'
import { CollapsibleSection } from './CollapsibleSection'
import { EventDetailsCard, type EventDetailsData, type EventPartner, type TeamMember } from './EventDetailsCard'
import { GeneratedContextCards } from './GeneratedContextCards'
import type { EventDocument, EventLink, GeneratedContext } from '@/types/context-tab'

interface LeftPanelProps {
  documents: EventDocument[]
  links: EventLink[]
  generatedContext: GeneratedContext | null
  isGenerating: boolean
  isGenerated: boolean
  eventData: EventDetailsData
  onEventUpdate: (key: string, value: string) => void
  onUploadFiles: (files: FileList) => void
  onRemoveDocument: (docId: string) => void
  onAddLink: (url: string) => void
  onRemoveLink: (linkId: string) => void
  onGenerate: () => void
  partners?: EventPartner[]
  onAddPartner?: (partner: Omit<EventPartner, 'id'>) => void
  onRemovePartner?: (id: string) => void
  teamMembers?: TeamMember[]
}

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'text-red-600',
  xlsx: 'text-emerald-700',
  docx: 'text-blue-600',
  pptx: 'text-orange-600',
  csv: 'text-emerald-600',
  txt: 'text-gray-500',
}

export function LeftPanel({
  documents,
  links,
  generatedContext,
  isGenerating,
  isGenerated,
  eventData,
  onEventUpdate,
  onUploadFiles,
  onRemoveDocument,
  onAddLink,
  onRemoveLink,
  onGenerate,
  partners = [],
  onAddPartner,
  onRemovePartner,
  teamMembers = [],
}: LeftPanelProps) {
  const [dragOver, setDragOver] = useState(false)
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files)
    }
  }

  const handleAddLink = () => {
    if (!newUrl.trim()) return
    onAddLink(newUrl.trim())
    setNewUrl('')
    setShowLinkInput(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 pl-6 shrink-0 border-b border-ui-border">
        <h2 className="text-xl font-bold text-brand-charcoal m-0">Event Context</h2>
        <p className="text-[13px] text-ui-tertiary mt-1 mb-0">
          Add documents, links, and information. The more context, the smarter the AI.
        </p>
      </div>

      {/* Scrollable area — pb-20 ensures content isn't obscured by generate button */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pl-6 pb-20">
        {/* Generated Context — top priority */}
        {isGenerated && generatedContext ? (
          <GeneratedContextCards data={generatedContext} />
        ) : (
          <div className="text-center py-7 px-5 text-ui-tertiary bg-white border border-ui-border rounded-[10px] mb-4">
            <div className="mb-1.5 text-brand-terracotta flex justify-center">
              <Sparkles size={22} />
            </div>
            <div className="text-sm font-semibold text-brand-charcoal">
              Generated context will appear here
            </div>
            <div className="text-[13px] mt-1">
              Upload documents and let the AI analyse your event.
            </div>
          </div>
        )}

        {/* Event Details — collapsible, editable */}
        <CollapsibleSection
          title="Event Details"
          icon={<FileText size={15} />}
          badge={
            <span className="inline-flex items-center text-[10px] font-semibold px-[7px] py-px rounded bg-brand-forest/10 text-brand-forest">
              Editable
            </span>
          }
          defaultOpen={!isGenerated}
        >
          <EventDetailsCard
            eventData={eventData}
            onUpdate={onEventUpdate}
            partners={partners}
            onAddPartner={onAddPartner}
            onRemovePartner={onRemovePartner}
            teamMembers={teamMembers}
          />
        </CollapsibleSection>

        {/* Documents — collapsible */}
        <CollapsibleSection
          title="Documents"
          icon={<FileText size={15} />}
          badge={
            documents.length > 0 ? (
              <span className="text-[10px] font-bold bg-brand-forest/10 text-brand-forest px-[7px] py-px rounded-full">
                {documents.length}
              </span>
            ) : undefined
          }
          defaultOpen={!isGenerated}
        >
          {/* Upload zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[10px] py-[18px] px-4 text-center cursor-pointer transition-all mb-2.5 ${
              dragOver
                ? 'border-brand-terracotta bg-brand-terracotta/5'
                : 'border-ui-border bg-brand-cream'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.pptx,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) onUploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <div
              className={`mb-1 flex justify-center ${dragOver ? 'text-brand-terracotta' : 'text-ui-tertiary'}`}
            >
              <Upload size={20} />
            </div>
            <div className="text-[13px] text-brand-charcoal font-medium">
              Drop files here or{' '}
              <span className="text-brand-terracotta font-semibold">browse</span>
            </div>
            <div className="text-[11px] text-[#999] mt-0.5">
              Event briefs, sponsor decks, guest lists, agendas
            </div>
          </div>

          {/* Uploaded files */}
          {documents.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {documents.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between px-2.5 py-2 bg-white rounded-lg border border-ui-border"
                >
                  <div className="flex items-center gap-2">
                    <FileText size={18} className={FILE_TYPE_COLORS[d.type] || 'text-gray-500'} />
                    <div>
                      <div className="text-[13px] font-medium text-brand-charcoal">{d.name}</div>
                      <div className="text-[11px] text-ui-tertiary">{d.sizeFormatted}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {d.status === 'analyzed' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-brand-forest/10 text-brand-forest">
                        <Check size={12} /> Analyzed
                      </span>
                    ) : d.status === 'analyzing' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-brand-terracotta/10 text-brand-terracotta">
                        <Loader2 size={12} className="animate-spin" /> Reading...
                      </span>
                    ) : d.status === 'error' ? (
                      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded bg-red-50 text-red-600">
                        Error
                      </span>
                    ) : d.status === 'uploading' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded bg-gray-100 text-ui-tertiary">
                        <Loader2 size={12} className="animate-spin" /> Uploading
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded bg-[#F0EDEA] text-ui-tertiary">
                        Queued
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveDocument(d.id)
                      }}
                      className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>

        {/* Links & References — collapsible */}
        <CollapsibleSection
          title="Links & References"
          icon={<Globe size={15} />}
          badge={
            links.length > 0 ? (
              <span className="text-[10px] font-bold bg-brand-forest/10 text-brand-forest px-[7px] py-px rounded-full">
                {links.length}
              </span>
            ) : undefined
          }
          defaultOpen={!isGenerated}
        >
          <div className="bg-white border border-ui-border rounded-[10px] p-3">
            <div className={`flex justify-end ${links.length || showLinkInput ? 'mb-2' : ''}`}>
              <button
                onClick={() => setShowLinkInput(true)}
                className="flex items-center gap-1 text-xs text-brand-terracotta bg-transparent border-none cursor-pointer font-semibold"
              >
                <Plus size={14} /> Add
              </button>
            </div>
            {links.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-2 px-2.5 py-1.5 bg-brand-cream rounded-md border border-ui-border mb-1.5"
              >
                <Globe size={15} className="text-brand-terracotta shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-brand-terracotta truncate">
                    {l.label}
                  </div>
                  <div className="text-[11px] text-ui-tertiary truncate">{l.url}</div>
                </div>
                <button
                  onClick={() => onRemoveLink(l.id)}
                  className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {showLinkInput && (
              <div className="flex gap-1.5 mt-1">
                <input
                  autoFocus
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
                  placeholder="Paste a URL..."
                  className="flex-1 text-[13px] py-[7px] px-2.5 border border-ui-border rounded-md font-sans focus:outline-none focus:border-brand-terracotta"
                />
                <button
                  onClick={handleAddLink}
                  className="text-xs py-[7px] px-3.5 border-none rounded-md bg-brand-terracotta text-white cursor-pointer font-semibold"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Generate button — fixed bottom (visible when docs or links exist) */}
      {(documents.length > 0 || links.length > 0) && (
        <div className="px-5 py-3 pb-4 pl-6 border-t border-ui-border bg-white shrink-0">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className={`w-full py-3 px-5 text-[15px] font-bold rounded-[10px] flex items-center justify-center gap-2 font-sans transition-all ${
              isGenerating
                ? 'bg-[#E8E2DA] text-ui-tertiary cursor-default'
                : 'bg-brand-terracotta text-white cursor-pointer hover:bg-brand-terracotta/90 shadow-cta'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analysing documents...
              </>
            ) : isGenerated ? (
              <>
                <Sparkles size={16} /> Re-generate Context
              </>
            ) : (
              <>
                <Sparkles size={16} /> Generate Context
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

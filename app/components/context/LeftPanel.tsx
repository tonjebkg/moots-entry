'use client'

import { useState, useRef, type DragEvent } from 'react'
import { Upload, FileText, Globe, Plus, Trash2, Sparkles, Loader2, Check, Link as LinkIcon } from 'lucide-react'
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

  const hasContent = documents.length > 0 || links.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header — matched height with right panel */}
      <div className="px-6 py-3.5 shrink-0 border-b border-ui-border flex items-center gap-2.5">
        <div className="w-[30px] h-[30px] rounded-full bg-brand-forest/10 flex items-center justify-center shrink-0">
          <FileText size={14} className="text-brand-forest" />
        </div>
        <div>
          <div className="text-sm font-bold text-brand-charcoal">Event Context</div>
          <div className="text-[11px] font-medium text-ui-tertiary">Add documents and links for AI analysis</div>
        </div>
      </div>

      {/* Scrollable area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pl-6 pb-24">

        {/* ─── POST-GENERATION: Generated Context at top ─── */}
        {isGenerated && generatedContext && (
          <GeneratedContextCards data={generatedContext} />
        )}

        {/* ─── EMPTY STATE: Upload zone + Links at top ─── */}
        {!isGenerated && (
          <>
            {/* Upload zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[10px] py-5 px-4 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-brand-terracotta bg-brand-terracotta/5'
                  : 'border-ui-border hover:border-brand-terracotta/30 bg-brand-cream/50'
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
              <div className={`mb-1.5 flex justify-center ${dragOver ? 'text-brand-terracotta' : 'text-ui-tertiary'}`}>
                <Upload size={22} />
              </div>
              <div className="text-[13px] text-brand-charcoal font-medium">
                Drop files here or{' '}
                <span className="text-brand-terracotta font-semibold">browse</span>
              </div>
              <div className="text-[11px] text-[#999] mt-0.5">
                Event briefs, sponsor decks, guest lists, agendas
              </div>
            </div>

            {/* Uploaded files (inline, no collapsible wrapper) */}
            {documents.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2.5">
                {documents.map((d) => (
                  <DocumentRow key={d.id} doc={d} onRemove={onRemoveDocument} />
                ))}
              </div>
            )}

            {/* Links — compact inline section */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <LinkIcon size={13} className="text-ui-tertiary" />
                  <span className="text-[12px] font-semibold text-ui-tertiary">Links</span>
                  {links.length > 0 && (
                    <span className="text-[10px] font-bold text-brand-forest bg-brand-forest/10 px-1.5 py-px rounded-full">
                      {links.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex items-center gap-0.5 text-[11px] text-brand-terracotta bg-transparent border-none cursor-pointer font-semibold font-sans"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {links.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-brand-cream/60 rounded-md border border-ui-border/60 mb-1"
                >
                  <Globe size={13} className="text-brand-terracotta shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-brand-charcoal truncate">{l.label}</div>
                  </div>
                  <button
                    onClick={() => onRemoveLink(l.id)}
                    className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {showLinkInput && (
                <div className="flex gap-1.5 mt-1">
                  <input
                    autoFocus
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLink()
                      if (e.key === 'Escape') { setShowLinkInput(false); setNewUrl('') }
                    }}
                    placeholder="Paste a URL..."
                    className="flex-1 text-[13px] py-[6px] px-2.5 border border-ui-border rounded-md font-sans focus:outline-none focus:border-brand-terracotta"
                  />
                  <button
                    onClick={handleAddLink}
                    className="text-[12px] py-[6px] px-3 border-none rounded-md bg-brand-terracotta text-white cursor-pointer font-semibold font-sans"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── POST-GENERATION: Documents/Links as collapsible ─── */}
        {isGenerated && (
          <>
            <CollapsibleSection
              title="Documents"
              badge={
                documents.length > 0 ? (
                  <span className="text-[10px] font-bold bg-brand-forest/10 text-brand-forest px-1.5 py-px rounded-full">
                    {documents.length}
                  </span>
                ) : undefined
              }
              defaultOpen={false}
            >
              {/* Upload zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg py-3 px-4 text-center cursor-pointer transition-all mb-2 ${
                  dragOver ? 'border-brand-terracotta bg-brand-terracotta/5' : 'border-ui-border bg-brand-cream/50'
                }`}
              >
                <div className="text-[12px] text-brand-charcoal font-medium">
                  Drop files or <span className="text-brand-terracotta font-semibold">browse</span>
                </div>
              </div>
              {documents.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {documents.map((d) => (
                    <DocumentRow key={d.id} doc={d} onRemove={onRemoveDocument} />
                  ))}
                </div>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Links"
              badge={
                links.length > 0 ? (
                  <span className="text-[10px] font-bold bg-brand-forest/10 text-brand-forest px-1.5 py-px rounded-full">
                    {links.length}
                  </span>
                ) : undefined
              }
              defaultOpen={false}
            >
              <div className="flex justify-end mb-1.5">
                <button
                  onClick={() => setShowLinkInput(true)}
                  className="flex items-center gap-0.5 text-[11px] text-brand-terracotta bg-transparent border-none cursor-pointer font-semibold font-sans"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              {links.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-2 px-2.5 py-1.5 bg-brand-cream/60 rounded-md border border-ui-border/60 mb-1"
                >
                  <Globe size={13} className="text-brand-terracotta shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-brand-charcoal truncate">{l.label}</div>
                  </div>
                  <button
                    onClick={() => onRemoveLink(l.id)}
                    className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {showLinkInput && (
                <div className="flex gap-1.5 mt-1">
                  <input
                    autoFocus
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLink()
                      if (e.key === 'Escape') { setShowLinkInput(false); setNewUrl('') }
                    }}
                    placeholder="Paste a URL..."
                    className="flex-1 text-[13px] py-[6px] px-2.5 border border-ui-border rounded-md font-sans focus:outline-none focus:border-brand-terracotta"
                  />
                  <button
                    onClick={handleAddLink}
                    className="text-[12px] py-[6px] px-3 border-none rounded-md bg-brand-terracotta text-white cursor-pointer font-semibold font-sans"
                  >
                    Add
                  </button>
                </div>
              )}
            </CollapsibleSection>
          </>
        )}

        {/* Event Details — always collapsible, collapsed by default */}
        <CollapsibleSection title="Event Details" defaultOpen={false}>
          <EventDetailsCard
            eventData={eventData}
            onUpdate={onEventUpdate}
            teamMembers={teamMembers}
          />
        </CollapsibleSection>

        {/* Partners — collapsible */}
        <CollapsibleSection
          title="Partners"
          badge={
            partners.length > 0 ? (
              <span className="text-[10px] font-bold bg-brand-forest/10 text-brand-forest px-1.5 py-px rounded-full">
                {partners.length}
              </span>
            ) : undefined
          }
          defaultOpen={false}
        >
          <PartnersSection
            partners={partners}
            onAddPartner={onAddPartner}
            onRemovePartner={onRemovePartner}
          />
        </CollapsibleSection>
      </div>

      {/* Generate button — fixed bottom */}
      {(hasContent || isGenerated) && (
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
                <Loader2 size={16} className="animate-spin" /> Analysing...
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

/* ─── Document Row ─── */

function DocumentRow({ doc, onRemove }: { doc: EventDocument; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between px-2.5 py-2 bg-white rounded-lg border border-ui-border">
      <div className="flex items-center gap-2">
        <FileText size={16} className={FILE_TYPE_COLORS[doc.type] || 'text-gray-500'} />
        <div>
          <div className="text-[13px] font-medium text-brand-charcoal">{doc.name}</div>
          <div className="text-[10px] text-ui-tertiary">{doc.sizeFormatted}</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {doc.status === 'analyzed' ? (
          <Check size={14} className="text-brand-forest" />
        ) : doc.status === 'analyzing' ? (
          <Loader2 size={14} className="animate-spin text-brand-terracotta" />
        ) : doc.status === 'error' ? (
          <span className="text-[10px] font-semibold text-red-500">Error</span>
        ) : doc.status === 'uploading' ? (
          <Loader2 size={14} className="animate-spin text-ui-tertiary" />
        ) : null}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(doc.id) }}
          className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

/* ─── Partners Section ─── */

function PartnersSection({
  partners,
  onAddPartner,
  onRemovePartner,
}: {
  partners: EventPartner[]
  onAddPartner?: (partner: Omit<EventPartner, 'id'>) => void
  onRemovePartner?: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState<EventPartner['role']>('Sponsor')
  const [tier, setTier] = useState<EventPartner['tier']>('Gold')

  const handleSubmit = () => {
    if (!name.trim() || !onAddPartner) return
    onAddPartner({ companyName: name.trim(), role, tier })
    setName('')
    setShowForm(false)
  }

  return (
    <div>
      {partners.length === 0 && !showForm && (
        <div className="text-[12px] text-ui-tertiary py-3 text-center">
          No partners yet
        </div>
      )}

      {partners.map((p) => (
        <div
          key={p.id}
          className="flex items-center justify-between px-2.5 py-[7px] bg-brand-cream/60 rounded-md mb-1.5"
        >
          <div>
            <div className="text-[13px] font-medium text-brand-charcoal">{p.companyName}</div>
            <div className="text-[11px] text-ui-tertiary">{p.role} · {p.tier}</div>
          </div>
          {onRemovePartner && (
            <button
              onClick={() => onRemovePartner(p.id)}
              className="bg-transparent border-none cursor-pointer text-[#ccc] hover:text-red-400 p-0.5 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ))}

      {showForm ? (
        <div className="flex flex-col gap-2 p-2.5 bg-brand-cream/40 rounded-lg border border-ui-border mt-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Company name"
            className="text-[13px] px-2.5 py-1.5 border border-ui-border rounded-md bg-white font-sans focus:outline-none focus:border-brand-terracotta"
          />
          <div className="flex gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value as EventPartner['role'])} className="flex-1 text-[12px] px-2 py-1.5 border border-ui-border rounded-md bg-white font-sans focus:outline-none">
              <option value="Sponsor">Sponsor</option>
              <option value="Partner">Partner</option>
              <option value="Co-host">Co-host</option>
              <option value="Venue">Venue</option>
            </select>
            <select value={tier} onChange={(e) => setTier(e.target.value as EventPartner['tier'])} className="flex-1 text-[12px] px-2 py-1.5 border border-ui-border rounded-md bg-white font-sans focus:outline-none">
              <option value="Primary">Primary</option>
              <option value="Gold">Gold</option>
              <option value="Silver">Silver</option>
            </select>
          </div>
          <div className="flex gap-1.5 justify-end">
            <button onClick={() => setShowForm(false)} className="text-[12px] px-3 py-1 rounded-md bg-transparent border border-ui-border text-ui-tertiary cursor-pointer font-sans">Cancel</button>
            <button onClick={handleSubmit} disabled={!name.trim()} className="text-[12px] px-3 py-1 rounded-md bg-brand-terracotta text-white border-none cursor-pointer font-semibold font-sans disabled:opacity-40">Add</button>
          </div>
        </div>
      ) : onAddPartner && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-[11px] text-brand-terracotta bg-transparent border-none cursor-pointer font-semibold font-sans mt-1"
        >
          <Plus size={12} /> Add partner
        </button>
      )}
    </div>
  )
}

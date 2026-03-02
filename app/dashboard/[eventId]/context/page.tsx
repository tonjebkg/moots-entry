'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { LeftPanel } from '@/app/components/context/LeftPanel'
import { RightPanel } from '@/app/components/context/RightPanel'
import {
  useContextGeneration,
  useContextChat,
  useActivityFeed,
  useDocumentUpload,
  useEventLinks,
  useInlineEdit,
} from '@/app/components/context/hooks'
import type { EventDetailsData, EventPartner, TeamMember } from '@/app/components/context/EventDetailsCard'
import type { GeneratedContext, ActivityItem } from '@/types/context-tab'

export default function ContextPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatedContext, setGeneratedContext] = useState<GeneratedContext | null>(null)
  const [isGenerated, setIsGenerated] = useState(false)

  const [eventData, setEventData] = useState<EventDetailsData>({
    name: '',
    type: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: '',
    venueName: '',
    city: '',
    state: '',
    capacity: '',
    hostingCompany: '',
    dressCode: '',
    description: '',
    image: '',
    isPrivate: false,
  })
  const [partners, setPartners] = useState<EventPartner[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Hooks
  const { generate, isGenerating } = useContextGeneration(eventId)
  const { sendMessage, isSending } = useContextChat(eventId)
  const { documents, setDocuments, uploadFiles, updateDocStatus, removeDocument } = useDocumentUpload(eventId)
  const { links, setLinks, addLink, removeLink } = useEventLinks(eventId)
  const { updateField } = useInlineEdit(eventId)
  const {
    activities,
    setActivities,
    addActivity,
    clearActivities,
    feedRef,
    bottomRef,
    handleScroll,
    scrollToBottom,
    userScrolled,
    enableAutoScroll,
  } = useActivityFeed()

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true)
        setError(null)

        const [eventRes, contextRes, docsRes, linksRes, activitiesRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/generated-context`),
          fetch(`/api/events/${eventId}/documents`),
          fetch(`/api/events/${eventId}/links`),
          fetch(`/api/events/${eventId}/context/activities`),
        ])

        // Event details
        if (eventRes.ok) {
          const data = await eventRes.json()
          const event = data.event || data
          const loc = typeof event.location === 'string' ? (() => { try { return JSON.parse(event.location) } catch { return null } })() : event.location

          // Extract date parts from ISO strings
          const startDateISO = event.start_date ? event.start_date.split('T')[0] : ''
          const endDateISO = event.end_date ? event.end_date.split('T')[0] : ''

          // Extract time from ISO or use stored time
          function isoToTime(iso: string): string {
            if (!iso) return ''
            try {
              const d = new Date(iso)
              const h = d.getHours()
              const m = d.getMinutes()
              const ampm = h >= 12 ? 'PM' : 'AM'
              const h12 = h % 12 || 12
              return `${h12}:${m < 10 ? '0' : ''}${m} ${ampm}`
            } catch { return '' }
          }

          setEventData({
            name: event.title || '',
            type: event.event_type || event.type || '',
            startDate: startDateISO,
            startTime: event.start_time || isoToTime(event.start_date),
            endDate: endDateISO,
            endTime: event.end_time || isoToTime(event.end_date),
            timezone: event.timezone || '',
            venueName: loc?.venue_name || '',
            city: loc?.city || '',
            state: loc?.state_province || '',
            capacity: event.total_capacity ? String(event.total_capacity) : '',
            hostingCompany: event.hosting_company || event.hosts?.[0]?.name || '',
            dressCode: event.dress_code || '',
            description: event.description || '',
            image: event.image_url || '',
            isPrivate: event.is_private || false,
          })

          // Load sponsors as partners if present
          if (event.sponsors?.length) {
            setPartners(event.sponsors.map((s: any, i: number) => ({
              id: `sponsor-${i}`,
              companyName: s.name || s.company_name || '',
              role: s.role || 'Sponsor',
              tier: s.tier || 'Gold',
            })))
          }
        }

        // Generated context
        if (contextRes.ok) {
          const data = await contextRes.json()
          if (data.context) {
            setGeneratedContext(data.context)
            setIsGenerated(true)
          }
        }

        // Documents
        if (docsRes.ok) {
          const data = await docsRes.json()
          if (data.documents) setDocuments(data.documents)
        }

        // Links
        if (linksRes.ok) {
          const data = await linksRes.json()
          if (data.links) setLinks(data.links)
        }

        // Activities
        if (activitiesRes.ok) {
          const data = await activitiesRes.json()
          if (data.activities?.length > 0) {
            setActivities(data.activities)
          } else {
            // Initial waiting state
            setActivities([
              {
                id: 'initial',
                eventId,
                type: 'waiting',
                text: "Drop documents, add links, or share any information about your event. I'll analyse everything and build a rich context that powers all my recommendations — guest scoring, invitations, briefings, and more.",
                timestamp: new Date().toISOString(),
              },
            ])
          }
        } else {
          setActivities([
            {
              id: 'initial',
              eventId,
              type: 'waiting',
              text: "Drop documents, add links, or share any information about your event. I'll analyse everything and build a rich context that powers all my recommendations — guest scoring, invitations, briefings, and more.",
              timestamp: new Date().toISOString(),
            },
          ])
        }
      } catch (err) {
        console.error('Failed to load context data:', err)
        setError('Failed to load context data')
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [eventId, setDocuments, setLinks, setActivities])

  // Event detail inline edit
  const handleEventUpdate = useCallback(
    (key: string, value: string) => {
      if (key === 'isPrivate') {
        setEventData((prev) => ({ ...prev, isPrivate: value === 'true' }))
        updateField(key, value)
      } else {
        setEventData((prev) => ({ ...prev, [key]: value }))
        updateField(key, value)
      }
    },
    [updateField]
  )

  // Partner management (local state — saved with context generation)
  const handleAddPartner = useCallback((partner: Omit<EventPartner, 'id'>) => {
    setPartners((prev) => [...prev, { ...partner, id: crypto.randomUUID() }])
  }, [])

  const handleRemovePartner = useCallback((id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // Generate context
  const handleGenerate = useCallback(() => {
    enableAutoScroll()
    clearActivities()

    generate({
      onActivity: (item: ActivityItem) => addActivity(item),
      onDocStatus: (docId: string, status) => updateDocStatus(docId, status),
      onContextGenerated: (ctx: GeneratedContext) => {
        setGeneratedContext(ctx)
        setIsGenerated(true)
      },
      onError: (msg: string) => {
        addActivity({
          id: crypto.randomUUID(),
          eventId,
          type: 'insight',
          text: `Error: ${msg}`,
          timestamp: new Date().toISOString(),
        })
      },
      onDone: () => {
        addActivity({
          id: crypto.randomUUID(),
          eventId,
          type: 'complete',
          text: 'Context generation complete.',
          timestamp: new Date().toISOString(),
        })
      },
    })
  }, [eventId, generate, enableAutoScroll, clearActivities, addActivity, updateDocStatus])

  // Chat send
  const handleSend = useCallback(
    (message: string) => {
      enableAutoScroll()

      // Optimistic user message
      addActivity({
        id: crypto.randomUUID(),
        eventId,
        type: 'user',
        text: message,
        timestamp: new Date().toISOString(),
      })

      sendMessage(message, {
        onActivity: (item: ActivityItem) => addActivity(item),
        onError: (msg: string) => {
          addActivity({
            id: crypto.randomUUID(),
            eventId,
            type: 'insight',
            text: `Error: ${msg}`,
            timestamp: new Date().toISOString(),
          })
        },
        onDone: () => {},
      })
    },
    [eventId, sendMessage, enableAutoScroll, addActivity]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading context...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3">
        <AlertCircle size={32} className="text-red-400" />
        <div className="text-ui-secondary text-sm font-medium">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium text-brand-terracotta hover:bg-brand-terracotta/5 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="-mx-8 -my-8 -mb-36">
      <div className="grid grid-cols-2 h-[calc(100vh-210px)]">
        {/* Left Panel — Event Context */}
        <div className="border-r border-ui-border overflow-hidden bg-white">
          <LeftPanel
            documents={documents}
            links={links}
            generatedContext={generatedContext}
            isGenerating={isGenerating}
            isGenerated={isGenerated}
            eventData={eventData}
            onEventUpdate={handleEventUpdate}
            onUploadFiles={uploadFiles}
            onRemoveDocument={removeDocument}
            onAddLink={addLink}
            onRemoveLink={removeLink}
            onGenerate={handleGenerate}
            partners={partners}
            onAddPartner={handleAddPartner}
            onRemovePartner={handleRemovePartner}
            teamMembers={teamMembers}
          />
        </div>

        {/* Right Panel — AI Activity Feed */}
        <div className="overflow-hidden">
          <RightPanel
            activities={activities}
            feedRef={feedRef}
            bottomRef={bottomRef}
            userScrolled={userScrolled}
            onScroll={handleScroll}
            onScrollToBottom={scrollToBottom}
            onSend={handleSend}
            isProcessing={isGenerating || isSending}
            hasGeneratedContext={isGenerated}
          />
        </div>
      </div>
    </div>
  )
}

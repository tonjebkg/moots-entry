'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type {
  ActivityItem,
  EventDocument,
  EventLink,
  GeneratedContext,
  DocumentStatus,
  SSEEvent,
} from '@/types/context-tab'

/* ─── useContextGeneration ─── */
export function useContextGeneration(eventId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(
    (callbacks: {
      onActivity: (item: ActivityItem) => void
      onDocStatus: (docId: string, status: DocumentStatus) => void
      onContextGenerated: (ctx: GeneratedContext) => void
      onError: (msg: string) => void
      onDone: () => void
    }) => {
      if (isGenerating) return

      setIsGenerating(true)
      const controller = new AbortController()
      abortRef.current = controller

      fetch(`/api/events/${eventId}/context/generate`, {
        method: 'POST',
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Generation failed' }))
            callbacks.onError(err.error || 'Generation failed')
            setIsGenerating(false)
            return
          }

          const reader = res.body?.getReader()
          if (!reader) {
            callbacks.onError('No response stream')
            setIsGenerating(false)
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const json = line.slice(6).trim()
              if (!json) continue

              try {
                const event: SSEEvent = JSON.parse(json)
                switch (event.type) {
                  case 'activity':
                    callbacks.onActivity(event.data)
                    break
                  case 'doc_status':
                    callbacks.onDocStatus(event.data.docId, event.data.status)
                    break
                  case 'context_generated':
                    callbacks.onContextGenerated(event.data)
                    break
                  case 'error':
                    callbacks.onError(event.data.message)
                    break
                  case 'done':
                    callbacks.onDone()
                    break
                }
              } catch {
                // Skip malformed lines
              }
            }
          }

          setIsGenerating(false)
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            callbacks.onError('Connection lost')
          }
          setIsGenerating(false)
        })
    },
    [eventId, isGenerating]
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setIsGenerating(false)
  }, [])

  return { generate, cancel, isGenerating }
}

/* ─── useContextChat ─── */
export function useContextChat(eventId: string) {
  const [isSending, setIsSending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    (
      message: string,
      callbacks: {
        onActivity: (item: ActivityItem) => void
        onError: (msg: string) => void
        onDone: () => void
      }
    ) => {
      if (isSending) return

      setIsSending(true)
      const controller = new AbortController()
      abortRef.current = controller

      fetch(`/api/events/${eventId}/context/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            callbacks.onError('Chat failed')
            setIsSending(false)
            return
          }

          const reader = res.body?.getReader()
          if (!reader) {
            callbacks.onError('No response stream')
            setIsSending(false)
            return
          }

          const decoder = new TextDecoder()
          let buffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const json = line.slice(6).trim()
              if (!json) continue

              try {
                const event = JSON.parse(json)
                if (event.type === 'activity') {
                  callbacks.onActivity(event.data)
                } else if (event.type === 'error') {
                  callbacks.onError(event.data.message)
                } else if (event.type === 'done') {
                  callbacks.onDone()
                }
              } catch {
                // Skip malformed lines
              }
            }
          }

          setIsSending(false)
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            callbacks.onError('Connection lost')
          }
          setIsSending(false)
        })
    },
    [eventId, isSending]
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    setIsSending(false)
  }, [])

  return { sendMessage, cancel, isSending }
}

/* ─── useActivityFeed ─── */
export function useActivityFeed(initialActivities: ActivityItem[] = []) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities)
  const [userScrolled, setUserScrolled] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null!)
  const bottomRef = useRef<HTMLDivElement>(null!)

  const addActivity = useCallback((item: ActivityItem) => {
    setActivities((prev) => [...prev, item])
  }, [])

  const clearActivities = useCallback(() => {
    setActivities([])
  }, [])

  const enableAutoScroll = useCallback(() => {
    setShouldAutoScroll(true)
    setUserScrolled(false)
  }, [])

  const handleScroll = useCallback(() => {
    if (!feedRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = feedRef.current
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setUserScrolled(!isNearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setUserScrolled(false)
  }, [])

  // Auto-scroll on new activities
  useEffect(() => {
    if (!userScrolled && shouldAutoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activities, shouldAutoScroll, userScrolled])

  return {
    activities,
    setActivities,
    addActivity,
    clearActivities,
    feedRef,
    bottomRef,
    handleScroll,
    scrollToBottom,
    userScrolled,
    shouldAutoScroll,
    enableAutoScroll,
  }
}

/* ─── useDocumentUpload ─── */
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_TYPES = ['pdf', 'docx', 'xlsx', 'pptx', 'csv', 'txt']

function getFileType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return ext
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function useDocumentUpload(eventId: string) {
  const [documents, setDocuments] = useState<EventDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      const validFiles: File[] = []

      for (const file of fileArray) {
        const ext = getFileType(file.name)
        if (!ALLOWED_TYPES.includes(ext)) {
          continue // Skip invalid types silently
        }
        if (file.size > MAX_FILE_SIZE) {
          continue // Skip oversized files
        }
        validFiles.push(file)
      }

      if (validFiles.length === 0) return

      setIsUploading(true)

      // Add optimistic entries
      const tempDocs: EventDocument[] = validFiles.map((file) => ({
        id: `temp-${crypto.randomUUID()}`,
        eventId,
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: getFileType(file.name) as EventDocument['type'],
        blobUrl: '',
        status: 'uploading' as const,
        createdAt: new Date().toISOString(),
      }))

      setDocuments((prev) => [...prev, ...tempDocs])

      // Upload in parallel
      await Promise.allSettled(
        validFiles.map(async (file, i) => {
          const tempId = tempDocs[i].id
          try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch(`/api/events/${eventId}/documents/upload`, {
              method: 'POST',
              body: formData,
            })

            if (!res.ok) throw new Error('Upload failed')

            const data = await res.json()

            // Replace temp doc with real one
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? {
                      ...d,
                      id: data.id,
                      blobUrl: data.blobUrl || '',
                      status: 'queued' as const,
                    }
                  : d
              )
            )
          } catch {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? { ...d, status: 'error' as const, errorMessage: 'Upload failed' }
                  : d
              )
            )
          }
        })
      )

      setIsUploading(false)
    },
    [eventId]
  )

  const updateDocStatus = useCallback((docId: string, status: DocumentStatus) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, status, ...(status === 'analyzed' ? { analyzedAt: new Date().toISOString() } : {}) }
          : d
      )
    )
  }, [])

  const removeDocument = useCallback(
    async (docId: string) => {
      setDocuments((prev) => prev.filter((d) => d.id !== docId))

      // Fire and forget delete
      fetch(`/api/events/${eventId}/documents/${docId}`, {
        method: 'DELETE',
      }).catch(() => {
        // Silently fail — document already removed from UI
      })
    },
    [eventId]
  )

  return { documents, setDocuments, uploadFiles, updateDocStatus, removeDocument, isUploading }
}

/* ─── useEventLinks ─── */
export function useEventLinks(eventId: string) {
  const [links, setLinks] = useState<EventLink[]>([])

  const addLink = useCallback(
    async (url: string) => {
      const fullUrl = url.startsWith('http') ? url : `https://${url}`
      let label: string
      try {
        label = new URL(fullUrl).hostname
      } catch {
        label = fullUrl
      }

      const tempLink: EventLink = {
        id: `temp-${crypto.randomUUID()}`,
        eventId,
        url: fullUrl,
        label,
        createdAt: new Date().toISOString(),
      }

      setLinks((prev) => [...prev, tempLink])

      try {
        const res = await fetch(`/api/events/${eventId}/links`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: fullUrl, label }),
        })

        if (res.ok) {
          const data = await res.json()
          setLinks((prev) =>
            prev.map((l) => (l.id === tempLink.id ? { ...l, id: data.id } : l))
          )
        }
      } catch {
        // Keep optimistic entry
      }
    },
    [eventId]
  )

  const removeLink = useCallback(
    async (linkId: string) => {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))

      fetch(`/api/events/${eventId}/links`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: linkId }),
      }).catch(() => {})
    },
    [eventId]
  )

  return { links, setLinks, addLink, removeLink }
}

/* ─── useInlineEdit ─── */
export function useInlineEdit(eventId: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateField = useCallback(
    (field: string, value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      debounceRef.current = setTimeout(async () => {
        try {
          await fetch(`/api/events/${eventId}/details`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ field, value }),
          })
        } catch {
          // Optimistic — value already shown in UI
        }
      }, 300)
    },
    [eventId]
  )

  return { updateField }
}

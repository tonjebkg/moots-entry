'use client'

import { useRef, useEffect, type ReactNode } from 'react'
import { useEventScroll } from '@/app/components/EventScrollContext'

interface EventHeaderObserverProps {
  children: ReactNode
}

/**
 * Observes when the event header fully exits the viewport (behind the fixed nav).
 * The sentinel is placed at the BOTTOM of the header so condensed info only
 * appears after the entire header has scrolled away — iOS Contacts style.
 */
export function EventHeaderObserver({ children }: EventHeaderObserverProps) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { setIsStuck } = useEventScroll()

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(!entry.isIntersecting)
      },
      // 67px offset = height of fixed DashboardHeader
      { threshold: 0, rootMargin: '-67px 0px 0px 0px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [setIsStuck])

  return (
    <>
      {children}
      {/* Sentinel at bottom of event header — triggers only when fully scrolled away */}
      <div ref={sentinelRef} className="h-0 w-0 overflow-hidden" aria-hidden />
    </>
  )
}

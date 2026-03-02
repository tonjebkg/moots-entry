'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface EventScrollState {
  isStuck: boolean
  setIsStuck: (stuck: boolean) => void
}

const EventScrollContext = createContext<EventScrollState>({
  isStuck: false,
  setIsStuck: () => {},
})

export function EventScrollProvider({ children }: { children: ReactNode }) {
  const [isStuck, setIsStuck] = useState(false)
  return (
    <EventScrollContext.Provider value={{ isStuck, setIsStuck }}>
      {children}
    </EventScrollContext.Provider>
  )
}

export function useEventScroll() {
  return useContext(EventScrollContext)
}

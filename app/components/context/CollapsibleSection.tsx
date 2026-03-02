'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}

export function CollapsibleSection({ title, icon, badge, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full bg-transparent border-none cursor-pointer py-1.5 px-0"
      >
        <ChevronRight
          size={12}
          className={`text-ui-tertiary shrink-0 transition-transform duration-150 ${
            open ? 'rotate-90' : 'rotate-0'
          }`}
        />
        {icon && <span className="text-ui-tertiary flex items-center">{icon}</span>}
        <span className="text-[13px] font-semibold tracking-wide uppercase text-ui-tertiary">
          {title}
        </span>
        {badge}
      </button>
      {open && <div className="pt-1.5">{children}</div>}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, Edit2, ChevronDown, Check, Loader2 } from 'lucide-react'
import { CollaboratorAvatarStack } from '@/app/components/CollaboratorAvatarStack'
import { AvatarInitials } from '@/app/components/ui/AvatarInitials'
import { useEventScroll } from '@/app/components/EventScrollContext'
import { EditEventModal } from '@/app/components/EditEventModal'

interface Workspace {
  id: string
  name: string
  slug: string
  role: string
}

interface SessionData {
  userName: string | null
  currentWorkspace: Workspace | null
}

function useHeaderSession(): SessionData {
  const [userName, setUserName] = useState<string | null>(null)
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          setUserName(data.user?.full_name ?? null)
          setCurrentWorkspace({
            id: data.workspace.id,
            name: data.workspace.name,
            slug: data.workspace.slug,
            role: data.role,
          })
        }
      } catch {
        // silently fail
      }
    }
    load()
  }, [])

  return { userName, currentWorkspace }
}

function WorkspaceSwitcher({ currentWorkspace }: { currentWorkspace: Workspace | null }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workspaces')
        if (res.ok) {
          const data = await res.json()
          setWorkspaces(data.workspaces)
        }
      } catch {
        // silently fail
      }
    }
    load()
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  async function handleSwitch(workspaceId: string) {
    if (switching || workspaceId === currentWorkspace?.id) {
      setOpen(false)
      return
    }
    setSwitching(true)
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: workspaceId }),
      })
      if (res.ok) {
        window.location.href = '/dashboard'
      } else {
        setSwitching(false)
      }
    } catch {
      setSwitching(false)
    }
  }

  if (!currentWorkspace) return null

  const roleBadgeColor: Record<string, string> = {
    owner: 'bg-brand-terracotta/10 text-brand-terracotta',
    admin: 'bg-brand-forest/10 text-brand-forest',
    team_member: 'bg-blue-50 text-blue-700',
    viewer: 'bg-gray-100 text-gray-600',
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => !switching && setOpen(!open)}
        disabled={switching}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-brand-charcoal rounded-lg border border-transparent hover:border-ui-border transition-colors max-w-[180px]"
      >
        <span className="truncate">{currentWorkspace.name}</span>
        {switching ? (
          <Loader2 size={14} className="shrink-0 animate-spin text-ui-tertiary" />
        ) : (
          <ChevronDown size={14} className="shrink-0 text-ui-tertiary" />
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-ui-border z-50 py-1 overflow-hidden">
          <div className="px-3 py-2 border-b border-ui-border">
            <p className="text-xs font-medium text-ui-tertiary uppercase tracking-wide">Workspaces</p>
          </div>
          {workspaces.map((ws) => {
            const isCurrent = ws.id === currentWorkspace.id
            return (
              <button
                key={ws.id}
                onClick={() => handleSwitch(ws.id)}
                disabled={switching}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-brand-cream/60 transition-colors disabled:opacity-50"
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isCurrent ? 'font-semibold text-brand-charcoal' : 'font-medium text-brand-charcoal'}`}>
                    {ws.name}
                  </p>
                  <span className={`inline-block mt-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${roleBadgeColor[ws.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ws.role.replace('_', ' ')}
                  </span>
                </div>
                {isCurrent && <Check size={16} className="shrink-0 text-brand-terracotta" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface EventInfo {
  title: string
  location: string
  date: string
  eventId: string
}

interface DashboardHeaderProps {
  activeNav?: 'events' | 'people'
  rightSlot?: React.ReactNode
  userName?: string
  teamMembers?: TeamMember[]
  eventInfo?: EventInfo
}

export function DashboardHeader({ activeNav, rightSlot, userName: userNameProp, teamMembers = [], eventInfo }: DashboardHeaderProps) {
  const pathname = usePathname()
  const { isStuck } = useEventScroll()
  const [showEditModal, setShowEditModal] = useState(false)
  const session = useHeaderSession()

  // Server-provided prop wins; fall back to client-fetched session
  const userName = userNameProp ?? session.userName

  // Auto-detect active nav from pathname if not explicitly set
  const active = activeNav ?? (pathname?.startsWith('/dashboard/people') ? 'people' : 'events')

  const showCondensed = isStuck && eventInfo

  return (
    <header className="fixed top-0 left-0 right-0 bg-white border-b border-ui-border z-50">
      <div className="px-8 py-4 flex items-center">
        <div className="flex items-center gap-8 shrink-0">
          <Link href="/dashboard" className="font-display text-2xl font-bold text-brand-charcoal hover:text-brand-terracotta transition-colors">
            Moots
          </Link>

          <nav className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-base font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'events'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              Events
            </Link>
            <Link
              href="/dashboard/people"
              className={`text-base font-semibold pb-0.5 border-b-2 transition-colors ${
                active === 'people'
                  ? 'text-brand-terracotta border-brand-terracotta'
                  : 'text-ui-tertiary border-transparent hover:text-brand-charcoal'
              }`}
            >
              People
            </Link>
          </nav>
        </div>

        {/* Center: condensed event info — appears inline when event header scrolls away */}
        <div className="flex-1 min-w-0 px-6">
          {showCondensed && (
            <p className="text-sm font-medium text-brand-charcoal truncate text-center">
              {eventInfo.title}
              <span className="text-ui-tertiary font-normal">
                {' '}&middot; {eventInfo.location} &middot; {eventInfo.date}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {showCondensed && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-ui-border hover:border-brand-terracotta text-brand-charcoal text-sm font-semibold rounded-lg transition-colors"
            >
              <Edit2 size={14} />
              Edit Event
            </button>
          )}
          {rightSlot}
          <WorkspaceSwitcher currentWorkspace={session.currentWorkspace} />
          <Link
            href="/dashboard/settings"
            className="p-2 text-ui-tertiary hover:text-brand-terracotta transition-colors rounded-lg hover:bg-brand-cream"
            title="Settings"
          >
            <Settings size={18} />
          </Link>
          {userName ? (
            <AvatarInitials name={userName} size={32} />
          ) : null}
        </div>
      </div>

      {showEditModal && eventInfo && (
        <EditEventModal
          eventId={eventInfo.eventId}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false)
            window.location.reload()
          }}
        />
      )}
    </header>
  )
}

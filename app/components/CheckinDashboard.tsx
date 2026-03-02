'use client'

import React, { useEffect, useState, useMemo, useCallback, useRef, forwardRef, useImperativeHandle } from 'react'
import {
  Search, AlertCircle, CheckCircle, ChevronDown,
  MoreHorizontal, X, Users, Undo2
} from 'lucide-react'
import { CheckinMetricsBar } from './CheckinMetricsBar'
import { WalkInForm } from './WalkInForm'
import { DossierPanel } from './DossierPanel'
import { DoorCheckinLink } from './DoorCheckinLink'
import { AvatarInitials } from './ui/AvatarInitials'
import { TagBadge } from './ui/TagBadge'
import { formatUSTime } from '@/lib/datetime'
import type { CheckinMetrics, EventCheckin, NotArrivedGuest } from '@/types/phase3'

// ─── Types ──────────────────────────────────────────────────────────────

interface CheckinDashboardProps {
  eventId: string
  seatingFormat: 'STANDING' | 'SEATED' | 'MIXED'
  tables: { number: number; seats: number }[]
}

export interface CheckinDashboardHandle {
  refresh: () => void
  openWalkIn: () => void
  openDoorLink: () => void
}

type CheckinStatus = 'CHECKED_IN' | 'NOT_ARRIVED' | 'WALK_IN' | 'NO_SHOW'
type StatusFilter = 'all' | 'not_arrived' | 'checked_in' | 'walk_ins'
type SortColumn = 'name' | 'company' | 'title' | 'role' | 'priority' | 'tags' | 'assigned_to' | 'status' | 'time' | 'table'

interface CheckinRow {
  id: string
  contact_id: string | null
  invitation_id: string | null
  full_name: string
  company: string | null
  title: string | null
  guest_role: string | null
  guest_priority: string | null
  tags: string[]
  assigned_team_member: string | null
  table_assignment: number | null
  status: CheckinStatus
  checked_in_at: string | null
  talking_points: string[] | null
  notes: string | null
  source: string | null
}

interface WorkspaceMember {
  user_id: string
  user_full_name: string
  user_email: string
  role: string
}

// ─── Constants ──────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  TEAM_MEMBER: 'Team', PARTNER: 'Partner', CO_HOST: 'Co-host', SPEAKER: 'Speaker', TALENT: 'Talent',
  LP: 'LP', GP: 'GP', ADVISOR: 'Advisor',
}

const PRIORITY_LABELS: Record<string, string> = {
  VIP: 'VIP', TIER_1: 'Tier 1', TIER_2: 'Tier 2', TIER_3: 'Tier 3', WAITLIST: 'Waitlist',
}

// ─── Component ──────────────────────────────────────────────────────────

export const CheckinDashboard = forwardRef<CheckinDashboardHandle, CheckinDashboardProps>(
  function CheckinDashboard({ eventId, seatingFormat, tables }, ref) {
  // Data
  const [metrics, setMetrics] = useState<CheckinMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([])
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Table
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>('time')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Dropdowns
  const [actionMenuId, setActionMenuId] = useState<string | null>(null)
  const [rowAssignDropdown, setRowAssignDropdown] = useState<string | null>(null)
  const [rowTableDropdown, setRowTableDropdown] = useState<string | null>(null)
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false)
  const [bulkTableOpen, setBulkTableOpen] = useState(false)

  // Inline column dropdowns (Fix 2)
  const [inlineAssignId, setInlineAssignId] = useState<string | null>(null)

  // Fixed-position dropdown coords (avoid clip from overflow-hidden)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; flip: boolean } | null>(null)
  const [inlineAssignPos, setInlineAssignPos] = useState<{ top: number; left: number; flip: boolean } | null>(null)
  const [subMenuPos, setSubMenuPos] = useState<{ top: number; left: number; flip: boolean } | null>(null)
  const actionBtnRef = useRef<HTMLButtonElement | null>(null)
  const inlineAssignBtnRef = useRef<HTMLButtonElement | null>(null)

  // Undo check-in confirm (Fix 3)
  const [undoConfirmId, setUndoConfirmId] = useState<string | null>(null)
  const [undoingIds, setUndoingIds] = useState<Set<string>>(new Set())

  // Column visibility
  const [showTableColumn] = useState(seatingFormat !== 'STANDING')

  // Modals
  const [showWalkIn, setShowWalkIn] = useState(false)
  const [showDoorLink, setShowDoorLink] = useState(false)
  const [dossierContactId, setDossierContactId] = useState<string | null>(null)

  // Plus-one toast
  const [lastCheckedIn, setLastCheckedIn] = useState<{ name: string; contactId: string } | null>(null)
  const [plusOneMode, setPlusOneMode] = useState(false)

  // In-progress actions
  const [checkingInIds, setCheckingInIds] = useState<Set<string>>(new Set())

  // No-show tracking (local state since API may not track this)
  const [noShowIds, setNoShowIds] = useState<Set<string>>(new Set())

  // ─── Fixed-position dropdown helper ────────────────────────────────
  const calcDropdownPos = useCallback((
    trigger: HTMLElement,
    dropdownHeight: number,
    align: 'left' | 'right' = 'left',
    dropdownWidth = 208
  ) => {
    const rect = trigger.getBoundingClientRect()
    const flip = rect.bottom + dropdownHeight + 4 > window.innerHeight
    return {
      top: flip ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
      left: align === 'right' ? rect.right - dropdownWidth : rect.left,
      flip,
    }
  }, [])

  const calcSubMenuPos = useCallback((
    parentItem: HTMLElement,
    subHeight: number,
    subWidth = 208
  ) => {
    const rect = parentItem.getBoundingClientRect()
    const flipH = rect.right + subWidth + 4 > window.innerWidth
    const flipV = rect.top + subHeight > window.innerHeight
    return {
      top: flipV ? Math.max(8, window.innerHeight - subHeight - 8) : rect.top,
      left: flipH ? rect.left - subWidth - 4 : rect.right + 4,
      flip: flipV,
    }
  }, [])

  // ─── Imperative Handle (Fix 1) ─────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`)
      if (res.ok) {
        setMetrics(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useImperativeHandle(ref, () => ({
    refresh: fetchMetrics,
    openWalkIn: () => setShowWalkIn(true),
    openDoorLink: () => setShowDoorLink(true),
  }), [fetchMetrics])

  // ─── Data Fetching ──────────────────────────────────────────────────

  const fetchWorkspaceMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/team-members`)
      if (res.ok) {
        const data = await res.json()
        setWorkspaceMembers(data.members || [])
      }
    } catch (err) {
      console.error('Failed to fetch workspace members:', err)
    }
  }, [eventId])

  useEffect(() => {
    fetchMetrics()
    fetchWorkspaceMembers()
    const interval = setInterval(fetchMetrics, 15000)
    return () => clearInterval(interval)
  }, [fetchMetrics, fetchWorkspaceMembers])

  // ─── Unified Row Model ──────────────────────────────────────────────

  const rows: CheckinRow[] = useMemo(() => {
    if (!metrics) return []

    const checkinRows: CheckinRow[] = metrics.recent_checkins.map((c: EventCheckin) => ({
      id: c.id,
      contact_id: c.contact_id,
      invitation_id: c.invitation_id,
      full_name: c.full_name,
      company: c.company,
      title: c.title,
      guest_role: c.guest_role || null,
      guest_priority: c.guest_priority || null,
      tags: c.tags || [],
      assigned_team_member: c.assigned_team_member || null,
      table_assignment: c.table_assignment || null,
      status: c.source === 'WALK_IN' ? 'WALK_IN' as const : 'CHECKED_IN' as const,
      checked_in_at: c.created_at,
      talking_points: c.talking_points || null,
      notes: c.notes,
      source: c.source,
    }))

    const notArrivedRows: CheckinRow[] = (metrics.not_arrived_guests || []).map((g: NotArrivedGuest) => ({
      id: `na-${g.contact_id}`,
      contact_id: g.contact_id,
      invitation_id: null,
      full_name: g.full_name,
      company: g.company,
      title: g.title,
      guest_role: g.guest_role || null,
      guest_priority: g.guest_priority || null,
      tags: g.tags || [],
      assigned_team_member: g.assigned_team_member || null,
      table_assignment: g.table_assignment,
      status: noShowIds.has(`na-${g.contact_id}`) ? 'NO_SHOW' as const : 'NOT_ARRIVED' as const,
      checked_in_at: null,
      talking_points: null,
      notes: null,
      source: null,
    }))

    return [...checkinRows, ...notArrivedRows]
  }, [metrics, noShowIds])

  // ─── Filtering & Sorting ──────────────────────────────────────────

  const filteredRows = useMemo(() => {
    let result = rows

    // Status filter
    if (statusFilter === 'not_arrived') {
      result = result.filter(r => r.status === 'NOT_ARRIVED' || r.status === 'NO_SHOW')
    } else if (statusFilter === 'checked_in') {
      result = result.filter(r => r.status === 'CHECKED_IN')
    } else if (statusFilter === 'walk_ins') {
      result = result.filter(r => r.status === 'WALK_IN')
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r =>
        r.full_name.toLowerCase().includes(q) ||
        (r.company || '').toLowerCase().includes(q) ||
        (r.title || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [rows, statusFilter, searchQuery])

  const PRIORITY_ORDER: Record<string, number> = { VIP: 0, TIER_1: 1, TIER_2: 2, TIER_3: 3, WAITLIST: 4 }
  const STATUS_ORDER: Record<string, number> = { CHECKED_IN: 0, WALK_IN: 1, NOT_ARRIVED: 2, NO_SHOW: 3 }

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows]
    const dir = sortDirection === 'asc' ? 1 : -1

    sorted.sort((a, b) => {
      // Not-arrived rows always go to the bottom when sorting by time (default)
      if (sortColumn === 'time') {
        const aHasTime = a.checked_in_at !== null
        const bHasTime = b.checked_in_at !== null
        if (aHasTime && !bHasTime) return -1
        if (!aHasTime && bHasTime) return 1
        if (!aHasTime && !bHasTime) return a.full_name.localeCompare(b.full_name)
        return dir * (new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime())
      }

      switch (sortColumn) {
        case 'name':
          return dir * a.full_name.localeCompare(b.full_name)
        case 'company':
          return dir * (a.company || '').localeCompare(b.company || '')
        case 'title':
          return dir * (a.title || '').localeCompare(b.title || '')
        case 'role':
          return dir * (a.guest_role || '').localeCompare(b.guest_role || '')
        case 'priority': {
          const aP = PRIORITY_ORDER[a.guest_priority || ''] ?? 99
          const bP = PRIORITY_ORDER[b.guest_priority || ''] ?? 99
          return dir * (aP - bP)
        }
        case 'tags':
          return dir * (a.tags[0] || '').localeCompare(b.tags[0] || '')
        case 'assigned_to': {
          // Unassigned ("—") always at the bottom
          if (!a.assigned_team_member && b.assigned_team_member) return 1
          if (a.assigned_team_member && !b.assigned_team_member) return -1
          return dir * (a.assigned_team_member || '').localeCompare(b.assigned_team_member || '')
        }
        case 'status': {
          const aS = STATUS_ORDER[a.status] ?? 99
          const bS = STATUS_ORDER[b.status] ?? 99
          return dir * (aS - bS)
        }
        case 'table':
          return dir * ((a.table_assignment ?? 0) - (b.table_assignment ?? 0))
        default:
          return 0
      }
    })

    return sorted
  }, [filteredRows, sortColumn, sortDirection])

  // ─── Counts ──────────────────────────────────────────────────────

  const counts = useMemo(() => {
    const all = rows.length
    const notArrived = rows.filter(r => r.status === 'NOT_ARRIVED' || r.status === 'NO_SHOW').length
    const checkedIn = rows.filter(r => r.status === 'CHECKED_IN').length
    const walkIns = rows.filter(r => r.status === 'WALK_IN').length
    return { all, notArrived, checkedIn, walkIns }
  }, [rows])

  // ─── Selection Helpers (Fix 5) ────────────────────────────────────

  const selectedRows = useMemo(() => sortedRows.filter(r => selectedIds.has(r.id)), [sortedRows, selectedIds])
  const hasNotArrivedSelected = selectedRows.some(r => r.status === 'NOT_ARRIVED')
  const hasCheckedInSelected = selectedRows.some(r => r.status === 'CHECKED_IN')

  // ─── Actions ────────────────────────────────────────────────────

  function handleSort(col: SortColumn) {
    if (sortColumn === col) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(col)
      setSortDirection(col === 'name' ? 'asc' : 'desc')
    }
  }

  // Fix 6: Clear selection when switching filter tabs
  function handleFilterChange(filter: StatusFilter) {
    setStatusFilter(filter)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === sortedRows.length && sortedRows.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(sortedRows.map(r => r.id)))
    }
  }

  async function handleCheckInRow(row: CheckinRow) {
    if (row.status !== 'NOT_ARRIVED') return
    setCheckingInIds(prev => new Set(prev).add(row.id))
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: row.contact_id || undefined,
          source: 'INVITATION',
        }),
      })
      if (res.ok || res.status === 409) {
        if (res.ok && row.contact_id) {
          setLastCheckedIn({ name: row.full_name, contactId: row.contact_id })
          setTimeout(() => setLastCheckedIn(null), 5000)
        }
        await fetchMetrics()
      } else {
        const data = await res.json()
        setError(data.error || 'Check-in failed')
      }
    } catch {
      setError('Check-in failed')
    } finally {
      setCheckingInIds(prev => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  // Fix 3: Undo check-in
  async function handleUndoCheckIn(row: CheckinRow) {
    if (row.status !== 'CHECKED_IN') return
    setUndoConfirmId(null)
    setUndoingIds(prev => new Set(prev).add(row.id))
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkin_id: row.id }),
      })
      if (res.ok) {
        await fetchMetrics()
      } else {
        const data = await res.json()
        setError(data.error || 'Undo failed')
      }
    } catch {
      setError('Undo check-in failed')
    } finally {
      setUndoingIds(prev => {
        const next = new Set(prev)
        next.delete(row.id)
        return next
      })
    }
  }

  async function handleBulkCheckIn() {
    const toCheckIn = sortedRows.filter(r => selectedIds.has(r.id) && r.status === 'NOT_ARRIVED')
    for (const row of toCheckIn) {
      await handleCheckInRow(row)
    }
    setSelectedIds(new Set())
  }

  // Fix 5: Bulk undo check-in
  async function handleBulkUndoCheckIn() {
    const toUndo = sortedRows.filter(r => selectedIds.has(r.id) && r.status === 'CHECKED_IN')
    for (const row of toUndo) {
      await handleUndoCheckIn(row)
    }
    setSelectedIds(new Set())
  }

  function handleMarkNoShow(rowId: string) {
    setNoShowIds(prev => new Set(prev).add(rowId))
    setActionMenuId(null)
    setMenuPos(null)
  }

  async function handleAssignTeamMember(rowId: string, memberName: string) {
    const row = rows.find(r => r.id === rowId)
    if (!row?.contact_id) return
    setRowAssignDropdown(null)
    setInlineAssignId(null)
    setInlineAssignPos(null)
    setActionMenuId(null)
    setMenuPos(null)
    setSubMenuPos(null)
    try {
      const member = workspaceMembers.find(m => m.user_full_name === memberName)
      if (!member) return
      await fetch(`/api/events/${eventId}/team-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: row.contact_id, assigned_to: member.user_id }),
      })
      await fetchMetrics()
    } catch {
      setError('Failed to assign team member')
    }
  }

  async function handleBulkAssignTeamMember(memberUserId: string) {
    setBulkAssignOpen(false)
    const member = workspaceMembers.find(m => m.user_id === memberUserId)
    if (!member) return
    const selected = sortedRows.filter(r => selectedIds.has(r.id) && r.contact_id)
    for (const row of selected) {
      try {
        await fetch(`/api/events/${eventId}/team-assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: row.contact_id, assigned_to: member.user_id }),
        })
      } catch { /* continue with others */ }
    }
    setSelectedIds(new Set())
    await fetchMetrics()
  }

  async function handleChangeTable(rowId: string, tableNumber: number) {
    const row = rows.find(r => r.id === rowId)
    if (!row?.contact_id) return
    setRowTableDropdown(null)
    setActionMenuId(null)
    setMenuPos(null)
    setSubMenuPos(null)
    try {
      await fetch(`/api/events/${eventId}/seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact_id: row.contact_id, table_number: tableNumber }),
      })
      await fetchMetrics()
    } catch {
      setError('Failed to change table')
    }
  }

  async function handleBulkChangeTable(tableNumber: number) {
    setBulkTableOpen(false)
    const selected = sortedRows.filter(r => selectedIds.has(r.id) && r.contact_id)
    for (const row of selected) {
      try {
        await fetch(`/api/events/${eventId}/seating`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: row.contact_id, table_number: tableNumber }),
        })
      } catch { /* continue */ }
    }
    setSelectedIds(new Set())
    await fetchMetrics()
  }

  // ─── Loading State ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-ui-tertiary text-sm font-medium">Loading check-in dashboard...</div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────

  const seatingEnabled = seatingFormat !== 'STANDING'
  const allSelected = sortedRows.length > 0 && sortedRows.every(r => selectedIds.has(r.id))

  return (
    <div className="space-y-4">
      {/* Error / Success toasts */}
      {error && (
        <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 font-medium">×</button>
        </div>
      )}

      {lastCheckedIn && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{lastCheckedIn.name} checked in</span>
          <button
            onClick={() => {
              setPlusOneMode(true)
              setShowWalkIn(true)
              setLastCheckedIn(null)
            }}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors"
          >
            + Add Plus One
          </button>
          <button
            onClick={() => setLastCheckedIn(null)}
            className="text-emerald-500 hover:text-emerald-800 font-medium"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metrics Bar (Fix 8: stat cards as filter shortcuts) */}
      {metrics && (
        <CheckinMetricsBar
          metrics={metrics}
          onFilter={(f) => handleFilterChange(f as StatusFilter || 'all')}
          activeFilter={statusFilter === 'all' ? '' : statusFilter}
        />
      )}

      {/* Filter tabs + Search (Fix 6: clear selection on tab switch) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 bg-brand-cream rounded-lg p-1">
          {([
            { key: 'all' as const, label: 'All', count: counts.all },
            { key: 'not_arrived' as const, label: 'Not Arrived', count: counts.notArrived },
            { key: 'checked_in' as const, label: 'Checked In', count: counts.checkedIn },
            { key: 'walk_ins' as const, label: 'Walk-ins', count: counts.walkIns },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-colors ${
                statusFilter === tab.key
                  ? 'bg-white text-brand-charcoal shadow-sm'
                  : 'text-ui-tertiary hover:text-brand-charcoal'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ui-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guests..."
            className="w-56 pl-9 pr-3 py-2 bg-white border border-ui-border rounded-lg text-sm text-brand-charcoal placeholder-ui-tertiary focus:outline-none focus:border-brand-terracotta focus:ring-1 focus:ring-brand-terracotta transition-colors"
          />
        </div>
      </div>

      {/* Bulk action bar (Fix 5: context-appropriate actions + empty state + undo) */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-white border border-ui-border shadow-sm rounded-lg px-4 py-3 sticky top-[123px] z-30">
          <span className="text-[13px] font-semibold text-brand-charcoal">
            {selectedIds.size} selected
          </span>

          {/* Check In Selected — show when any NOT_ARRIVED selected */}
          {hasNotArrivedSelected && (
            <button
              onClick={handleBulkCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold rounded-full transition-colors"
            >
              <CheckCircle size={13} />
              Check In Selected
            </button>
          )}

          {/* Undo Check-in — show when any CHECKED_IN selected */}
          {hasCheckedInSelected && (
            <button
              onClick={handleBulkUndoCheckIn}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[13px] font-semibold rounded-full transition-colors"
            >
              <Undo2 size={13} />
              Undo Check-in
            </button>
          )}

          {/* Assign to Team */}
          <div className="relative">
            <button
              onClick={() => setBulkAssignOpen(!bulkAssignOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-ui-border bg-white text-[13px] font-semibold text-brand-charcoal rounded-full hover:bg-brand-cream transition-colors"
            >
              <Users size={13} />
              Assign to Team
              <ChevronDown size={10} />
            </button>
            {bulkAssignOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setBulkAssignOpen(false)} />
                <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                  {workspaceMembers.length === 0 ? (
                    <div className="px-3 py-3 text-[13px] text-ui-tertiary text-center">
                      No team members added yet
                    </div>
                  ) : (
                    workspaceMembers.map(m => (
                      <button
                        key={m.user_id}
                        onClick={() => handleBulkAssignTeamMember(m.user_id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                      >
                        <AvatarInitials name={m.user_full_name || '?'} size={20} />
                        <span className="font-medium">{m.user_full_name}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Change Table (if seating enabled and tables exist) */}
          {seatingEnabled && showTableColumn && tables.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setBulkTableOpen(!bulkTableOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-ui-border bg-white text-[13px] font-semibold text-brand-charcoal rounded-full hover:bg-brand-cream transition-colors"
              >
                Change Table
                <ChevronDown size={10} />
              </button>
              {bulkTableOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setBulkTableOpen(false)} />
                  <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-ui-border rounded-lg shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                    {tables.map(t => (
                      <button
                        key={t.number}
                        onClick={() => handleBulkChangeTable(t.number)}
                        className="w-full text-left px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                      >
                        Table {t.number} ({t.seats} seats)
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-[13px] text-ui-tertiary hover:text-brand-charcoal ml-auto"
          >
            Clear
          </button>
        </div>
      )}

      {/* Unified Table */}
      <div className="bg-white border border-ui-border rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream border-b border-ui-border">
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                {([
                  { key: 'name' as const, label: 'Name' },
                  { key: 'company' as const, label: 'Company' },
                ] as const).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                ))}
                {([
                  { key: 'title' as const, label: 'Title' },
                  { key: 'role' as const, label: 'Role', minWidth: 130 },
                  { key: 'priority' as const, label: 'Priority', minWidth: 90 },
                ] as const).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                    style={'minWidth' in col ? { minWidth: col.minWidth } : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                ))}
                {([
                  { key: 'tags' as const, label: 'Tags' },
                  { key: 'assigned_to' as const, label: 'Assigned To' },
                  { key: 'status' as const, label: 'Status' },
                ] as const).map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {sortColumn === col.key && (
                        <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                ))}
                {showTableColumn && (
                  <th
                    onClick={() => handleSort('table')}
                    className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1">
                      Table
                      {sortColumn === 'table' && (
                        <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                )}
                <th
                  onClick={() => handleSort('time')}
                  className="px-4 py-3 text-left font-semibold text-brand-charcoal cursor-pointer select-none hover:bg-brand-cream/80 transition-colors"
                >
                  <span className="inline-flex items-center gap-1">
                    Time
                    {sortColumn === 'time' && (
                      <span className="text-brand-terracotta text-sm">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
                <th className="w-10 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ui-border">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={showTableColumn ? 12 : 11} className="px-4 py-12 text-center text-sm text-ui-tertiary">
                    {searchQuery ? `No guests found matching "${searchQuery}"` : 'No guests yet'}
                  </td>
                </tr>
              ) : (
                sortedRows.map(row => (
                  <tr
                    key={row.id}
                    className="hover:bg-brand-cream/50 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(row.id)}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded border-gray-300"
                      />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AvatarInitials name={row.full_name} size={24} />
                        <button
                          onClick={() => row.contact_id && setDossierContactId(row.contact_id)}
                          className={`font-medium text-brand-charcoal ${row.contact_id ? 'hover:text-brand-terracotta hover:underline transition-colors' : ''}`}
                          disabled={!row.contact_id}
                        >
                          {row.full_name}
                        </button>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3 text-ui-secondary">{row.company || '—'}</td>

                    {/* Title */}
                    <td className="px-4 py-3 text-ui-secondary">{row.title || '—'}</td>

                    {/* Role */}
                    <td className="px-4 py-3 text-ui-secondary">
                      {row.guest_role ? ROLE_LABELS[row.guest_role] || row.guest_role : '—'}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      {row.guest_priority === 'VIP' ? (
                        <span className="inline-flex px-2 py-0.5 text-[13px] font-semibold rounded border bg-amber-100 text-amber-800 border-amber-300">VIP</span>
                      ) : row.guest_priority ? (
                        <span className="text-ui-secondary">{PRIORITY_LABELS[row.guest_priority] || row.guest_priority}</span>
                      ) : <span className="text-ui-tertiary">—</span>}
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {row.tags.length > 0 && <TagBadge label={row.tags[0]} variant="default" />}
                        {row.tags.length > 1 && <span className="text-[13px] text-ui-tertiary">+{row.tags.length - 1}</span>}
                      </div>
                    </td>

                    {/* Assigned To (Fix 2: inline-clickable) */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (inlineAssignId === row.id) { setInlineAssignId(null); setInlineAssignPos(null); return }
                            const pos = calcDropdownPos(e.currentTarget, 200, 'left', 208)
                            setInlineAssignPos(pos)
                            setInlineAssignId(row.id)
                          }}
                          className="text-ui-secondary hover:text-brand-terracotta hover:underline transition-colors cursor-pointer"
                        >
                          {row.assigned_team_member || '—'}
                        </button>
                        {inlineAssignId === row.id && inlineAssignPos && (
                          <>
                            <div className="fixed inset-0 z-[60]" onClick={() => { setInlineAssignId(null); setInlineAssignPos(null) }} />
                            <div
                              className="fixed w-52 bg-white border border-ui-border rounded-lg shadow-lg z-[61] py-1 max-h-48 overflow-y-auto"
                              style={{ top: inlineAssignPos.top, left: inlineAssignPos.left }}
                            >
                              {workspaceMembers.length === 0 ? (
                                <div className="px-3 py-3 text-[13px] text-ui-tertiary text-center">
                                  No team members added yet
                                </div>
                              ) : (
                                workspaceMembers.map(m => (
                                  <button
                                    key={m.user_id}
                                    onClick={() => handleAssignTeamMember(row.id, m.user_full_name)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                  >
                                    <AvatarInitials name={m.user_full_name || '?'} size={20} />
                                    <span className="font-medium">{m.user_full_name}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status badge (Fix 3: clickable for check-in/undo) */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {row.status === 'NOT_ARRIVED' ? (
                        <button
                          onClick={() => handleCheckInRow(row)}
                          disabled={checkingInIds.has(row.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border border-gray-200 hover:border-emerald-200 transition-colors disabled:opacity-50"
                        >
                          {checkingInIds.has(row.id) ? 'Checking in...' : 'Not Arrived'}
                        </button>
                      ) : row.status === 'CHECKED_IN' ? (
                        <div className="relative">
                          <button
                            onClick={() => setUndoConfirmId(undoConfirmId === row.id ? null : row.id)}
                            disabled={undoingIds.has(row.id)}
                            className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-[#2D6A4F] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {undoingIds.has(row.id) ? 'Undoing...' : 'Checked In'}
                          </button>
                          {undoConfirmId === row.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setUndoConfirmId(null)} />
                              <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-ui-border rounded-lg shadow-lg z-20 p-3">
                                <p className="text-[13px] text-brand-charcoal font-medium mb-2">Undo check-in?</p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleUndoCheckIn(row)}
                                    className="flex-1 px-2.5 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => setUndoConfirmId(null)}
                                    className="flex-1 px-2.5 py-1.5 text-xs font-semibold border border-ui-border text-brand-charcoal rounded-md hover:bg-brand-cream transition-colors"
                                  >
                                    No
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ) : row.status === 'WALK_IN' ? (
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-[#B05C3B] border border-amber-200">
                          Walk-in
                        </span>
                      ) : row.status === 'NO_SHOW' ? (
                        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-600 border border-red-200">
                          No-Show
                        </span>
                      ) : null}
                    </td>

                    {/* Table */}
                    {showTableColumn && (
                      <td className="px-4 py-3 text-ui-secondary">
                        {row.table_assignment ? `Table ${row.table_assignment}` : '—'}
                      </td>
                    )}

                    {/* Time */}
                    <td className="px-4 py-3 text-ui-tertiary whitespace-nowrap">
                      {row.checked_in_at ? formatUSTime(new Date(row.checked_in_at)) : '—'}
                    </td>

                    {/* Three-dot menu — fixed positioning to avoid overflow clip */}
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            if (actionMenuId === row.id) { setActionMenuId(null); setMenuPos(null); return }
                            const pos = calcDropdownPos(e.currentTarget, 160, 'right', 208)
                            setMenuPos(pos)
                            setActionMenuId(row.id)
                            setRowAssignDropdown(null)
                            setRowTableDropdown(null)
                            setSubMenuPos(null)
                          }}
                          className="p-1 rounded hover:bg-brand-cream transition-colors"
                        >
                          <MoreHorizontal size={16} className="text-ui-tertiary" />
                        </button>
                        {actionMenuId === row.id && menuPos && (
                          <>
                            <div className="fixed inset-0 z-[60]" onClick={() => { setActionMenuId(null); setMenuPos(null); setRowAssignDropdown(null); setRowTableDropdown(null); setSubMenuPos(null) }} />
                            <div
                              className="fixed w-52 bg-white border border-ui-border rounded-lg shadow-lg z-[61] py-1"
                              style={{ top: menuPos.top, left: menuPos.left }}
                            >
                              {row.status === 'NOT_ARRIVED' && (
                                <button
                                  onClick={() => handleMarkNoShow(row.id)}
                                  className="w-full text-left px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  Mark as No-Show
                                </button>
                              )}

                              {/* Assign to Team Member */}
                              <button
                                onClick={(e) => {
                                  if (rowAssignDropdown === row.id) { setRowAssignDropdown(null); setSubMenuPos(null); return }
                                  const pos = calcSubMenuPos(e.currentTarget, 200, 208)
                                  setSubMenuPos(pos)
                                  setRowAssignDropdown(row.id)
                                  setRowTableDropdown(null)
                                }}
                                className="w-full text-left px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors flex items-center justify-between"
                              >
                                Assign to Team Member
                                <ChevronDown size={10} className="text-ui-tertiary" />
                              </button>
                              {rowAssignDropdown === row.id && subMenuPos && (
                                <div
                                  className="fixed w-52 bg-white border border-ui-border rounded-lg shadow-lg z-[62] py-1 max-h-48 overflow-y-auto"
                                  style={{ top: subMenuPos.top, left: subMenuPos.left }}
                                >
                                  {workspaceMembers.length === 0 ? (
                                    <div className="px-3 py-3 text-[13px] text-ui-tertiary text-center">
                                      No team members added yet
                                    </div>
                                  ) : (
                                    workspaceMembers.map(m => (
                                      <button
                                        key={m.user_id}
                                        onClick={() => handleAssignTeamMember(row.id, m.user_full_name)}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                      >
                                        <AvatarInitials name={m.user_full_name || '?'} size={20} />
                                        <span className="font-medium">{m.user_full_name}</span>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}

                              {/* Change Table — only show when seating enabled AND tables exist */}
                              {seatingEnabled && tables.length > 0 && (
                                <>
                                  <button
                                    onClick={(e) => {
                                      if (rowTableDropdown === row.id) { setRowTableDropdown(null); setSubMenuPos(null); return }
                                      const pos = calcSubMenuPos(e.currentTarget, 200, 176)
                                      setSubMenuPos(pos)
                                      setRowTableDropdown(row.id)
                                      setRowAssignDropdown(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors flex items-center justify-between"
                                  >
                                    Change Table
                                    <ChevronDown size={10} className="text-ui-tertiary" />
                                  </button>
                                  {rowTableDropdown === row.id && subMenuPos && (
                                    <div
                                      className="fixed w-44 bg-white border border-ui-border rounded-lg shadow-lg z-[62] py-1 max-h-48 overflow-y-auto"
                                      style={{ top: subMenuPos.top, left: subMenuPos.left }}
                                    >
                                      {tables.map(t => (
                                        <button
                                          key={t.number}
                                          onClick={() => handleChangeTable(row.id, t.number)}
                                          className="w-full text-left px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                        >
                                          Table {t.number} ({t.seats} seats)
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </>
                              )}

                              {/* View Profile */}
                              {row.contact_id && (
                                <button
                                  onClick={() => { setDossierContactId(row.contact_id!); setActionMenuId(null); setMenuPos(null) }}
                                  className="w-full text-left px-3 py-2 text-[13px] text-brand-charcoal hover:bg-brand-cream transition-colors"
                                >
                                  View Profile
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Walk-in Modal */}
      {showWalkIn && (
        <WalkInForm
          eventId={eventId}
          onClose={() => { setShowWalkIn(false); setPlusOneMode(false) }}
          onSuccess={(checkin) => {
            setShowWalkIn(false)
            setPlusOneMode(false)
            setLastCheckedIn({ name: checkin.full_name, contactId: checkin.contact_id })
            setTimeout(() => setLastCheckedIn(null), 5000)
            fetchMetrics()
          }}
          tables={tables}
          seatingEnabled={seatingEnabled}
          attachedToGuest={plusOneMode && lastCheckedIn ? { contactId: lastCheckedIn.contactId, name: lastCheckedIn.name } : undefined}
        />
      )}

      {/* Dossier Panel */}
      {dossierContactId && (
        <DossierPanel
          eventId={eventId}
          contactId={dossierContactId}
          onClose={() => setDossierContactId(null)}
        />
      )}

      {/* Door Check-in Link Modal */}
      {showDoorLink && (
        <DoorCheckinLink
          eventId={eventId}
          onClose={() => setShowDoorLink(false)}
        />
      )}
    </div>
  )
})

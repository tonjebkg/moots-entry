'use client';

import { useState, useRef, useEffect } from 'react';
import { Users, Info, GripVertical, Pencil } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';

interface TableAssignment {
  contact_id: string;
  full_name: string;
  company: string | null;
  title: string | null;
  tags: string[] | null;
  relevance_score: number | null;
  seat_assignment: number | null;
  rationale?: string;
  guest_role?: string | null;
  guest_priority?: string | null;
  assigned_team_member?: string | null;
}

interface TableData {
  table_number: number;
  seats: number;
  name?: string;
  assignments: TableAssignment[];
}

interface SeatingChartProps {
  tables: TableData[];
  onRemoveGuest?: (contactId: string, tableNumber: number) => void;
  onGuestClick?: (contactId: string) => void;
  onMoveGuest?: (contactId: string, newTable: number) => void;
  onRenameTable?: (tableNumber: number, name: string) => void;
}

/** Draggable guest card inside a table */
function DraggableGuest({
  guest,
  tableNumber,
  onGuestClick,
  onRemoveGuest,
}: {
  guest: TableAssignment;
  tableNumber: number;
  onGuestClick?: (contactId: string) => void;
  onRemoveGuest?: (contactId: string, tableNumber: number) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `guest-${guest.contact_id}`,
    data: { contactId: guest.contact_id, fromTable: tableNumber },
  });

  const tags = guest.tags || [];
  const hasSponsorTag = tags.some(t => t.toLowerCase().includes('sponsor'));

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-between p-2 bg-brand-cream rounded-md group transition-opacity ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="shrink-0 mr-1.5 cursor-grab active:cursor-grabbing text-ui-tertiary hover:text-brand-charcoal touch-none"
      >
        <GripVertical size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {onGuestClick ? (
            <button
              onClick={() => onGuestClick(guest.contact_id)}
              className="text-sm font-medium text-brand-charcoal truncate hover:text-brand-terracotta hover:underline transition-colors text-left"
            >
              {guest.full_name}
            </button>
          ) : (
            <div className="text-sm font-medium text-brand-charcoal truncate">
              {guest.full_name}
            </div>
          )}
          {guest.guest_priority === 'VIP' && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded">VIP</span>
          )}
          {guest.guest_role === 'TEAM_MEMBER' && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">Team</span>
          )}
          {hasSponsorTag && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold bg-brand-forest/10 text-brand-forest border border-brand-forest/20 rounded">Sponsor</span>
          )}
        </div>
        <div className="text-[13px] text-ui-tertiary truncate">
          {guest.title && guest.company
            ? `${guest.title} · ${guest.company}`
            : guest.company || guest.title || ''
          }
        </div>
        {guest.assigned_team_member && (
          <div className="text-[11px] text-ui-tertiary mt-0.5">Host: {guest.assigned_team_member}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {guest.rationale && (
          <span title={`Suggested: ${guest.rationale}`} className="cursor-help">
            <Info size={12} className="text-ui-tertiary hover:text-brand-terracotta transition-colors" />
          </span>
        )}
        {onRemoveGuest && (
          <button
            onClick={() => onRemoveGuest(guest.contact_id, tableNumber)}
            className="opacity-0 group-hover:opacity-100 text-sm text-red-500 hover:text-red-700 transition-opacity font-bold"
            title="Unassign from table"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/** Inline-editable table label */
function TableLabel({
  tableNumber,
  name,
  onRename,
}: {
  tableNumber: number;
  name?: string;
  onRename?: (tableNumber: number, name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (name || '') && onRename) {
      onRename(tableNumber, trimmed);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(name || ''); setEditing(false); }
        }}
        placeholder="Add label..."
        className="text-xs text-ui-secondary bg-transparent border-b border-brand-terracotta/40 focus:border-brand-terracotta outline-none w-full py-0.5"
      />
    );
  }

  if (!onRename) {
    return name ? <p className="text-xs text-ui-tertiary">{name}</p> : null;
  }

  return (
    <button
      onClick={() => { setDraft(name || ''); setEditing(true); }}
      className="flex items-center gap-1 text-xs text-ui-tertiary hover:text-brand-terracotta transition-colors group/label"
    >
      {name || <span className="italic opacity-60">Add label...</span>}
      <Pencil size={10} className="opacity-0 group-hover/label:opacity-100 transition-opacity" />
    </button>
  );
}

/** Droppable table zone */
function DroppableTable({
  table,
  children,
  onRenameTable,
}: {
  table: TableData;
  children: React.ReactNode;
  onRenameTable?: (tableNumber: number, name: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `table-${table.table_number}`,
    data: { tableNumber: table.table_number },
  });

  const fillRate = table.seats > 0
    ? Math.round((table.assignments.length / table.seats) * 100)
    : 0;
  const fillColor = fillRate >= 100 ? 'text-red-600' : fillRate >= 80 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div
      ref={setNodeRef}
      className={`bg-white border-2 rounded-lg p-4 shadow-sm transition-colors ${
        isOver
          ? 'border-brand-terracotta bg-brand-terracotta/5'
          : 'border-ui-border'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-brand-charcoal">Table {table.table_number}</h3>
        <span className={`text-xs font-semibold ${fillColor}`}>
          {table.assignments.length}/{table.seats} seats
        </span>
      </div>
      <div className="mb-3">
        <TableLabel tableNumber={table.table_number} name={table.name} onRename={onRenameTable} />
      </div>
      <div className="space-y-2 min-h-[40px]">
        {children}
      </div>
    </div>
  );
}

/** Droppable "unassign" zone */
function UnassignDropZone() {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassign-zone',
    data: { tableNumber: 0 },
  });

  return (
    <div
      ref={setNodeRef}
      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
        isOver
          ? 'border-brand-terracotta bg-brand-terracotta/5 text-brand-terracotta'
          : 'border-ui-border text-ui-tertiary'
      }`}
    >
      <p className="text-xs font-medium">Drop here to unassign</p>
    </div>
  );
}

/** Ghost card shown while dragging */
function DragGhost({ guest }: { guest: TableAssignment }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white rounded-md shadow-lg border border-brand-terracotta/40 w-56">
      <GripVertical size={14} className="text-brand-terracotta shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-brand-charcoal truncate">{guest.full_name}</div>
        <div className="text-[13px] text-ui-tertiary truncate">{guest.company || ''}</div>
      </div>
      {guest.guest_priority === 'VIP' && (
        <span className="px-1.5 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-800 rounded shrink-0">VIP</span>
      )}
    </div>
  );
}

export function SeatingChart({ tables, onRemoveGuest, onGuestClick, onMoveGuest, onRenameTable }: SeatingChartProps) {
  const [activeGuest, setActiveGuest] = useState<TableAssignment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  if (tables.length === 0) {
    return (
      <div className="text-center py-12">
        <Users size={32} className="mx-auto mb-3 text-brand-terracotta opacity-60" />
        <p className="text-sm text-ui-secondary max-w-md mx-auto">Set up your seating format and I&apos;ll propose table arrangements optimized for your targeting criteria and guest dynamics.</p>
      </div>
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const { contactId, fromTable } = event.active.data.current as { contactId: string; fromTable: number };
    const table = tables.find(t => t.table_number === fromTable);
    const guest = table?.assignments.find(a => a.contact_id === contactId);
    setActiveGuest(guest || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveGuest(null);

    const { over, active } = event;
    if (!over) return;

    const { contactId, fromTable } = active.data.current as { contactId: string; fromTable: number };
    const { tableNumber: toTable } = over.data.current as { tableNumber: number };

    if (toTable === fromTable) return;

    if (toTable === 0 && onRemoveGuest) {
      onRemoveGuest(contactId, fromTable);
    } else if (toTable > 0 && onMoveGuest) {
      onMoveGuest(contactId, toTable);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tables.map(table => (
            <DroppableTable key={table.table_number} table={table} onRenameTable={onRenameTable}>
              {table.assignments.length === 0 ? (
                <p className="text-xs text-ui-tertiary italic py-2">No guests assigned</p>
              ) : (
                table.assignments.map(guest => (
                  <DraggableGuest
                    key={guest.contact_id}
                    guest={guest}
                    tableNumber={table.table_number}
                    onGuestClick={onGuestClick}
                    onRemoveGuest={onRemoveGuest}
                  />
                ))
              )}
            </DroppableTable>
          ))}
        </div>

        {/* Unassign drop zone */}
        {onRemoveGuest && <UnassignDropZone />}
      </div>

      {/* Drag overlay — rendered outside the normal flow */}
      <DragOverlay dropAnimation={null}>
        {activeGuest ? <DragGhost guest={activeGuest} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

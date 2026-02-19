import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FaHistory, FaSearch, FaTimes, FaSortAmountDown, FaSortAmountUp } from 'react-icons/fa';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type CollisionDetection,
  pointerWithin,
  closestCenter,
} from '@dnd-kit/core';
import { updateWorkItem, createWorkItem, deleteWorkItem, batchUpdatePositions } from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from './TaskForm';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane, WorkItemComment } from '../../types/leadership';

const COLUMNS: { id: WorkItemStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

const BACKLOG_COLUMN: { id: WorkItemStatus; label: string; color: string } = {
  id: 'backlog', label: 'Backlog', color: '#6b7280',
};

const LANE_META: Record<WorkItemLane, { label: string; color: string; icon: string }> = {
  expedited: { label: 'Urgent', color: '#ef4444', icon: 'fas fa-bolt' },
  fixed_date: { label: 'Deadline', color: '#f59e0b', icon: 'fas fa-calendar-day' },
  standard: { label: 'Standard', color: '#3b82f6', icon: 'fas fa-stream' },
  intangible: { label: 'Background', color: '#8b5cf6', icon: 'fas fa-wrench' },
};

const MAX_VISIBLE_AVATARS = 3;
const DONE_PREVIEW_LIMIT = 5;
const DONE_INLINE_MAX = 20;

/** Get effective position for an item (fallback to updatedAt for legacy items) */
function getEffectivePosition(item: LeadershipWorkItem): number {
  return item.position ?? item.updatedAt.getTime();
}

/** Calculate position for an item dropped at newIndex in a sorted list (excluding the dropped item) */
function calcDropPosition(sortedItems: LeadershipWorkItem[], newIndex: number): number {
  const prev = newIndex > 0 ? getEffectivePosition(sortedItems[newIndex - 1]) : null;
  const next = newIndex < sortedItems.length ? getEffectivePosition(sortedItems[newIndex]) : null;
  if (prev != null && next != null) return (prev + next) / 2;
  if (prev != null) return prev + 1000;
  if (next != null) return next - 1000;
  return Date.now();
}

/** Get effective assignee IDs from an item */
function getItemAssigneeIds(item: LeadershipWorkItem): string[] {
  if (item.assigneeIds?.length) return item.assigneeIds;
  if (item.assigneeId) return [item.assigneeId];
  return [];
}

/** Get initials from a name: "John Doe" → "JD", "John" → "J" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.[0] || '?').toUpperCase();
}

/** Format a date as a short relative or absolute string */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Format duration between two dates */
function formatDuration(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

/* ─── Card content (shared by card + drag overlay) ─── */
function CardContent({
  item,
  memberLabels,
  memberAvatars,
  isDone,
}: {
  item: LeadershipWorkItem;
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  isDone?: boolean;
}) {
  const ids = getItemAssigneeIds(item);
  const [showOverflow, setShowOverflow] = useState(false);
  const visibleIds = ids.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = ids.length - MAX_VISIBLE_AVATARS;
  const laneMeta = item.lane && item.lane !== 'standard' ? LANE_META[item.lane] : null;

  return (
    <>
      {/* Priority indicator — only show for non-standard lanes */}
      {laneMeta && (
        <div className="ld-board-card-priority" style={{ color: laneMeta.color }}>
          <i className={laneMeta.icon} style={{ fontSize: '0.6rem' }}></i>
          <span>{laneMeta.label}</span>
        </div>
      )}
      <div className="ld-board-card-title">{item.title}</div>
      {item.description && (
        <div className="ld-board-card-desc">
          {item.description.length > 80 ? item.description.slice(0, 80) + '…' : item.description}
        </div>
      )}
      {ids.length > 0 && (
        <div className="ld-board-card-assignees">
          <div className="ld-board-card-avatar-stack">
            {visibleIds.map((id, i) => (
              memberAvatars[id] ? (
                <img key={id} src={memberAvatars[id]} alt="" className="ld-board-card-avatar" style={{ zIndex: visibleIds.length - i }} title={memberLabels[id] || id} />
              ) : (
                <span key={id} className="ld-board-card-avatar-initial" style={{ zIndex: visibleIds.length - i }} title={memberLabels[id] || id}>
                  {getInitials(memberLabels[id] || '?')}
                </span>
              )
            ))}
            {overflowCount > 0 && (
              <span
                className="ld-board-card-avatar-overflow"
                style={{ zIndex: 0 }}
                onMouseEnter={() => setShowOverflow(true)}
                onMouseLeave={() => setShowOverflow(false)}
                onClick={(e) => { e.stopPropagation(); setShowOverflow((v) => !v); }}
              >
                +{overflowCount}
              </span>
            )}
          </div>
          {ids.length === 1 && (
            <span className="ld-board-card-assignee-name">{memberLabels[ids[0]] || ids[0]}</span>
          )}
          {showOverflow && overflowCount > 0 && (
            <div className="ld-board-card-overflow-tooltip">
              {ids.slice(MAX_VISIBLE_AVATARS).map((id) => (
                <div key={id} className="ld-board-card-overflow-row">
                  {memberAvatars[id] ? (
                    <img src={memberAvatars[id]} alt="" className="ld-board-card-overflow-avatar" />
                  ) : (
                    <span className="ld-board-card-overflow-initial">
                      {getInitials(memberLabels[id] || '?')}
                    </span>
                  )}
                  <span>{memberLabels[id] || id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Done timestamp — inside the card */}
      {isDone && (
        <div className="ld-board-card-timestamp">
          {item.completedAt ? (
            <>
              Done {formatRelativeDate(item.completedAt instanceof Date ? item.completedAt : new Date(item.completedAt))}
              {item.startedAt && item.completedAt && (
                <span className="ld-board-card-duration">
                  {' · '}{formatDuration(
                    item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
                    item.completedAt instanceof Date ? item.completedAt : new Date(item.completedAt)
                  )} in progress
                </span>
              )}
            </>
          ) : (
            <>Done {formatRelativeDate(item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt))}</>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Draggable card ─── */
function DraggableCard({
  item,
  memberLabels,
  memberAvatars,
  isDone,
  onEdit,
}: {
  item: LeadershipWorkItem;
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  isDone?: boolean;
  onEdit: (item: LeadershipWorkItem) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { item, type: 'card' },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ touchAction: 'none' }}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(item)}
    >
      <div className="ld-board-card">
        <CardContent item={item} memberLabels={memberLabels} memberAvatars={memberAvatars} isDone={isDone} />
      </div>
    </div>
  );
}

/* ─── Done history overlay ─── */
function DoneHistoryOverlay({
  items,
  memberIds,
  memberLabels,
  memberAvatars,
  onClose,
  onEditItem,
}: {
  items: LeadershipWorkItem[];
  memberIds: string[];
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  onClose: () => void;
  onEditItem: (item: LeadershipWorkItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [sortNewest, setSortNewest] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Focus search on open
  useEffect(() => { searchRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const filtered = useMemo(() => {
    let result = [...items];
    // Text search (title + description)
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (w) => w.title.toLowerCase().includes(q)
          || (w.description || '').toLowerCase().includes(q)
      );
    }
    // Assignee filter
    if (assigneeFilter) {
      result = result.filter((w) => {
        const ids = getItemAssigneeIds(w);
        return ids.includes(assigneeFilter);
      });
    }
    // Sort
    result.sort((a, b) => {
      const aTime = (a.completedAt ?? a.updatedAt) instanceof Date
        ? (a.completedAt ?? a.updatedAt).getTime() : 0;
      const bTime = (b.completedAt ?? b.updatedAt) instanceof Date
        ? (b.completedAt ?? b.updatedAt).getTime() : 0;
      return sortNewest ? bTime - aTime : aTime - bTime;
    });
    return result;
  }, [items, search, assigneeFilter, sortNewest]);

  // Unique assignees who completed items
  const assigneesInDone = useMemo(() => {
    const idSet = new Set<string>();
    items.forEach((w) => getItemAssigneeIds(w).forEach((id) => idSet.add(id)));
    return Array.from(idSet).filter((id) => memberLabels[id]);
  }, [items, memberLabels]);

  return (
    <div className="ld-history-backdrop" onClick={handleBackdropClick}>
      <div className="ld-history-overlay" ref={overlayRef}>
        {/* Header */}
        <div className="ld-history-header">
          <h3 className="ld-history-title">
            <FaHistory style={{ fontSize: '0.9rem' }} />
            Completed Tasks
            <span className="ld-history-count">{filtered.length} of {items.length}</span>
          </h3>
          <button type="button" className="ld-history-close" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {/* Filters */}
        <div className="ld-history-filters">
          <div className="ld-history-search-wrap">
            <FaSearch className="ld-history-search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="ld-history-search"
              placeholder="Search by title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="ld-history-search-clear" onClick={() => setSearch('')}>
                <FaTimes />
              </button>
            )}
          </div>
          <select
            className="ld-history-filter-select"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All members</option>
            {assigneesInDone.map((id) => (
              <option key={id} value={id}>{memberLabels[id]}</option>
            ))}
          </select>
          <button
            type="button"
            className="ld-history-sort-btn"
            onClick={() => setSortNewest((v) => !v)}
            title={sortNewest ? 'Showing newest first' : 'Showing oldest first'}
          >
            {sortNewest ? <FaSortAmountDown /> : <FaSortAmountUp />}
            {sortNewest ? 'Newest' : 'Oldest'}
          </button>
        </div>

        {/* List */}
        <div className="ld-history-list">
          {filtered.length === 0 && (
            <p className="ld-history-empty">No completed tasks match your search.</p>
          )}
          {filtered.map((item) => {
            const ids = getItemAssigneeIds(item);
            const completedDate = item.completedAt ?? item.updatedAt;
            return (
              <div
                key={item.id}
                className="ld-history-card"
                onClick={() => onEditItem(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEditItem(item)}
              >
                <div className="ld-history-card-main">
                  <div className="ld-history-card-title">{item.title}</div>
                  {item.description && (
                    <div className="ld-history-card-desc">
                      {item.description.length > 120 ? item.description.slice(0, 120) + '…' : item.description}
                    </div>
                  )}
                </div>
                <div className="ld-history-card-meta">
                  {ids.length > 0 && (
                    <div className="ld-history-card-assignees">
                      {ids.slice(0, 2).map((id) =>
                        memberAvatars[id] ? (
                          <img key={id} src={memberAvatars[id]} alt="" className="ld-history-card-avatar" title={memberLabels[id] || id} />
                        ) : (
                          <span key={id} className="ld-history-card-avatar-initial" title={memberLabels[id] || id}>
                            {getInitials(memberLabels[id] || '?')}
                          </span>
                        )
                      )}
                      {ids.length > 2 && <span className="ld-history-card-avatar-more">+{ids.length - 2}</span>}
                    </div>
                  )}
                  <span className="ld-history-card-date">
                    {completedDate instanceof Date
                      ? completedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : ''}
                  </span>
                  {item.startedAt && item.completedAt && (
                    <span className="ld-history-card-duration">
                      {formatDuration(
                        item.startedAt instanceof Date ? item.startedAt : new Date(item.startedAt),
                        item.completedAt instanceof Date ? item.completedAt : new Date(item.completedAt)
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Custom collision detection: prefer slot droppables over column/card droppables ─── */
const slotPrioritizedCollision: CollisionDetection = (args) => {
  // First: check which droppables the pointer is within
  const pointerCollisions = pointerWithin(args);

  // Prefer slot targets: they give precise positioning
  const slotCollisions = pointerCollisions.filter((c) => String(c.id).startsWith('slot-'));
  if (slotCollisions.length > 0) {
    // If multiple slots, pick the one whose vertical center is closest to the pointer
    const pointerY = args.pointerCoordinates?.y ?? 0;
    slotCollisions.sort((a, b) => {
      const aRect = args.droppableRects.get(a.id);
      const bRect = args.droppableRects.get(b.id);
      const aCenterY = aRect ? aRect.top + aRect.height / 2 : 0;
      const bCenterY = bRect ? bRect.top + bRect.height / 2 : 0;
      return Math.abs(aCenterY - pointerY) - Math.abs(bCenterY - pointerY);
    });
    return [slotCollisions[0]];
  }

  // Then: check for column droppables (for empty columns or when pointer is in column but not on a slot)
  const columnCollisions = pointerCollisions.filter((c) => String(c.id).startsWith('column-'));
  if (columnCollisions.length > 0) return [columnCollisions[0]];

  // Fallback: use closestCenter for any remaining droppables
  return closestCenter(args);
};

/* ─── Drop slot between cards — provides a droppable region for precise positioning ─── */
function CardDropSlot({ columnId, index }: { columnId: WorkItemStatus; index: number }) {
  const { setNodeRef } = useDroppable({
    id: `slot-${columnId}-${index}`,
    data: { type: 'slot', status: columnId, index },
  });

  return <div ref={setNodeRef} className="ld-board-drop-slot" />;
}

/* ─── Droppable column ─── */
function BoardColumn({
  column,
  items,
  memberLabels,
  memberAvatars,
  onEditItem,
  onAddItem,
  onOpenHistory,
  dropPreviewIndex,
  dropPreviewItem,
  isBacklog,
  isDragging,
  activeItemId,
  isDropTarget,
}: {
  column: (typeof COLUMNS)[0];
  items: LeadershipWorkItem[];
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  onEditItem: (item: LeadershipWorkItem) => void;
  onAddItem: () => void;
  onOpenHistory?: () => void;
  dropPreviewIndex?: number;
  dropPreviewItem?: LeadershipWorkItem | null;
  isBacklog?: boolean;
  isDragging?: boolean;
  activeItemId?: string | null;
  /** Whether this column is the current drop target (driven by parent state, not local isOver) */
  isDropTarget?: boolean;
}) {
  const { setNodeRef } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'column', status: column.id },
  });

  const isDone = column.id === 'done';
  const totalCount = items.length;

  // For Done column: track whether user expanded to see all items inline
  const [doneExpanded, setDoneExpanded] = useState(false);

  // Sort all columns by position ascending (items already sorted from service, but re-sort for safety)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));
  }, [items]);

  // Done column visibility logic
  const visibleItems = useMemo(() => {
    if (!isDone) return sortedItems;
    if (doneExpanded && totalCount <= DONE_INLINE_MAX) return sortedItems;
    return sortedItems.slice(0, DONE_PREVIEW_LIMIT);
  }, [sortedItems, isDone, doneExpanded, totalCount]);

  const hiddenCount = totalCount - visibleItems.length;
  const canExpandInline = isDone && totalCount > DONE_PREVIEW_LIMIT && totalCount <= DONE_INLINE_MAX;
  const needsOverlay = isDone && totalCount > DONE_INLINE_MAX;

  return (
    <div
      ref={setNodeRef}
      className={`ld-board-cell ${isDropTarget ? 'ld-board-cell--over' : ''} ${isDone ? 'ld-board-cell--done' : ''} ${isBacklog ? 'ld-board-cell--backlog' : ''}`}
    >
      <div className="ld-board-col-bar" style={{ background: column.color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 className="ld-board-col-title" style={{ margin: 0 }}>
          {column.label}
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.85rem', marginLeft: '6px' }}>
            ({totalCount})
          </span>
        </h3>
        {isDone && totalCount > DONE_INLINE_MAX && onOpenHistory && (
          <button
            type="button"
            className="ld-board-history-icon-btn"
            onClick={onOpenHistory}
            title="Search completed tasks"
          >
            <FaSearch style={{ fontSize: '0.7rem' }} />
          </button>
        )}
      </div>
      {(column.id === 'todo' || isBacklog) && (
        <button type="button" className="ld-board-add-btn" onClick={onAddItem}>
          + Add task
        </button>
      )}
      {visibleItems.length === 0 && !isDragging && (
        <p className="ld-board-empty-col">No tasks</p>
      )}
      {visibleItems.length === 0 && isDragging && (
        <p className="ld-board-empty-col">Drop here</p>
      )}
      {/* Cards with drop slots between them for precise positioning */}
      {isDragging && <CardDropSlot columnId={column.id} index={0} />}
      {visibleItems.map((item, idx) => {
        const isBeingDragged = item.id === activeItemId;
        // Show ghost preview: suppress when it's right above or below the dragged card (same column no-op)
        const draggedIdx = activeItemId ? visibleItems.findIndex((i) => i.id === activeItemId) : -1;
        const isNoOp = draggedIdx >= 0 && (dropPreviewIndex === draggedIdx || dropPreviewIndex === draggedIdx + 1);
        const showGhost = dropPreviewIndex === idx && !isNoOp && dropPreviewItem;

        return (
          <React.Fragment key={item.id}>
            {showGhost && (
              <div className="ld-board-card ld-board-card--ghost">
                <CardContent item={dropPreviewItem!} memberLabels={memberLabels} memberAvatars={memberAvatars} isDone={isDone} />
              </div>
            )}
            {isBeingDragged ? (
              <div className="ld-board-card ld-board-card--placeholder" />
            ) : (
              <DraggableCard
                item={item}
                memberLabels={memberLabels}
                memberAvatars={memberAvatars}
                isDone={isDone}
                onEdit={onEditItem}
              />
            )}
            {isDragging && <CardDropSlot columnId={column.id} index={idx + 1} />}
          </React.Fragment>
        );
      })}
      {/* Ghost preview at end of list */}
      {(() => {
        const draggedIdx = activeItemId ? visibleItems.findIndex((i) => i.id === activeItemId) : -1;
        const isNoOp = draggedIdx >= 0 && (dropPreviewIndex === draggedIdx || dropPreviewIndex === draggedIdx + 1);
        return dropPreviewIndex != null && dropPreviewIndex >= visibleItems.length && !isNoOp && dropPreviewItem
          ? (
            <div className="ld-board-card ld-board-card--ghost">
              <CardContent item={dropPreviewItem} memberLabels={memberLabels} memberAvatars={memberAvatars} isDone={isDone} />
            </div>
          )
          : null;
      })()}
      {/* Expand inline for ≤20 done items */}
      {canExpandInline && !doneExpanded && (
        <div className="ld-board-history-bar">
          <button
            type="button"
            className="ld-board-history-btn"
            onClick={() => setDoneExpanded(true)}
          >
            <FaHistory style={{ fontSize: '0.75rem' }} />
            Show all ({hiddenCount} more)
          </button>
          {onOpenHistory && (
            <button
              type="button"
              className="ld-board-history-search-btn"
              onClick={onOpenHistory}
              title="Search completed tasks"
            >
              <FaSearch style={{ fontSize: '0.65rem' }} />
            </button>
          )}
        </div>
      )}
      {canExpandInline && doneExpanded && (
        <div className="ld-board-history-bar">
          <button
            type="button"
            className="ld-board-history-btn ld-board-collapse-btn"
            onClick={() => setDoneExpanded(false)}
          >
            Show recent only
          </button>
          {onOpenHistory && (
            <button
              type="button"
              className="ld-board-history-search-btn"
              onClick={onOpenHistory}
              title="Search completed tasks"
            >
              <FaSearch style={{ fontSize: '0.65rem' }} />
            </button>
          )}
        </div>
      )}
      {/* Overlay trigger for >20 done items */}
      {needsOverlay && hiddenCount > 0 && onOpenHistory && (
        <button
          type="button"
          className="ld-board-history-btn"
          onClick={onOpenHistory}
        >
          <FaHistory style={{ fontSize: '0.75rem' }} />
          View all ({hiddenCount} more)
        </button>
      )}
    </div>
  );
}

/* ─── Main board tab ─── */
interface BoardTabViewProps {
  teamId: string;
  workItems: LeadershipWorkItem[];
  memberIds: string[];
  memberLabels: Record<string, string>;
  memberAvatars?: Record<string, string>;
  boardSettings: {
    visibleLanes?: WorkItemLane[];
    columnHeaders?: Partial<Record<WorkItemStatus, string>>;
    showBacklogOnBoard?: boolean;
  } | null;
  boardMissingError: boolean;
  onRefresh: () => void;
  onQuietRefresh?: () => void;
  /** If set, auto-open the edit form for this work item ID (e.g. from notification click) */
  initialEditItemId?: string | null;
  /** Called when the initial edit item has been consumed (so parent can clear the prop) */
  onInitialEditConsumed?: () => void;
}

const BoardTabView: React.FC<BoardTabViewProps> = ({
  teamId,
  workItems,
  memberIds,
  memberLabels,
  memberAvatars = {},
  boardSettings,
  boardMissingError,
  onRefresh,
  onQuietRefresh,
  initialEditItemId,
  onInitialEditConsumed,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dropTargetColumn, setDropTargetColumn] = useState<WorkItemStatus | null>(null);
  const [dropInsertIndex, setDropInsertIndex] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDoneHistory, setShowDoneHistory] = useState(false);

  const [optimisticItems, setOptimisticItems] = useState<LeadershipWorkItem[] | null>(null);
  const displayItems = optimisticItems ?? workItems;

  React.useEffect(() => {
    setOptimisticItems(null);
  }, [workItems]);

  // Auto-open edit form when initialEditItemId is set (e.g. from notification click)
  useEffect(() => {
    if (initialEditItemId && workItems.length > 0) {
      const item = workItems.find((w) => w.id === initialEditItemId);
      if (item) {
        setEditingItem(item);
      }
      onInitialEditConsumed?.();
    }
  }, [initialEditItemId, workItems, onInitialEditConsumed]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const showBacklogOnBoard = boardSettings?.showBacklogOnBoard ?? false;

  const effectiveColumns = useMemo(() => {
    const cols = showBacklogOnBoard
      ? [{ ...BACKLOG_COLUMN, label: boardSettings?.columnHeaders?.backlog?.trim() || BACKLOG_COLUMN.label }, ...COLUMNS]
      : COLUMNS;
    return cols.map((c) => ({
      ...c,
      label: (boardSettings?.columnHeaders?.[c.id]?.trim() || c.label) as string,
    }));
  }, [showBacklogOnBoard, boardSettings]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
    setDropTargetColumn(null);
    setDropInsertIndex(null);
  };

  /** Parse an over target to determine the target column status and insert index */
  const resolveDropTarget = useCallback((overId: string, items: LeadershipWorkItem[], activeItemId: string): {
    targetStatus: WorkItemStatus | null;
    insertIndex: number;
  } => {
    // Slot target: "slot-{status}-{index}"
    if (overId.startsWith('slot-')) {
      const parts = overId.split('-');
      // slot-in_progress-2 → status = "in_progress", index = 2
      const indexStr = parts[parts.length - 1];
      const statusStr = parts.slice(1, -1).join('-') as WorkItemStatus;
      if (effectiveColumns.some((c) => c.id === statusStr)) {
        return { targetStatus: statusStr, insertIndex: parseInt(indexStr, 10) };
      }
    }

    // Column target: "column-{status}"
    if (overId.startsWith('column-')) {
      const statusStr = overId.replace('column-', '') as WorkItemStatus;
      if (effectiveColumns.some((c) => c.id === statusStr)) {
        const colItems = items
          .filter((w) => w.status === statusStr && w.id !== activeItemId)
          .sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));
        return { targetStatus: statusStr, insertIndex: colItems.length };
      }
    }

    // Card target: item ID
    const overItem = items.find((w) => w.id === overId);
    if (overItem && effectiveColumns.some((c) => c.id === overItem.status)) {
      const colItems = items
        .filter((w) => w.status === overItem.status && w.id !== activeItemId)
        .sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));
      const idx = colItems.findIndex((w) => w.id === overId);
      return { targetStatus: overItem.status, insertIndex: idx >= 0 ? idx : colItems.length };
    }

    return { targetStatus: null, insertIndex: 0 };
  }, [effectiveColumns]);

  const handleDragOver = useCallback((e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) {
      setDropTargetColumn(null);
      setDropInsertIndex(null);
      return;
    }

    const activeItemId = active.id as string;
    const overId = over.id as string;
    const item = displayItems.find((w) => w.id === activeItemId);
    if (!item) {
      setDropTargetColumn(null);
      setDropInsertIndex(null);
      return;
    }

    const { targetStatus, insertIndex } = resolveDropTarget(overId, displayItems, activeItemId);
    if (!targetStatus) {
      setDropTargetColumn(null);
      setDropInsertIndex(null);
      return;
    }

    const isSlotTarget = overId.startsWith('slot-');

    // Slot targets are precise — always trust them.
    if (isSlotTarget) {
      setDropTargetColumn(targetStatus);
      setDropInsertIndex(insertIndex);
      return;
    }

    // For non-slot targets (column background, card hover):
    // If we already have a precise slot-based index in this same target column,
    // keep it — don't flicker the ghost to an imprecise card/column position.
    // This applies to BOTH same-column reorder AND cross-column drags.
    if (dropTargetColumn === targetStatus && dropInsertIndex != null) {
      return;
    }

    // First entry into a new target column (no slot hit yet):
    // Show ghost at the resolved position (end of column for column targets,
    // or at the hovered card's index for card targets).
    setDropTargetColumn(targetStatus);
    setDropInsertIndex(insertIndex);
  }, [displayItems, resolveDropTarget, dropTargetColumn, dropInsertIndex]);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    // Use the VISUAL state (dropTargetColumn + dropInsertIndex) directly —
    // this is what the ghost card showed, so the drop must go exactly there.
    const targetStatus = dropTargetColumn;
    const visualIndex = dropInsertIndex;
    setActiveId(null);
    setDropTargetColumn(null);
    setDropInsertIndex(null);

    const { active } = e;
    const activeItemId = active.id as string;
    const items = displayItems;
    const originalItem = items.find((w) => w.id === activeItemId);

    if (!originalItem || !targetStatus || visualIndex == null) {
      setOptimisticItems(null);
      return;
    }

    if (!effectiveColumns.some((c) => c.id === targetStatus)) {
      setOptimisticItems(null);
      return;
    }

    const isCrossColumn = originalItem.status !== targetStatus;

    // Get the sorted items for the target column (excluding the dragged item)
    const targetColumnItems = items
      .filter((w) => w.status === targetStatus && w.id !== activeItemId)
      .sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));

    // Convert visual slot index to the "excluding dragged item" coordinate system.
    // Visual slots are indexed in the full list (including placeholder).
    // For same-column drags, slots after the placeholder are off-by-one because
    // the placeholder occupies a slot but isn't in targetColumnItems.
    let adjustedIndex = visualIndex;
    if (!isCrossColumn) {
      const fullColumnItems = items
        .filter((w) => w.status === targetStatus)
        .sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));
      const draggedVisualIdx = fullColumnItems.findIndex((w) => w.id === activeItemId);
      // Slots after the placeholder need -1 to map to the list without the dragged item
      if (draggedVisualIdx >= 0 && visualIndex > draggedVisualIdx) {
        adjustedIndex = visualIndex - 1;
      }
    }

    // Clamp to valid range
    const newIndex = Math.max(0, Math.min(adjustedIndex, targetColumnItems.length));

    // For same-column: check if the item is actually moving
    if (!isCrossColumn) {
      const fullColumnItems = items
        .filter((w) => w.status === targetStatus)
        .sort((a, b) => getEffectivePosition(a) - getEffectivePosition(b));
      const currentIndex = fullColumnItems.findIndex((w) => w.id === activeItemId);
      // In the "without dragged item" list, the original position is currentIndex
      // (items before it stay, items after shift up by 1).
      // No-op: newIndex === currentIndex means it goes back to same spot.
      if (newIndex === currentIndex) {
        setOptimisticItems(null);
        return;
      }
    }

    // Calculate position value
    const newPosition = calcDropPosition(targetColumnItems, newIndex);

    // Optimistic update
    setOptimisticItems(
      items.map((w) =>
        w.id === activeItemId
          ? { ...w, status: targetStatus!, position: newPosition }
          : w
      )
    );

    try {
      if (isCrossColumn) {
        await updateWorkItem(activeItemId, { status: targetStatus, position: newPosition });
      } else {
        await batchUpdatePositions([{ id: activeItemId, position: newPosition }]);
      }
      if (onQuietRefresh) onQuietRefresh();
    } catch (err) {
      console.error(err);
      setOptimisticItems(null);
    }
  }, [displayItems, onQuietRefresh, effectiveColumns, dropTargetColumn, dropInsertIndex]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDropTargetColumn(null);
    setDropInsertIndex(null);
    setOptimisticItems(null);
  }, []);

  const handleCreateSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    setSaveError(null);
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        teamId,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        assigneeIds: data.assigneeIds,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(created.id, data.title, teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setShowCreateForm(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleEditSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!editingItem) return;
    setSaveError(null);
    try {
      await updateWorkItem(editingItem.id, {
        title: data.title,
        description: data.description,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        assigneeIds: data.assigneeIds,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(editingItem.id, data.title, teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
      setEditingItem(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save task');
    }
  };

  const handleCommentsChanged = async (updatedComments: WorkItemComment[], context?: TaskFormSaveContext) => {
    if (!editingItem) return;
    try {
      await updateWorkItem(editingItem.id, { comments: updatedComments });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(editingItem.id, editingItem.title, teamId, c.id, c.text, c.userId, c.userName || '', c.mentionedUserIds);
          }
        }
      }
    } catch (err) {
      console.error('Failed to save comment:', err);
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteWorkItem(itemId);
      setEditingItem(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      setSaveError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  };

  const itemsForColumn = (status: WorkItemStatus) =>
    displayItems.filter((w) => w.status === status);

  const activeItem = activeId ? displayItems.find((w) => w.id === activeId) : null;
  const dropPreviewItem = activeItem ?? null;
  const backlogCount = displayItems.filter((w) => w.status === 'backlog').length;

  if (boardMissingError) {
    return (
      <div className="ld-board-error">
        <strong>Board not configured</strong>
        <p style={{ margin: '8px 0 0', fontSize: '0.95rem' }}>
          This team doesn't have a board set up yet. Try creating a new team using the "+ Create Team" button, which automatically creates a board.
        </p>
      </div>
    );
  }

  return (
    <>
      {backlogCount > 0 && !showBacklogOnBoard && (
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '12px' }}>
          {backlogCount} task{backlogCount !== 1 ? 's' : ''} in backlog — use the Team tab to move them onto the board.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={slotPrioritizedCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`ld-board-columns ${activeId ? 'ld-board-columns--dragging' : ''}`}>
          {effectiveColumns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              items={itemsForColumn(col.id)}
              memberLabels={memberLabels}
              memberAvatars={memberAvatars}
              onEditItem={setEditingItem}
              onAddItem={() => setShowCreateForm(true)}
              onOpenHistory={col.id === 'done' ? () => setShowDoneHistory(true) : undefined}
              dropPreviewIndex={dropTargetColumn === col.id ? (dropInsertIndex ?? undefined) : undefined}
              dropPreviewItem={dropTargetColumn === col.id ? dropPreviewItem : null}
              isBacklog={col.id === 'backlog'}
              isDragging={!!activeId}
              activeItemId={activeId}
              isDropTarget={dropTargetColumn === col.id}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <div className="ld-drag-overlay">
              <CardContent item={activeItem} memberLabels={memberLabels} memberAvatars={memberAvatars ?? {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {showCreateForm && (
        <>
          {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
          <TaskForm
            mode="create"
            teamId={teamId}
            teamMemberIds={memberIds}
            memberLabels={memberLabels}
            memberAvatars={memberAvatars}
            onSave={handleCreateSave}
            onCancel={() => { setShowCreateForm(false); setSaveError(null); }}
          />
        </>
      )}
      {editingItem && (
        <>
          {saveError && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{saveError}</p>}
          <TaskForm
            mode="edit"
            initialItem={editingItem}
            teamId={teamId}
            teamMemberIds={memberIds}
            memberLabels={memberLabels}
            memberAvatars={memberAvatars}
            onSave={handleEditSave}
            onCommentsChanged={handleCommentsChanged}
            onCancel={() => { setEditingItem(null); setSaveError(null); }}
            onDelete={handleDelete}
          />
        </>
      )}

      {showDoneHistory && (
        <DoneHistoryOverlay
          items={itemsForColumn('done')}
          memberIds={memberIds}
          memberLabels={memberLabels}
          memberAvatars={memberAvatars}
          onClose={() => setShowDoneHistory(false)}
          onEditItem={(item) => { setShowDoneHistory(false); setEditingItem(item); }}
        />
      )}
    </>
  );
};

export default BoardTabView;

import React, { useState, useCallback, useMemo } from 'react';
import { FaHistory } from 'react-icons/fa';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import { updateWorkItem, createWorkItem, deleteWorkItem } from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from './TaskForm';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane } from '../../types/leadership';

const COLUMNS: { id: WorkItemStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
];

const MAX_VISIBLE_AVATARS = 3;

/** Get effective assignee IDs from an item (prefers assigneeIds, falls back to assigneeId). */
function getItemAssigneeIds(item: LeadershipWorkItem): string[] {
  if (item.assigneeIds?.length) return item.assigneeIds;
  if (item.assigneeId) return [item.assigneeId];
  return [];
}

/* ─── Card content (shared by card + drag overlay) ─── */
function CardContent({
  item,
  memberLabels,
  memberAvatars,
}: {
  item: LeadershipWorkItem;
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
}) {
  const ids = getItemAssigneeIds(item);
  const [showOverflow, setShowOverflow] = useState(false);
  const visibleIds = ids.slice(0, MAX_VISIBLE_AVATARS);
  const overflowCount = ids.length - MAX_VISIBLE_AVATARS;

  return (
    <>
      <div className="ld-board-card-title">{item.title}</div>
      {item.description && (
        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px', lineHeight: 1.3 }}>
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
                  {(memberLabels[id] || '?').charAt(0).toUpperCase()}
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
                      {(memberLabels[id] || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{memberLabels[id] || id}</span>
                </div>
              ))}
            </div>
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
  onEdit,
}: {
  item: LeadershipWorkItem;
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  onEdit: (item: LeadershipWorkItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item-${item.id}`,
    data: { item },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onEdit(item); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onEdit(item)}
      style={{ touchAction: 'none' }}
    >
      <div className={`ld-board-card ${isDragging ? 'ld-board-card--dragging' : ''}`}>
        <CardContent item={item} memberLabels={memberLabels} memberAvatars={memberAvatars} />
      </div>
    </div>
  );
}

const DONE_PREVIEW_LIMIT = 5;

/** Format a date as a short relative or absolute string */
function formatCompletedDate(date: Date): string {
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

/* ─── Droppable column ─── */
function BoardColumn({
  column,
  items,
  memberLabels,
  memberAvatars,
  onEditItem,
  onAddItem,
  showHistory,
  onToggleHistory,
}: {
  column: (typeof COLUMNS)[0];
  items: LeadershipWorkItem[];
  memberLabels: Record<string, string>;
  memberAvatars: Record<string, string>;
  onEditItem: (item: LeadershipWorkItem) => void;
  onAddItem: () => void;
  showHistory?: boolean;
  onToggleHistory?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const isDone = column.id === 'done';
  const totalCount = items.length;

  // For the Done column: sort by updatedAt desc, limit to 5 unless history is shown
  const sortedItems = useMemo(() => {
    if (!isDone) return items;
    return [...items].sort((a, b) => {
      const aTime = a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0;
      const bTime = b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0;
      return bTime - aTime;
    });
  }, [items, isDone]);

  const visibleItems = isDone && !showHistory
    ? sortedItems.slice(0, DONE_PREVIEW_LIMIT)
    : sortedItems;
  const hiddenCount = isDone ? totalCount - DONE_PREVIEW_LIMIT : 0;

  return (
    <div
      ref={setNodeRef}
      className={`ld-board-cell ${isOver ? 'ld-board-cell--over' : ''}`}
    >
      <div className="ld-board-col-bar" style={{ background: column.color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 className="ld-board-col-title" style={{ margin: 0 }}>
          {column.label}
          <span style={{ fontWeight: 400, color: '#9ca3af', fontSize: '0.85rem', marginLeft: '6px' }}>
            ({totalCount})
          </span>
        </h3>
      </div>
      {column.id === 'todo' && (
        <button type="button" className="ld-board-add-btn" onClick={onAddItem}>
          + Add task
        </button>
      )}
      {items.length === 0 && (
        <p style={{ color: '#d1d5db', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
          {isOver ? 'Drop here' : 'No tasks'}
        </p>
      )}
      {visibleItems.map((item) => (
        <div key={item.id}>
          <DraggableCard
            item={item}
            memberLabels={memberLabels}
            memberAvatars={memberAvatars}
            onEdit={onEditItem}
          />
          {isDone && showHistory && item.updatedAt && (
            <div className="ld-board-card-timestamp">
              Completed {formatCompletedDate(item.updatedAt instanceof Date ? item.updatedAt : new Date(item.updatedAt))}
            </div>
          )}
        </div>
      ))}
      {isDone && hiddenCount > 0 && (
        <button
          type="button"
          className="ld-board-history-btn"
          onClick={onToggleHistory}
        >
          <FaHistory style={{ fontSize: '0.75rem' }} />
          {showHistory ? 'Show recent only' : `View history (${hiddenCount} more)`}
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
  } | null;
  boardMissingError: boolean;
  onRefresh: () => void;
  onQuietRefresh?: () => void;
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
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDoneHistory, setShowDoneHistory] = useState(false);

  // Local optimistic state for work items (allows instant DnD updates)
  const [optimisticItems, setOptimisticItems] = useState<LeadershipWorkItem[] | null>(null);
  const displayItems = optimisticItems ?? workItems;

  // Clear optimistic state when workItems prop changes (fresh data from parent)
  React.useEffect(() => {
    setOptimisticItems(null);
  }, [workItems]);

  // Multi-sensor: pointer (mouse) + touch + keyboard for reliable DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || typeof active.id !== 'string') return;
    if (!active.id.startsWith('item-')) return;
    const itemId = (active.id as string).replace(/^item-/, '');
    const targetStatus = String(over.id) as WorkItemStatus;

    // Validate it's a real column
    if (!COLUMNS.some((c) => c.id === targetStatus)) return;

    // Find the item and check if status actually changed
    const currentItems = optimisticItems ?? workItems;
    const item = currentItems.find((w) => w.id === itemId);
    if (!item || item.status === targetStatus) return;

    // Optimistic update: immediately move the card to the new column
    setOptimisticItems(
      currentItems.map((w) =>
        w.id === itemId ? { ...w, status: targetStatus } : w
      )
    );

    try {
      await updateWorkItem(itemId, { status: targetStatus });
      // Quietly sync with server (no loading spinner)
      if (onQuietRefresh) {
        onQuietRefresh();
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update on error
      setOptimisticItems(null);
    }
  }, [workItems, optimisticItems, onQuietRefresh]);

  const handleCreateSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    setSaveError(null);
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        teamId,
        status: data.status,
        lane: data.lane,
        type: data.type,
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
        type: data.type,
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

  // Apply custom column headers from settings
  const effectiveColumns = COLUMNS.map((c) => ({
    ...c,
    label: (boardSettings?.columnHeaders?.[c.id]?.trim() || c.label) as string,
  }));

  // Filter items for each column (non-backlog items shown on the board)
  const itemsForColumn = (status: WorkItemStatus) =>
    displayItems.filter((w) => w.status === status);

  const activeItem = activeId ? displayItems.find((w) => `item-${w.id}` === activeId) : null;
  // Count backlog items separately
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
      {/* Backlog count hint */}
      {backlogCount > 0 && (
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '12px' }}>
          {backlogCount} task{backlogCount !== 1 ? 's' : ''} in backlog — use the Team tab to move them onto the board.
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="ld-board-columns" style={{ display: 'flex', gap: '16px' }}>
          {effectiveColumns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              items={itemsForColumn(col.id)}
              memberLabels={memberLabels}
              memberAvatars={memberAvatars}
              onEditItem={setEditingItem}
              onAddItem={() => setShowCreateForm(true)}
              showHistory={col.id === 'done' ? showDoneHistory : undefined}
              onToggleHistory={col.id === 'done' ? () => setShowDoneHistory((v) => !v) : undefined}
            />
          ))}
        </div>

        <DragOverlay>
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
            onCancel={() => { setEditingItem(null); setSaveError(null); }}
            onDelete={handleDelete}
          />
        </>
      )}
    </>
  );
};

export default BoardTabView;

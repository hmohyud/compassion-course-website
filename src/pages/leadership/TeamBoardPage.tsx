import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaUser, FaCog } from 'react-icons/fa';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import Layout from '../../components/Layout';
import { listWorkItems, updateWorkItem, createWorkItem } from '../../services/leadershipWorkItemsService';
import { createMentionNotifications } from '../../services/notificationService';
import { getTeam } from '../../services/leadershipTeamsService';
import { getBoardByTeamId, createBoardForTeam } from '../../services/leadershipBoardsService';
import { getTeamBoardSettings } from '../../services/teamBoardSettingsService';
import { getUserProfile } from '../../services/userProfileService';
import TaskForm, { type TaskFormPayload, type TaskFormSaveContext } from '../../components/leadership/TaskForm';
import type { LeadershipWorkItem, WorkItemStatus, WorkItemLane } from '../../types/leadership';

const COLUMNS: { id: WorkItemStatus; label: string; barColor: string }[] = [
  { id: 'backlog', label: 'Backlog', barColor: '#8b5cf6' },
  { id: 'todo', label: 'Planned work', barColor: '#f59e0b' },
  { id: 'in_progress', label: 'In Progress', barColor: '#22c55e' },
  { id: 'done', label: 'Done', barColor: '#4b5563' },
];

const LANES: { id: WorkItemLane; label: string }[] = [
  { id: 'expedited', label: 'Expedited' },
  { id: 'fixed_date', label: 'Fixed Date' },
  { id: 'standard', label: 'Standard' },
  { id: 'intangible', label: 'Intangible' },
];

function CardContent({
  item,
  assigneeName,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase' }}>TASK</span>
      </div>
      <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>{item.title}</div>
      {item.blocked && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-12deg)',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#dc2626',
            pointerEvents: 'none',
            textShadow: '0 0 2px #fff',
          }}
        >
          BLOCKED
        </div>
      )}
      {assigneeName && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#6b7280', marginTop: '8px' }}>
          <FaUser style={{ flexShrink: 0, fontSize: '0.75rem' }} />
          <span>{assigneeName}</span>
        </div>
      )}
    </>
  );
}

function WorkItemCard({
  item,
  assigneeName,
  isDragging,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
  isDragging?: boolean;
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '8px',
        fontSize: '0.9rem',
        color: '#111827',
        position: 'relative' as const,
        opacity: isDragging ? 0.6 : 1,
        cursor: 'grab',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent item={item} assigneeName={assigneeName} />
    </div>
  );
}

const TeamBoardPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const [workItems, setWorkItems] = useState<LeadershipWorkItem[]>([]);
  const [teamName, setTeamName] = useState('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberLabels, setMemberLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDefaultLane, setCreateDefaultLane] = useState<WorkItemLane>('standard');
  const [editingItem, setEditingItem] = useState<LeadershipWorkItem | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [boardSettings, setBoardSettings] = useState<{ visibleLanes?: WorkItemLane[]; columnHeaders?: Partial<Record<WorkItemStatus, string>> } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadBoard = () => {
    if (!teamId) return;
    setLoading(true);
    Promise.all([listWorkItems(teamId), getTeam(teamId), getTeamBoardSettings(teamId)])
      .then(async ([items, team, settings]) => {
        const board = await getBoardByTeamId(teamId);
        if (!board) {
          try {
            await createBoardForTeam(teamId);
          } catch (err) {
            console.warn('Lazy create board failed:', err);
          }
        }
        setWorkItems(items);
        setTeamName(team?.name ?? '');
        setMemberIds(team?.memberIds ?? []);
        setBoardSettings({
          visibleLanes: settings.visibleLanes,
          columnHeaders: settings.columnHeaders,
        });
        if (team?.memberIds?.length) {
          Promise.all(
            team.memberIds.map((uid) =>
              getUserProfile(uid).then((p) => [uid, p?.name || p?.email || uid] as const)
            )
          ).then((pairs) => setMemberLabels(Object.fromEntries(pairs)));
        } else {
          setMemberLabels({});
        }
      })
      .catch(() => {
        setWorkItems([]);
        setTeamName('');
        setMemberIds([]);
        setMemberLabels({});
        setBoardSettings(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBoard();
  }, [teamId]);

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || typeof active.id !== 'string') return;
    const overStr = String(over.id);
    if (!active.id.startsWith('item-')) return;
    const itemId = (active.id as string).replace(/^item-/, '');
    const match = overStr.match(/^(.+)-(backlog|todo|in_progress|done)$/);
    if (match) {
      const [, laneId, statusId] = match;
      const status = statusId as WorkItemStatus;
      const lane = LANES.some((l) => l.id === laneId) ? (laneId as WorkItemLane) : undefined;
      try {
        await updateWorkItem(itemId, { status, ...(lane ? { lane } : {}) });
        setWorkItems((prev) =>
          prev.map((w) =>
            w.id === itemId ? { ...w, status, ...(lane ? { lane } : {}) } : w
          )
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!teamId) return;
    try {
      const created = await createWorkItem({
        title: data.title,
        description: data.description,
        teamId,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        blocked: data.blocked,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              created.id,
              data.title,
              teamId,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
          }
        }
      }
      setShowCreateForm(false);
      setCreateDefaultLane('standard');
      await loadBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSave = async (data: TaskFormPayload, context?: TaskFormSaveContext) => {
    if (!editingItem) return;
    try {
      await updateWorkItem(editingItem.id, {
        title: data.title,
        description: data.description,
        status: data.status,
        lane: data.lane,
        estimate: data.estimate,
        blocked: data.blocked,
        assigneeId: data.assigneeId,
        comments: data.comments,
      });
      if (context?.newCommentsWithMentions?.length) {
        for (const c of context.newCommentsWithMentions) {
          if (c.mentionedUserIds?.length) {
            await createMentionNotifications(
              editingItem.id,
              data.title,
              teamId ?? undefined,
              c.id,
              c.text,
              c.userId,
              c.userName || '',
              c.mentionedUserIds
            );
          }
        }
      }
      setEditingItem(null);
      await loadBoard();
    } catch (err) {
      console.error(err);
    }
  };

  const itemsForCell = (laneId: WorkItemLane, status: WorkItemStatus) =>
    workItems.filter(
      (w) => (w.lane ?? 'standard') === laneId && w.status === status
    );

  const visibleLanesList =
    boardSettings?.visibleLanes && boardSettings.visibleLanes.length > 0
      ? LANES.filter((l) => boardSettings.visibleLanes!.includes(l.id))
      : LANES;

  const effectiveColumns = COLUMNS.map((c) => ({
    ...c,
    label: (boardSettings?.columnHeaders?.[c.id]?.trim() || c.label) as string,
  }));

  const getAssigneeName = (assigneeId: string | undefined) =>
    assigneeId ? memberLabels[assigneeId] ?? assigneeId : null;

  const activeItem = activeId ? workItems.find((w) => `item-${w.id}` === activeId) : null;

  if (!teamId) {
    return (
      <Layout>
        <div style={{ padding: '40px 20px' }}>
          <Link to="/portal/leadership" style={{ color: '#002B4D', textDecoration: 'none' }}>← Back</Link>
          <p style={{ color: '#6b7280', marginTop: '16px' }}>Team not found.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <Link
            to="/portal/leadership/teams"
            style={{ color: '#002B4D', textDecoration: 'none', fontSize: '0.95rem' }}
          >
            ← Back to teams
          </Link>
          <h1 style={{ color: '#002B4D', margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
            Team Board: {teamName || '…'}
          </h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to={`/portal/leadership/teams/${teamId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#fff',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FaUser /> Team page
            </Link>
            <Link
              to={`/portal/leadership/teams/${teamId}/board/settings`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                background: '#fff',
                color: '#002B4D',
                border: '2px solid #002B4D',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <FaCog /> Settings
            </Link>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#6b7280' }}>Loading…</p>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {visibleLanesList.map((lane) => (
                <div key={lane.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
                  <div
                    style={{
                      width: '100px',
                      flexShrink: 0,
                      paddingTop: '48px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    {lane.label}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', flex: 1, minWidth: 0 }}>
                    {effectiveColumns.map((col) => (
                      <BoardCell
                        key={`${lane.id}-${col.id}`}
                        laneId={lane.id}
                        column={col}
                        items={itemsForCell(lane.id, col.id)}
                        memberLabels={memberLabels}
                        teamId={teamId}
                        memberIds={memberIds}
                        onAddItem={() => { setCreateDefaultLane(lane.id); setShowCreateForm(true); }}
                        onEditItem={setEditingItem}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {showCreateForm && (
              <TaskForm
                mode="create"
                defaultLane={createDefaultLane}
                teamId={teamId}
                teamMemberIds={memberIds}
                memberLabels={memberLabels}
                initialItem={undefined}
                onSave={handleCreateSave}
                onCancel={() => { setShowCreateForm(false); setCreateDefaultLane('standard'); }}
              />
            )}
            {editingItem && (
              <TaskForm
                mode="edit"
                initialItem={editingItem}
                teamId={teamId}
                teamMemberIds={memberIds}
                memberLabels={memberLabels}
                onSave={handleEditSave}
                onCancel={() => setEditingItem(null)}
              />
            )}

            <DragOverlay>
              {activeItem ? (
                <div
                  style={{
                    background: '#fff',
                    border: '2px solid #22c55e',
                    borderRadius: '8px',
                    padding: '12px',
                    minWidth: '220px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    cursor: 'grabbing',
                  }}
                >
                  <CardContent item={activeItem} assigneeName={getAssigneeName(activeItem.assigneeId)} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </Layout>
  );
};

function DraggableCard({
  item,
  assigneeName,
  onEdit,
}: {
  item: LeadershipWorkItem;
  assigneeName: string | null;
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
    >
      <WorkItemCard item={item} assigneeName={assigneeName} isDragging={isDragging} />
    </div>
  );
}

function BoardCell({
  laneId,
  column,
  items,
  memberLabels,
  teamId,
  memberIds,
  onAddItem,
  onEditItem,
}: {
  laneId: WorkItemLane;
  column: (typeof COLUMNS)[0];
  items: LeadershipWorkItem[];
  memberLabels: Record<string, string>;
  teamId: string;
  memberIds: string[];
  onAddItem: () => void;
  onEditItem: (item: LeadershipWorkItem) => void;
}) {
  const droppableId = `${laneId}-${column.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const isBacklog = column.id === 'backlog';

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? '#f0fdf4' : '#f9fafb',
        borderRadius: '12px',
        padding: '16px',
        minWidth: '260px',
        minHeight: '200px',
        border: isOver ? '2px dashed #22c55e' : '1px solid #e5e7eb',
      }}
    >
      <div style={{ borderTop: `4px solid ${column.barColor}`, marginTop: '-16px', marginLeft: '-16px', marginRight: '-16px', marginBottom: '12px', borderRadius: '12px 12px 0 0' }} />
      <h3 style={{ color: '#002B4D', marginBottom: '12px', fontSize: '1rem', fontWeight: 600 }}>
        {column.label}
      </h3>
      {isBacklog && (
        <button
          type="button"
          onClick={onAddItem}
          style={{
            width: '100%',
            padding: '16px',
            marginBottom: '12px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            background: '#fff',
            color: '#6b7280',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Add Item
        </button>
      )}
      {items.map((item) => (
        <DraggableCard
          key={item.id}
          item={item}
          assigneeName={memberLabels[item.assigneeId!] ?? item.assigneeId ?? null}
          onEdit={onEditItem}
        />
      ))}
    </div>
  );
}

export default TeamBoardPage;
